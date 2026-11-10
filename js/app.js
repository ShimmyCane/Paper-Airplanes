/* Shared page helpers (borrowed from Felix Maze's common.js, kept self-contained so this folder can become its own repo):
   ⚙️ drawer, opt-in error panel, reviews (🚩 flags, faces, results) kept on this device and synced to Supabase
   when signed in with the family account, and printing a list of Letter portrait pages (one- or two-sided).
   Settings come from js/config.js (window.APP_CONFIG). The page works fully without the database. */
(function (root) {
  "use strict";
  const C = root.APP_CONFIG || {};
  const KEY = (C.prefix || "app") + ".reviews";

  // ---------- errors: opt-in panel at the bottom ----------
  const errors = [];
  function logError(msg) {
    errors.push(new Date().toLocaleTimeString() + "  " + msg);
    const box = document.getElementById("errors");
    if (box) box.textContent = errors.join("\n");
    setPill();
  }
  root.addEventListener("error", e => logError(e.message + (e.filename ? " (" + e.filename.split("/").pop() + ":" + e.lineno + ")" : "")));
  root.addEventListener("unhandledrejection", e => logError(String(e.reason)));

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { logError("Could not save on this device: " + e.message); return false; } }
  };
  const param = k => new URLSearchParams(location.search).get(k);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- reviews: flag (open until fixed), rating (faces), result (right / wrong), printed ----------
  const reviews = () => store.get(KEY, []);
  const keyOf = r => r.code + ":" + r.kind + ":" + r.created_at;
  const openFlags = () => reviews().filter(r => r.kind === "flag" && r.status === "open");
  const isFlagged = code => openFlags().some(r => r.code === code);
  function addReview({ code, kind, reason = "", who = "", score = null, note = "", extra = {} }) {
    const now = new Date().toISOString();
    let list = reviews();
    // one open flag per sheet, one rating / result per sheet and child: a new one replaces the old one on this device
    const old = list.find(r => r.code === code && r.kind === kind && (kind === "flag" ? r.status === "open" : (kind === "printed" || kind === "flight") ? false : r.who === who));
    const row = Object.assign({ code, kind, reason, who, score, note, status: kind === "flag" ? "open" : "done", resolution: "", created_at: old ? old.created_at : now, updated_at: now, resolved_at: null, synced: false }, extra);
    if (old) list = list.filter(r => r !== old);
    list.push(row); store.set(KEY, list); syncSoon();
    if (api.onReviews) api.onReviews();
    return row;
  }
  function resolveFlag(code, status, resolution = "") {
    const now = new Date().toISOString();
    store.set(KEY, reviews().map(r => (r.code === code && r.kind === "flag" && r.status === "open" ? Object.assign({}, r, { status, resolution, resolved_at: now, updated_at: now, synced: false }) : r)));
    syncSoon(); if (api.onReviews) api.onReviews();
  }
  const latest = (code, kind, who = "") => reviews().filter(r => r.code === code && r.kind === kind && r.who === who).sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))[0] || null;

  // ---------- the database (optional) ----------
  const sync = { sb: null, session: null, state: "device", message: "This device only." };
  const ok = () => !!(C.url && C.key && C.table);
  const withTimeout = (p, ms = C.timeoutMs || 8000) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("Timed out after " + ms / 1000 + "s")), ms))]);
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = () => rej(new Error("Could not load the database library (offline?)")); document.head.append(s); });
  }
  async function ensureSb() {
    if (sync.sb) return sync.sb;
    if (!ok()) throw new Error("No database settings (js/config.js).");
    if (!root.supabase) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js");
    sync.sb = root.supabase.createClient(C.url, C.key);
    return sync.sb;
  }
  function setState(state, message) { sync.state = state; sync.message = message; setPill(); const el = document.getElementById("syncMsg"); if (el) el.textContent = message; }
  function setPill() {
    const el = document.getElementById("pill"); if (!el) return;
    el.textContent = errors.length ? "⚠️ " + errors.length + (errors.length === 1 ? " problem" : " problems") : sync.state === "ok" ? "☁️ synced" : sync.state === "busy" ? "☁️ …" : "💾 this device";
    el.classList.toggle("mint", !errors.length && sync.state === "ok");
  }
  let timer = 0;
  function syncSoon() { clearTimeout(timer); timer = setTimeout(() => { if (sync.session) syncNow().catch(e => logError("Sync: " + e.message)); }, 600); }

  // Merge this device's reviews with the table, newest change wins; then send what is only here.
  const COLS = ["code", "kind", "reason", "who", "score", "note", "status", "resolution", "created_at", "updated_at", "resolved_at"].concat(C.extraCols || []);
  const pick = r => Object.fromEntries(COLS.map(k => [k, r[k] === undefined ? null : r[k]]));
  async function syncNow() {
    const sb = await ensureSb();
    setState("busy", "Syncing…");
    const { data: remote, error } = await withTimeout(sb.from(C.table).select(COLS.join(",")));
    if (error) { setState("error", "Database: " + error.message); throw new Error(error.message); }
    const merged = new Map(reviews().map(r => [keyOf(r), r]));
    const toSend = [];
    for (const r of remote) {
      const l = merged.get(keyOf(r));
      if (!l || (l.synced && r.updated_at > l.updated_at)) merged.set(keyOf(r), Object.assign(pick(r), { synced: true }));
      else if (!l.synced) toSend.push(l);
    }
    const remoteKeys = new Set(remote.map(keyOf));
    for (const l of merged.values()) if (!l.synced && !remoteKeys.has(keyOf(l))) toSend.push(l);
    for (const l of toSend) {
      const row = pick(l); row.reason = row.reason || ""; row.who = row.who || ""; row.note = row.note || ""; row.resolution = row.resolution || "";
      const { error: e2 } = await withTimeout(sb.from(C.table).upsert(row, { onConflict: "code,kind,created_at" }));
      if (e2) { setState("error", "Database: " + e2.message); throw new Error(e2.message); }
      l.synced = true;
    }
    store.set(KEY, [...merged.values()]);
    setState("ok", "Synced " + new Date().toLocaleTimeString() + ".");
    if (api.onReviews) api.onReviews();
  }
  async function connect() {
    if (!ok()) return;
    try {
      const sb = await ensureSb();
      const { data } = await withTimeout(sb.auth.getSession());
      sync.session = data.session;
      if (data.session) await syncNow(); else setState("device", "Not signed in. Reviews stay on this device.");
    } catch (e) { setState("device", "Database not reachable (" + e.message + "). Reviews stay on this device."); }
  }
  async function signIn(email, password) {
    const sb = await ensureSb();
    const { data, error } = await withTimeout(sb.auth.signInWithPassword({ email, password }));
    if (error) throw new Error(error.message);
    sync.session = data.session; await syncNow();
  }
  async function signOut() { try { if (sync.sb) await sync.sb.auth.signOut(); } catch (e) { logError("Sign out: " + e.message); } sync.session = null; setState("device", "Not signed in. Reviews stay on this device."); }
  async function dbCheck() {
    const out = document.getElementById("dbResult"); if (!out) return;
    out.textContent = "Checking…";
    try {
      const sb = await ensureSb();
      const { count, error } = await withTimeout(sb.from(C.table).select("*", { count: "exact", head: true }));
      if (error) { out.textContent = "❌ " + C.table + ": " + error.message; logError("Database check: " + error.message); }
      else out.textContent = "✅ " + C.table + ": " + count + " rows" + (sync.session ? "" : " visible (sign in to see the family's)");
    } catch (e) { out.textContent = "❌ " + e.message; logError("Database check: " + e.message); }
  }

  // ---------- ⚙️ drawer ----------
  function init(extra = "") {
    const here = location.pathname.split("/").pop() || "index.html";
    const links = C.links || [];
    document.body.insertAdjacentHTML("beforeend", `
      <button class="gear noprint" id="gear" aria-label="Settings">⚙️</button>
      <div class="drawer noprint" id="drawer" hidden>
        <h2>Settings</h2>
        <div id="drawerExtra">${extra}</div>
        <h3>Pages</h3>
        <ul>${links.filter(([h]) => h !== here).map(([h, t]) => `<li><a href="${h}">${t}</a></li>`).join("")}</ul>
        <h3>Database</h3>
        <p><small id="syncMsg">${esc(sync.message)}</small></p>
        <form id="signForm" class="row" hidden>
          <input class="field" id="signEmail" type="email" autocomplete="username" placeholder="Email" style="width:100%">
          <input class="field" id="signPass" type="password" autocomplete="current-password" placeholder="Password" style="width:100%">
          <button class="btn mint" type="submit">Sign in</button>
        </form>
        <div class="row">
          <button class="btn" id="syncBtn" type="button">☁️ Sync</button>
          <button class="btn" id="dbCheck" type="button">Check database</button>
          <button class="btn" id="signOut" type="button" hidden>Sign out</button>
        </div>
        <div id="dbResult"><small></small></div>
        <label><input type="checkbox" id="showErrors"> Show errors</label>
      </div>
      <pre class="errors noprint" id="errors" hidden></pre>`);
    const top = document.querySelector(".top");
    if (top && !document.getElementById("pill")) top.insertAdjacentHTML("beforeend", `<span class="chip noprint" id="pill">💾 this device</span>`);
    const drawer = document.getElementById("drawer"), form = document.getElementById("signForm");
    const refreshForm = () => { form.hidden = !!sync.session || !ok(); document.getElementById("signOut").hidden = !sync.session; };
    document.getElementById("gear").addEventListener("click", () => { drawer.hidden = !drawer.hidden; if (!drawer.hidden) refreshForm(); });
    document.getElementById("showErrors").addEventListener("change", e => { document.getElementById("errors").hidden = !e.target.checked; });
    document.getElementById("errors").textContent = errors.join("\n");
    form.addEventListener("submit", async e => {
      e.preventDefault();
      try { await signIn(document.getElementById("signEmail").value.trim(), document.getElementById("signPass").value); refreshForm(); }
      catch (err) { setState("error", "Could not sign in: " + err.message); logError("Sign in: " + err.message); }
    });
    document.getElementById("syncBtn").addEventListener("click", () => { (sync.session ? syncNow() : connect()).catch(err => logError("Sync: " + err.message)); });
    document.getElementById("dbCheck").addEventListener("click", dbCheck);
    document.getElementById("signOut").addEventListener("click", async () => { await signOut(); refreshForm(); });
    setPill(); connect();
  }

  // ---------- printing: a list of page SVGs, one Letter portrait page each ----------
  // Two-sided: page 1 is the front of sheet 1, page 2 its back, and so on. Portrait pages read upright when the printer
  // flips on the LONG edge (like a book). If it flips on the short edge, the backs are turned upside down for you.
  function printPages(svgs, { duplex = false, flip = "long" } = {}) {
    let area = document.getElementById("printArea");
    if (!area) { area = document.createElement("div"); area.id = "printArea"; area.className = "printOnly"; document.body.append(area); }
    const pages = svgs.slice();
    if (duplex && pages.length % 2) pages.push(null);
    area.innerHTML = pages.map((svg, i) => `<div class="print-sheet${duplex && flip === "short" && i % 2 ? " rot180" : ""}">${svg || blankPage()}</div>`).join("");
    setTimeout(() => root.print(), 50);
  }
  const blankPage = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 1100" width="8.5in" height="11in"><rect width="850" height="1100" fill="#fff"/>
    <text x="425" y="120" text-anchor="middle" font-family="Patrick Hand, cursive" font-size="54">Your page!</text>
    <rect x="80" y="170" width="690" height="850" rx="24" fill="none" stroke="#000" stroke-width="3" stroke-dasharray="14 10"/></svg>`;

  // A JPEG picture of a page, for cards (drawn as it scrolls into view).
  const jpg = new Map(); let io = null;
  function toJpeg(svgText, width = 420) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => { try { const c = document.createElement("canvas"); c.width = width; c.height = Math.round(width * 11 / 8.5); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height); resolve(c.toDataURL("image/jpeg", 0.85)); } catch (e) { reject(e); } };
      img.onerror = () => reject(new Error("Could not draw the page picture"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText.replace(/width="8.5in" height="11in"/, 'width="850" height="1100"'));
    });
  }
  function lazyThumb(img, key, makeSvg, width = 420) {
    const go = () => { if (jpg.has(key)) { img.src = jpg.get(key); return; } try { toJpeg(makeSvg(), width).then(u => { jpg.set(key, u); img.src = u; }).catch(e => logError("picture " + key + ": " + e.message)); } catch (e) { logError("picture " + key + ": " + e.message); } };
    if (!("IntersectionObserver" in root)) { go(); return; }
    if (!io) io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { io.unobserve(en.target); en.target._go(); } }), { rootMargin: "300px" });
    img._go = go; io.observe(img);
  }

  const api = { store, param, esc, logError, reviews, addReview, resolveFlag, openFlags, isFlagged, latest, init, syncNow, printPages, toJpeg, lazyThumb, onReviews: null };
  root.APP = api;
})(window);
