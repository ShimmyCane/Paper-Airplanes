/* Paper Airplanes settings (⚙️), kept on this device:
   instructions (verbose · short · minimal), outside decoration (bold · faint · none), printer flip (long · short edge),
   back alignment (five readings at 0.1 mm → across, down and turn), which planes to show (all as previews, or approved only),
   notes for improvement (saved with the page, the plane and the test code), and the version log at the bottom.
   Also the plane helpers: the test versions a plane was set to (A/B per group), and printing. */
(function (root) {
  "use strict";
  const KEY = "pa.settings", NOTES = "pa.notes", ALOG = "pa.alignLog", PROF = "pa.printers";
  const DEF = { printer: "home", mode: "verbose", deco: "bold", flip: "long", ox: 0, oy: 0, rot: 0, show: "all" };
  // the printer you are using: each keeps its own alignment and printer flip, so you can switch back to it later
  const PRINTERS = [["home", "🏠 Home"], ["office", "🏢 Office"], ["library", "📚 Library"], ["other", "🖨️ Other"]];
  const ALIGN_KEYS = ["ox", "oy", "rot", "flip"];
  const ROWS = ["1. Upper Left", "2. Upper Right", "3. Lower Left", "4. Lower Right", "5. Bottom Middle"];
  const CHANGES = [
    "0.6.1 · Fresh scripts on every page (no stale copies after an update)",
    "0.6.0 · Print the steps as shown on the plane page (blue); the planes button is red; both sit side by side",
    "0.5.0 · Print instructions on one page or both sides, separately from the alignment test",
    "0.4.0 · Printer settings: Home, Office, Library or Other, each with its own alignment and flip; the alignment test is simpler, with numbered spots and a star",
    "0.3.0 · Back alignment from five readings at 0.1 mm, with the turn (skew) as well as the shift; a log of each save",
    "0.3.0 · Classic Dart test versions: nose (steps 4 and 5), top wing (7), bottom wing (9), with a test code at the bottom of the sheet",
    "0.3.0 · Printing gives only the sheets (no steps or menus), with copies; notes for improvement; this version log",
    "0.2.0 · Round 2: folding engine, seven previews, alignment test, flight notes",
    "0.1.0 · Round 1: schematic and questions"
  ];
  const get = () => Object.assign({}, DEF, root.APP.store.get(KEY, {}));
  const profiles = () => root.APP.store.get(PROF, {});
  const pick = s => Object.fromEntries(ALIGN_KEYS.map(k => [k, s[k]]));
  const set = patch => {
    const next = Object.assign(get(), patch);
    root.APP.store.set(KEY, next);
    if (ALIGN_KEYS.some(k => k in patch) || "printer" in patch) { const pr = profiles(); pr[next.printer] = pick(next); root.APP.store.set(PROF, pr); }
    if (api.onChange) api.onChange(get());
  };
  // switch printer: keep this one's settings, then load the chosen printer's (or the defaults if it is new)
  function setPrinter(name) {
    const cur = get(), pr = profiles();
    pr[cur.printer] = pick(cur); root.APP.store.set(PROF, pr);
    const nx = pr[name] || { ox: 0, oy: 0, rot: 0, flip: "long" };
    set(Object.assign({ printer: name }, nx));
    refresh();
  }
  // update the buttons and readouts from the saved settings
  function refresh() {
    const s = get();
    document.querySelectorAll(".seg").forEach(g => { const v = String(s[g.dataset.set]); g.querySelectorAll("[data-v]").forEach(b => b.classList.toggle("on", b.dataset.v === v)); });
    renderNow();
  }
  const sheetOpts = () => { const s = get(); return { mode: s.mode, deco: s.deco, flip: s.flip, align: { x: s.ox, y: s.oy, rot: s.rot } }; };
  const planes = () => (root.PA_PLANES || []).filter(p => !p.retired && (get().show === "all" || p.approved));
  const find = code => (root.PA_PLANES || []).find(p => p.code === String(code || "").toUpperCase()) || null;
  const seg = (name, opts, cur) => `<div class="row seg" data-set="${name}">${opts.map(([v, t]) => `<button class="tag${v === cur ? " on" : ""}" data-v="${v}" type="button">${t}</button>`).join("")}</div>`;
  const where = { item: "", label: "" };                  // what the page is about, for notes (set by each page)
  const setWhere = w => Object.assign(where, w);
  const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

  // ---------- test versions: the A/B choices for a plane, kept per plane on this device ----------
  const groupCount = p => (p.variants ? p.variants.length : 0);
  const bitsOf = p => { const b = root.APP.store.get("pa.v." + p.code, ""); return b.length === groupCount(p) ? b : "0".repeat(groupCount(p)); };
  const setBits = (p, bits) => root.APP.store.set("pa.v." + p.code, bits);
  const planeFor = p => root.FOLD.withVariant(p, bitsOf(p));

  // ---------- the ⚙️ drawer ----------
  function drawerHtml(extra = "") {
    const s = get();
    const cell = (id, label) => `<input class="field" id="${id}" type="number" step="1" min="-5" max="5" inputmode="numeric" aria-label="${label}">`;
    const rows = ROWS.map((name, i) => `<tr><td>${name}</td><td>${cell(`a${i}xf`, name + ", across, front number")}${cell(`a${i}xb`, name + ", across, back number")}</td><td>${cell(`a${i}yf`, name + ", down, front number")}${cell(`a${i}yb`, name + ", down, back number")}</td><td><small id="d${i}">–</small></td></tr>`).join("");
    return `${extra}
      <h3>My printer</h3>${seg("printer", PRINTERS, s.printer)}
      <p><small>Each printer remembers its own alignment and flip. Pick yours once; next time, tap it to bring back its settings.</small></p>
      <h3>Instructions on the sheet</h3>${seg("mode", [["verbose", "Lots of words"], ["short", "Number + in/out"], ["minimal", "Numbers only"]], s.mode)}
      <h3>Outside decoration</h3>
      <select class="field" id="decoSel" style="width:100%"><option value="bold"${s.deco === "bold" ? " selected" : ""}>Bold pattern</option><option value="faint"${s.deco === "faint" ? " selected" : ""}>Faint (80% see-through)</option><option value="none"${s.deco === "none" ? " selected" : ""}>None</option></select>
      <h3>Printer flips on the…</h3>${seg("flip", [["long", "Long edge"], ["short", "Short edge"]], s.flip)}
      <h3>Back alignment</h3>
      <p><small><b>How to:</b> 1. Print 🧪 (two sides, 100%). 2. Hold it up to a window. 3. At each numbered spot, find the back line that matches a front line. 4. Type the two numbers. 5. Save. Print again: all 0 means it lines up.</small></p>
      <div class="row"><button class="btn" id="testPrint" type="button">🧪 Print alignment test</button></div>
      <h3>Print instructions</h3>
      <div class="row"><button class="btn" id="instrOne" type="button">📄 One page</button><button class="btn" id="instrTwo" type="button">📄📄 Both sides</button></div>
      <table class="aln"><tr><th>Spot</th><th>Across: front · back</th><th>Down: front · back</th><th>mm</th></tr>${rows}</table>
      <div class="row" style="margin-top:8px"><button class="btn mint" id="alignSave" type="button">Save readings</button><button class="btn" id="alignZero" type="button">Reset to 0</button></div>
      <p><small id="alignMsg"></small></p>
      <p><small>Saved now: across <b id="oxNow">${s.ox}</b> mm · down <b id="oyNow">${s.oy}</b> mm · turn <b id="rotNow">${s.rot}</b>°</small></p>
      <details><summary><small>Alignment log</small></summary><ul class="notes" id="alignLog"></ul></details>
      <h3>Planes to show</h3>${seg("show", [["all", "All (previews)"], ["approved", "Approved only"]], s.show)}
      <h3>📝 Notes for improvement</h3>
      <p><small>Saved on this device with the page, the plane, the test code and the version.</small></p>
      <textarea class="field" id="noteText" rows="3" placeholder="What would make this better?" style="width:100%"></textarea>
      <div class="row" style="margin-top:6px"><button class="btn mint" id="noteSave" type="button">Save note</button><button class="btn" id="noteCopy" type="button">Copy notes</button><select class="field" id="noteFilter"><option value="open">Open</option><option value="all">All</option></select></div>
      <ul class="notes" id="noteList"></ul>`;
  }
  // the version log, at the very bottom of ⚙️
  const foot = () => `<h3>Version</h3><p><small><b>Version ${esc(root.APP_CONFIG.version || "")}</b></small></p>
    <ul class="notes">${CHANGES.map(c => `<li><small>${esc(c)}</small></li>`).join("")}</ul>
    <p><small>Settings, notes and the alignment log stay on this device. Flights go to the family database once signed in.</small></p>`;
  const esc = s => root.APP.esc(s);

  function renderNow() {
    const s = get();
    const set1 = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set1("oxNow", s.ox); set1("oyNow", s.oy); set1("rotNow", s.rot);
    const log = document.getElementById("alignLog");
    if (log) {
      const L = root.APP.store.get(ALOG, []).slice().reverse();
      log.innerHTML = L.length ? L.map(e => `<li><small>${new Date(e.at).toLocaleString()} · ${esc(e.text)}</small></li>`).join("") : "<li><small>No saves yet.</small></li>";
    }
    const list = document.getElementById("noteList");
    if (list) {
      const filter = document.getElementById("noteFilter").value;
      const all = root.APP.store.get(NOTES, []);
      const shown = all.filter(n => filter === "all" || n.status === "open").sort((a, b) => (a.at < b.at ? 1 : -1));
      list.innerHTML = shown.length ? shown.map(n => `<li>${n.status === "done" ? "✅" : "📝"} <small>${esc(n.where.label || n.where.page)} · ${new Date(n.at).toLocaleString()} · v${esc(n.version)}</small><br>${esc(n.text)}${n.status === "open" ? ` <button class="btn" data-done="${esc(n.id)}" type="button">Done</button>` : ""}</li>`).join("") : "<li><small>No notes yet.</small></li>";
    }
  }

  // a coinciding pair (front number i, back number j) reads as i − 0.9·j mm
  const pairValue = (fEl, bEl) => {
    const i = parseInt(document.getElementById(fEl).value, 10), j = parseInt(document.getElementById(bEl).value, 10);
    if (isNaN(i) || isNaN(j) || i < -8 || i > 8 || j < -5 || j > 4) return null;
    return root.FOLD.vernier(i, j);
  };
  function showLive() {
    ROWS.forEach((_, k) => {
      const x = pairValue("a" + k + "xf", "a" + k + "xb"), y = pairValue("a" + k + "yf", "a" + k + "yb");
      const el = document.getElementById("d" + k); if (el) el.textContent = x == null || y == null ? "–" : `${x >= 0 ? "+" : ""}${x}, ${y >= 0 ? "+" : ""}${y}`;
    });
  }
  function saveReadings() {
    const msg = document.getElementById("alignMsg"), readings = [];
    for (let i = 0; i < ROWS.length; i++) {
      const x = pairValue("a" + i + "xf", "a" + i + "xb"), y = pairValue("a" + i + "yf", "a" + i + "yb");
      if (x == null || y == null) { msg.textContent = "Type whole numbers in all twenty boxes: front −8 to 8, back −5 to 4 (0 and 0 = aligned). Nothing was saved."; return; }
      readings.push({ x, y });
    }
    const fit = root.FOLD.fitAlign(readings), s = get();
    const next = { ox: r1(s.ox + fit.x), oy: r1(s.oy + fit.y), rot: r2(s.rot + fit.rot) };
    set(next);
    const text = `readings: ${readings.map(r => `${r.x},${r.y}`).join(" · ")} → +${fit.x} across, +${fit.y} down, turn ${fit.rot}° (saved: ${next.ox}, ${next.oy}, ${next.rot}°)`;
    root.APP.store.set(ALOG, root.APP.store.get(ALOG, []).concat([{ at: new Date().toISOString(), text: `${get().printer}: ${text}`, readings, fit, saved: next }]).slice(-30));
    ROWS.forEach((_, i) => ["xf", "xb", "yf", "yb"].forEach(k => { document.getElementById("a" + i + k).value = ""; }));
    showLive();
    msg.textContent = `Saved. Left over after this correction: up to ${fit.residual} mm at one spot. ` +
      (fit.residual > 0.2 ? "That is more than 0.2 mm: check the pair that looks off, then save once more. " : "") +
      "Print the test again: it should read 0 and 0 everywhere.";
    renderNow();
  }

  function wire() {
    document.querySelectorAll(".seg").forEach(g => g.addEventListener("click", e => {
      const b = e.target.closest("[data-v]"); if (!b) return;
      if (g.dataset.set === "printer") { setPrinter(b.dataset.v); return; }      // loads that printer's own settings
      set({ [g.dataset.set]: b.dataset.v });
      g.querySelectorAll("[data-v]").forEach(x => x.classList.toggle("on", x === b));
    }));
    const d = document.getElementById("decoSel"); if (d) d.addEventListener("change", () => set({ deco: d.value }));
    const io = document.getElementById("instrOne"); if (io) io.addEventListener("click", () => { const o = sheetOpts(); root.APP.printPages([root.FOLD.instructions()[0]], { duplex: false, flip: o.flip }); });
    const it = document.getElementById("instrTwo"); if (it) it.addEventListener("click", () => { const o = sheetOpts(); root.APP.printPages(root.FOLD.instructions(), { duplex: true, flip: o.flip }); });
    const tp = document.getElementById("testPrint"); if (tp) tp.addEventListener("click", () => { const o = sheetOpts(); root.APP.printPages(root.FOLD.testSheet({ align: o.align }), { duplex: true, flip: o.flip }); });
    const sv = document.getElementById("alignSave"); if (sv) sv.addEventListener("click", saveReadings);

    document.querySelectorAll(".aln input").forEach(el => el.addEventListener("input", showLive));
    const z = document.getElementById("alignZero"); if (z) z.addEventListener("click", () => {
      set({ ox: 0, oy: 0, rot: 0 });
      root.APP.store.set(ALOG, root.APP.store.get(ALOG, []).concat([{ at: new Date().toISOString(), text: "reset to 0", saved: { ox: 0, oy: 0, rot: 0 } }]).slice(-30));
      document.getElementById("alignMsg").textContent = "Reset to 0. Print the test again to check.";
      renderNow();
    });
    const nf = document.getElementById("noteFilter"); if (nf) nf.addEventListener("change", renderNow);
    const ns = document.getElementById("noteSave"); if (ns) ns.addEventListener("click", () => {
      const box = document.getElementById("noteText"), text = box.value.trim();
      if (!text) return;
      const list = root.APP.store.get(NOTES, []), w = Object.assign({ page: location.pathname.split("/").pop() || "index.html", item: "", label: "" }, where);
      list.push({ id: "n-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7), at: new Date().toISOString(), status: "open", text, where: w, version: root.APP_CONFIG.version || "" });
      root.APP.store.set(NOTES, list); box.value = ""; renderNow();
    });
    const nc = document.getElementById("noteCopy"); if (nc) nc.addEventListener("click", () => {
      const out = JSON.stringify(root.APP.store.get(NOTES, []), null, 2);
      if (navigator.clipboard) navigator.clipboard.writeText(out).catch(() => window.prompt("Copy the notes:", out));
      else window.prompt("Copy the notes:", out);
    });
    const nl = document.getElementById("noteList"); if (nl) nl.addEventListener("click", e => {          // marks a note done; the text stays as written
      const b = e.target.closest("[data-done]"); if (!b) return;
      root.APP.store.set(NOTES, root.APP.store.get(NOTES, []).map(n => (n.id === b.dataset.done ? Object.assign({}, n, { status: "done" }) : n)));
      renderNow();
    });
    renderNow();
  }

  // ---------- printing: a list of planes (their test versions as chosen), copies, two-sided ----------
  function printPlanes(list, copies = 1) {
    const o = sheetOpts(), pages = [];
    list.forEach(p0 => {
      const p = planeFor(p0), pg = root.FOLD.sheet(p, o).pages;
      for (let c = 0; c < copies; c++) pages.push(...pg);
      const tv = p.variantBits !== undefined ? ` · test ${p.variantBits} #${p.variantHash}` : "";
      root.APP.addReview({ code: p.code, kind: "printed", note: copies + (copies === 1 ? " copy" : " copies") + tv });
    });
    root.APP.printPages(pages, { duplex: true, flip: o.flip });
  }
  // ---------- the steps, printed as they show on screen: picture, number and words, four to a row, twelve to a page ----------
  const STEP_CSS = `<style>.stepsheet{width:8.5in;height:11in;box-sizing:border-box;padding:.5in;background:#fff;font-family:Arial,sans-serif;color:#3b3248;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .stepsheet h2{font-size:20px;margin:0 0 10px}
    .stepgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .stepcard{background:#e3f0fc;border:2px solid #5d8fc2;border-radius:12px;padding:6px;font-size:12px;font-weight:600;break-inside:avoid}
    .stepcard svg{width:100%;height:auto;background:#fff;border-radius:6px}
    .stepcard b{display:inline-grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#5d8fc2;color:#fff;margin-right:3px}</style>`;
  function printSteps(p0) {
    const p = planeFor(p0), states = root.FOLD.run(p);
    const esc = s => root.APP.esc(s);
    const cards = p.steps.map((st, k) => `<div class="stepcard">${root.FOLD.picture(states[k], 160, st.line || null)}<br><b>${k + 1}</b>${st.type === "turn" ? "Turn it over." : esc(st.text || "")} <small>${st.type === "valley" ? "(in)" : st.type === "mountain" ? "(out)" : st.type === "crease" ? "(in, then open)" : ""}</small></div>`);
    cards.push(`<div class="stepcard">${root.FOLD.picture(states[states.length - 1], 160)}<br>Done!</div>`);
    const pages = [];
    for (let i = 0; i < cards.length; i += 12) {
      pages.push(`${STEP_CSS}<div class="stepsheet"><h2>Paper Airplanes #${esc(p.code)} · ${esc(p.name)} · steps</h2><div class="stepgrid">${cards.slice(i, i + 12).join("")}</div></div>`);
    }
    root.APP.printPages(pages, { duplex: false });
  }
  const api = { get, set, setPrinter, printSteps, sheetOpts, planes, find, drawerHtml, wire, foot, printPlanes, planeFor, bitsOf, setBits, setWhere, renderNow, onChange: null };
  root.PA = api;
})(window);
