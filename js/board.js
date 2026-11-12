/* Paper Airplanes: the Design board.
   You draw each fold on the paper as it looks at that step: tap two points (they snap to corners and edge middles),
   pick valley, mountain or fold-and-open, all layers or the top flap, and which side moves. The engine (js/fold.js)
   folds it, so the board always shows the paper after the steps so far, and the printed sheet shows where every
   crease lands on the flat paper. Designs are kept on this device; a share link holds the whole design. */
(function (root) {
  "use strict";
  const { FOLD, PA_CODEC: C, APP, PA } = root;
  const DRAFT = "pa.designDraft", MINE = "pa.designs";
  const $ = id => document.getElementById(id);
  const esc = s => APP.esc(s);
  const r1 = n => Math.round(n);

  let d = C.blank(), myId = null;                         // the design being edited, and its id in "My designs"
  const draft = APP.store.get(DRAFT, null);
  if (draft && draft.d && Array.isArray(draft.d.steps)) { d = Object.assign(C.blank(), draft.d); myId = draft.id || null; }
  const opt = { type: "valley", top: false, flip: false, snap: true };
  let A = null, B = null, drag = null, states = [], plane = null;

  const save = () => APP.store.set(DRAFT, { d, id: myId });
  const current = () => states[states.length - 1];

  // ---------- the moving side, the top flap, and what the fold would move ----------
  function preview() {
    if (!A || !B || Math.hypot(B[0] - A[0], B[1] - A[1]) < 10) return null;
    const st = current(), L = Math.hypot(B[0] - A[0], B[1] - A[1]), n = [-(B[1] - A[1]) / L, (B[0] - A[0]) / L];
    let pos = 0, neg = 0;
    st.facets.forEach(fc => { const F = FOLD.folded(fc), P = FOLD.clip(F, A, B, 1), N = FOLD.clip(F, A, B, -1); if (P.length > 2) pos += FOLD.area(P); if (N.length > 2) neg += FOLD.area(N); });
    let sgn = pos <= neg ? 1 : -1;                        // the smaller side moves, unless you choose the other one
    if (opt.flip) sgn = -sgn;
    const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], m = [mid[0] + n[0] * 40 * sgn, mid[1] + n[1] * 40 * sgn];
    let sel = "";
    if (opt.top) {                                        // the top flap: the paper that last moved together, on top on the moving side
      let best = null;
      st.facets.forEach(fc => { const P = FOLD.clip(FOLD.folded(fc), A, B, sgn); if (P.length > 2 && FOLD.area(P) > 0.5 && (!best || fc.z > best.z)) best = fc; });
      if (best) sel = best.tags.filter(Boolean).slice(-1)[0] || "";
    }
    const pieces = [];
    let moved = 0;
    st.facets.forEach(fc => { if (sel && !fc.tags.includes(sel)) return; const P = FOLD.clip(FOLD.folded(fc), A, B, sgn); if (P.length > 2 && FOLD.area(P) > 0.5) { pieces.push(P); moved += FOLD.area(P); } });
    return { m, sel, pieces, moved, crosses: pos > 0.5 && neg > 0.5 };
  }

  // ---------- drawing the board ----------
  const svg = $("board");
  let vb = [0, 0, 850, 1100];
  function snapPoints() {
    const pts = [];
    current().facets.forEach(fc => { const F = FOLD.folded(fc); F.forEach((p, i) => { const q = F[(i + 1) % F.length]; pts.push(p, [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]); }); });
    const seen = new Set();
    return pts.filter(p => { const k = r1(p[0]) + "," + r1(p[1]); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  const unitsPerPx = () => vb[2] / (svg.getBoundingClientRect().width || 1);
  function drawBoard() {
    const st = current(), bb = FOLD.bbox(st), pad = 60;
    vb = [bb.x0 - pad, bb.y0 - pad, bb.x1 - bb.x0 + 2 * pad, bb.y1 - bb.y0 + 2 * pad];
    svg.setAttribute("viewBox", vb.map(r1).join(" "));
    const u = unitsPerPx(), fcs = st.facets.slice().sort((a, b) => a.z - b.z);
    let s = fcs.map(fc => `<path d="M${FOLD.folded(fc).map(p => p.map(r1).join(" ")).join(" L")} Z" fill="${fc.T[0] * fc.T[3] - fc.T[1] * fc.T[2] > 0 ? "#fff" : "#e8e1cf"}" stroke="#3b3248" stroke-width="${(2 * u).toFixed(2)}" stroke-linejoin="round"/>`).join("");
    if (opt.snap) s += snapPoints().map(p => `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${(3 * u).toFixed(1)}" fill="#3b3248" opacity=".35"/>`).join("");
    const pv = preview();
    if (pv) {
      s += pv.pieces.map(P => `<path d="M${P.map(p => p.map(r1).join(" ")).join(" L")} Z" fill="#ff9e8a" opacity=".4"/>`).join("");
      const L = Math.hypot(B[0] - A[0], B[1] - A[1]), e = [(B[0] - A[0]) / L * 4000, (B[1] - A[1]) / L * 4000];
      const dash = opt.type === "mountain" ? `${18 * u} ${7 * u} ${3 * u} ${7 * u}` : `${16 * u} ${10 * u}`;
      s += `<path d="M${r1(A[0] - e[0])} ${r1(A[1] - e[1])} L${r1(A[0] + e[0])} ${r1(A[1] + e[1])}" stroke="#e0604a" stroke-width="${(3 * u).toFixed(2)}" stroke-dasharray="${dash}"/>`;
    }
    [A, B].forEach((p, i) => { if (p) s += `<circle cx="${r1(p[0])}" cy="${r1(p[1])}" r="${(13 * u).toFixed(1)}" fill="${i ? "#cfe8ff" : "#c8f0e0"}" stroke="#3b3248" stroke-width="${(2.5 * u).toFixed(2)}"/>`; });
    svg.innerHTML = s;
    const ok = pv && (opt.type === "crease" ? pv.crosses : pv.moved > 0.5);
    $("addFold").disabled = !ok;
    $("msg").innerHTML = !A ? "" : !B ? "Now tap the second point." : !pv ? "" : !ok ? `<span class="warn">This line doesn't fold any paper. Move a dot, or pick the other side.</span>`
      : (opt.top && !pv.sel ? "Top flap: here the top flap is the whole paper." : "The pink part moves.") + angleNote;
  }

  // ---------- tapping and dragging ----------
  function toModel(ev) { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; const q = pt.matrixTransform(svg.getScreenCTM().inverse()); return [q.x, q.y]; }
  // snap a dot: first to a corner or an edge middle; if none is near and the other dot is down, the line clicks to an
  // exact angle (every 7.5°: 15, 22.5, 30, 45, 60, 90 …), which is how most plane folds are made
  let angleNote = "";
  function snap(p, other) {
    angleNote = "";
    if (!opt.snap) return p;
    const lim = 22 * unitsPerPx();
    let best = null, bd = lim;
    snapPoints().forEach(q => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < bd) { bd = dd; best = q; } });
    if (best) return [best[0], best[1]];
    if (other) {
      const dx = p[0] - other[0], dy = p[1] - other[1], len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx), step = Math.PI / 24;
      const snapped = Math.round(ang / step) * step;
      if (len > 20 && Math.abs(snapped - ang) < 3 * Math.PI / 180) {
        const deg = ((Math.round(snapped * 180 / Math.PI) % 180) + 180) % 180, fromUp = Math.min(Math.abs(90 - deg), 180 - Math.abs(90 - deg));
        angleNote = ` · ${Math.round(fromUp * 10) / 10}° from straight up`;
        return [other[0] + len * Math.cos(snapped), other[1] + len * Math.sin(snapped)];
      }
    }
    return p;
  }
  svg.addEventListener("pointerdown", ev => {
    const p = toModel(ev), near = 24 * unitsPerPx();
    if (A && Math.hypot(A[0] - p[0], A[1] - p[1]) < near) drag = "A";
    else if (B && Math.hypot(B[0] - p[0], B[1] - p[1]) < near) drag = "B";
    else if (!A) { A = snap(p); drag = "A"; }
    else if (!B) { B = snap(p, A); drag = "B"; }
    else { drag = Math.hypot(A[0] - p[0], A[1] - p[1]) < Math.hypot(B[0] - p[0], B[1] - p[1]) ? "A" : "B"; if (drag === "A") A = snap(p, B); else B = snap(p, A); }
    svg.setPointerCapture(ev.pointerId); drawBoard(); ev.preventDefault();
  });
  svg.addEventListener("pointermove", ev => { if (!drag) return; const p = toModel(ev); if (drag === "A") A = snap(p, B); else B = snap(p, A); drawBoard(); });
  const endDrag = () => { drag = null; };
  svg.addEventListener("pointerup", endDrag); svg.addEventListener("pointercancel", endDrag);

  // ---------- adding steps ----------
  function addStep(step) { d.steps.push(step); A = B = null; opt.flip = false; renderAll(); }
  $("addFold").addEventListener("click", () => {
    const pv = preview(); if (!pv) return;
    const txt = opt.type === "crease" ? C.DEFAULT_TEXT.crease : pv.sel ? (opt.type === "mountain" ? "Fold the top flap away, along the line." : "Fold the top flap over, along the line.") : C.DEFAULT_TEXT[opt.type];
    addStep({ t: opt.type, a: A.map(r1), b: B.map(r1), m: pv.m.map(r1), sel: pv.sel, txt });
  });
  $("addTurn").addEventListener("click", () => {
    addStep({ t: "turn" });
    if (turnPartner(d.steps.length - 1) >= 0) $("msg").textContent = "Two turns in a row cancel out. You can remove both in the steps list.";
  });
  $("addNote").addEventListener("click", () => addStep({ t: "open", txt: C.DEFAULT_TEXT.open }));
  $("undo").addEventListener("click", () => { if (d.steps.length) { d.steps.pop(); renderAll(); } });
  $("clearLine").addEventListener("click", () => { A = B = null; drawBoard(); });
  $("typeSeg").addEventListener("click", e => { const b = e.target.closest("[data-type]"); if (!b) return; opt.type = b.dataset.type; $("typeSeg").querySelectorAll("[data-type]").forEach(x => x.classList.toggle("on", x === b)); drawBoard(); });
  const setLayers = top => { opt.top = top; $("layTop").classList.toggle("on", top); $("layAll").classList.toggle("on", !top); drawBoard(); };
  $("layAll").addEventListener("click", () => setLayers(false));
  $("layTop").addEventListener("click", () => setLayers(true));
  $("flipSide").addEventListener("click", () => { opt.flip = !opt.flip; $("flipSide").classList.toggle("on", opt.flip); drawBoard(); });
  $("snap").addEventListener("click", () => { opt.snap = !opt.snap; $("snap").classList.toggle("on", opt.snap); drawBoard(); });

  // ---------- the steps list (words can be edited; they print on the sheet) ----------
  // steps that do not move the paper can go without changing any later fold: notes, fold-and-open, and two turns that
  // cancel out (with only notes between them). Later "top flap" choices point at steps by number, so they are renumbered.
  const turnPartner = k => {
    if (d.steps[k].t !== "turn") return -1;
    for (const dir of [1, -1]) { for (let j = k + dir; j >= 0 && j < d.steps.length; j += dir) { const t = d.steps[j].t; if (t === "turn") return j; if (t !== "open") break; } }
    return -1;
  };
  function removeSteps(list) {
    const gone = new Set(list);
    if ([...gone].some(i => !["turn", "open", "crease"].includes(d.steps[i].t))) return;
    d.steps = d.steps.filter((st, i) => !gone.has(i)).map(st => {
      if (!st.sel) return st;
      const n = +st.sel.slice(1), shift = [...gone].filter(i => i < n - 1).length;
      return Object.assign({}, st, { sel: "s" + (n - shift) });
    });
    A = B = null; renderAll();
  }
  $("steps").addEventListener("click", e => {
    const both = e.target.closest("[data-pair]"), one = e.target.closest("[data-rm]");
    if (both) removeSteps(both.dataset.pair.split(",").map(Number));
    if (one) removeSteps([+one.dataset.rm]);
  });
  function drawSteps() {
    $("nSteps").textContent = d.steps.length ? `· ${d.steps.length}` : "";
    $("steps").innerHTML = d.steps.length ? plane.steps.map((st, k) => {
      const pj = turnPartner(k), tool = pj >= 0 ? `<button class="btn rm" data-pair="${Math.min(k, pj)},${Math.max(k, pj)}" type="button">🗑️ Remove both turns (${Math.min(k, pj) + 1} and ${Math.max(k, pj) + 1}): they cancel out</button>`
        : d.steps[k].t === "open" || d.steps[k].t === "crease" ? `<button class="btn rm" data-rm="${k}" type="button" aria-label="Remove step ${k + 1}">🗑️</button>` : "";
      return `<div class="step">${FOLD.picture(states[k], 78, st.line || null)}<div><b>${k + 1}</b>${st.type === "turn" ? "Turn it over." : `<input data-k="${k}" value="${esc(d.steps[k].txt || "")}" aria-label="Words for step ${k + 1}">`}${tool}</div></div>`;
    }).join("")
      : `<p class="hint">No steps yet. Draw the first fold on the paper.</p>`;
  }
  let sheetTimer = 0;
  const syncWhere = () => PA.setWhere({ item: plane.code, label: plane.name + " (design)", design: C.encode(d) });
  $("steps").addEventListener("input", e => {                // update the words in place, so typing keeps its focus
    const k = e.target.dataset.k; if (k == null) return;
    d.steps[+k].txt = e.target.value; save();
    clearTimeout(sheetTimer); sheetTimer = setTimeout(() => { plane = C.toPlane(d); syncWhere(); drawSheet(); }, 400);
  });

  // ---------- the printed sheet ----------
  const BAD = /misses the top layer|no room for the step number|no room for the note|no clear spot/;   // the same rule as tools/check_planes.js
  function drawSheet() {
    try {
      const r = FOLD.sheet(plane, PA.sheetOpts());
      $("sFront").innerHTML = r.pages[0]; $("sBack").innerHTML = r.pages[1];
      const bad = r.report.filter(m => BAD.test(m));
      $("report").innerHTML = bad.length ? `<span class="warn">To fix: ${bad.map(esc).join(" · ")}</span>` : d.steps.length ? "✅ Every fold lands on the paper." : "";
    } catch (e) { APP.logError("sheet: " + e.message); $("report").innerHTML = `<span class="warn">This sheet could not be drawn (${esc(e.message)}).</span>`; }
  }

  // ---------- name, look and paper ----------
  const pats = Object.keys(FOLD.PATTERNS);
  $("dPat").innerHTML = pats.map(k => `<option value="${k}">${k}</option>`).join("");
  $("dIn").innerHTML = `<option value="none">none</option>` + pats.map(k => `<option value="${k}">${k}</option>`).join("");
  function drawDetails() {
    $("dName").value = d.name || ""; $("dBy").value = d.by || ""; $("dBlurb").value = d.blurb || "";
    $("dPat").value = d.pattern; $("dIn").value = d.inside || "none";
    $("outSeg").querySelectorAll("[data-out]").forEach(b => b.classList.toggle("on", b.dataset.out === d.outside));
    const kind = C.kindOf(d.paper);
    $("paperSeg").querySelectorAll("[data-paper]").forEach(b => b.classList.toggle("on", b.dataset.paper === kind));
    $("customRow").hidden = kind !== "custom" && !$("customRow").dataset.open;
    $("cw").value = d.paper.w / 100; $("ch").value = d.paper.h / 100;
  }
  [["dName", "name"], ["dBy", "by"], ["dBlurb", "blurb"]].forEach(([id, k]) => $(id).addEventListener("input", () => { d[k] = $(id).value; save(); clearTimeout(sheetTimer); sheetTimer = setTimeout(() => { plane = C.toPlane(d); syncWhere(); drawSheet(); }, 400); }));
  $("dPat").addEventListener("change", () => { d.pattern = $("dPat").value; renderAll(); });
  $("dIn").addEventListener("change", () => { d.inside = $("dIn").value; renderAll(); });
  $("outSeg").addEventListener("click", e => { const b = e.target.closest("[data-out]"); if (!b) return; d.outside = b.dataset.out; renderAll(); });
  function setPaper(p) {
    if (d.steps.length && !confirm("A new paper size starts the steps again. OK?")) return;
    d.paper = p; d.steps = []; A = B = null; renderAll();
  }
  $("paperSeg").addEventListener("click", e => {
    const b = e.target.closest("[data-paper]"); if (!b) return;
    if (b.dataset.paper === "custom") { $("customRow").hidden = false; $("customRow").dataset.open = "1"; return; }
    delete $("customRow").dataset.open; setPaper(Object.assign({}, C.PAPERS[b.dataset.paper]));
  });
  $("setCustom").addEventListener("click", () => {
    const w = Math.min(850, Math.max(200, Math.round(parseFloat($("cw").value) * 100) || 600)), h = Math.min(1100, Math.max(200, Math.round(parseFloat($("ch").value) * 100) || 900));
    setPaper({ w, h });
  });

  // ---------- print, save, share ----------
  $("printPlane").addEventListener("click", () => { if (d.steps.length) PA.printPlanes([plane], 1); });
  $("printInstr").addEventListener("click", () => { if (d.steps.length) PA.printSteps(plane); });
  $("share").addEventListener("click", () => {
    const url = C.link(d), out = $("shareOut");
    out.hidden = false; out.value = url; out.select();
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => { $("msg").textContent = "🔗 Link copied."; }).catch(() => {});
  });
  const mine = () => APP.store.get(MINE, []);
  function drawMine() {
    const list = mine();
    $("mine").innerHTML = list.length ? list.slice().reverse().map(e => `<li><b>${esc(e.d.name || "My plane")}</b> <small>${new Date(e.at).toLocaleDateString()} · ${e.d.steps.length} steps</small>
      <button class="btn" data-load="${e.id}" type="button">Open</button><button class="btn" data-del="${e.id}" type="button">🗑️</button></li>`).join("") : `<li><small>Nothing saved yet.</small></li>`;
  }
  $("save").addEventListener("click", () => {
    clearTimeout(sheetTimer); plane = C.toPlane(d); syncWhere(); drawSheet();
    const list = mine(), at = new Date().toISOString();
    if (!myId) myId = "d-" + Date.now().toString(36);
    const i = list.findIndex(e => e.id === myId), entry = { id: myId, at, d: JSON.parse(JSON.stringify(d)) };
    if (i >= 0) list[i] = entry; else list.push(entry);
    APP.store.set(MINE, list); save(); drawMine();
    APP.addReview({ code: plane.code, kind: "flag", reason: "design:" + C.encode(d), note: "Saved design: " + (d.name || "My plane") });
    $("msg").textContent = "💾 Saved on this device. It goes to the family database when you are signed in (⚙️), so Claude can see it.";
  });
  $("mine").addEventListener("click", e => {
    const l = e.target.closest("[data-load]"), x = e.target.closest("[data-del]");
    if (l) { const en = mine().find(m => m.id === l.dataset.load); if (en) { d = Object.assign(C.blank(), JSON.parse(JSON.stringify(en.d))); myId = en.id; A = B = null; renderAll(); } }
    if (x && confirm("Delete this design from this device?")) { APP.store.set(MINE, mine().filter(m => m.id !== x.dataset.del)); if (myId === x.dataset.del) myId = null; drawMine(); }
  });
  $("newDesign").addEventListener("click", () => { if (d.steps.length && !confirm("Start a new design? (Save this one first if you want to keep it.)")) return; d = C.blank(); myId = null; A = B = null; renderAll(); });

  // ---------- everything ----------
  function renderAll() {
    plane = C.toPlane(d);
    try { states = FOLD.run(plane); } catch (e) { APP.logError("fold: " + e.message); d.steps.pop(); plane = C.toPlane(d); states = FOLD.run(plane); }
    save(); drawDetails(); drawBoard(); drawSteps(); drawSheet(); drawMine();
    syncWhere();
    if (viewer) viewer.refresh();
  }
  // ---------- the 3-D view (fold it step by step, turn it, open the wings) ----------
  let viewer = null;
  $("toggle3d").addEventListener("click", () => {
    if (viewer) { viewer.stop(); viewer = null; $("v3d").hidden = true; $("v3d").innerHTML = ""; $("tools").hidden = false; $("toggle3d").classList.remove("on"); $("toggle3d").textContent = "🧊 3D view"; drawBoard(); return; }
    if (!d.steps.length) { $("msg").textContent = "Draw a fold first, then look at it in 3D."; return; }
    $("tools").hidden = true; $("v3d").hidden = false; $("toggle3d").classList.add("on"); $("toggle3d").textContent = "✏️ Back to drawing";
    viewer = root.VIEW3D.mount($("v3d"), () => plane);
  });
  APP.init(PA.drawerHtml(), PA.foot());
  PA.wire();
  PA.onChange = () => drawSheet();
  renderAll();
  root.addEventListener("resize", () => drawBoard());
  // for checks: draw a fold from code, the same as two taps and "Add this fold"
  root.DESIGN = { viewer: () => viewer, get: () => d, plane: () => plane, line: (a, b) => { A = a; B = b; drawBoard(); return preview(); }, set: o => { Object.assign(opt, o); drawBoard(); }, add: () => $("addFold").click(), turn: () => $("addTurn").click(), note: () => $("addNote").click() };
})(window);
