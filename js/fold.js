/* Paper Airplanes: the folding engine and the fold sheet.
   The paper is simulated as flat pieces (facets). Each facet knows where it sits on the flat sheet (paper coordinates,
   1/100 inch, Letter 850 × 1100), how it is moved in the folded model (an affine map: rotation or mirror + shift),
   and how high it lies in the stack. A step folds every chosen facet on one side of a line onto the other side.
   Before each fold, the engine finds where the fold line crosses the TOP visible layer, maps that piece back to the
   flat sheet, and prints it there: on the front if the paper's front is facing up at that moment, on the back
   (mirrored) if the back is. So following the printed lines in order folds the plane.
   Notation (origami standard): valley fold (fold toward you, "in") = dashed; mountain fold (fold away, "out") =
   dash-dot; paper edge = solid; valley arrow has a filled head, mountain arrow a hollow head. */
(function (root) {
  "use strict";
  const W = 850, H = 1100, INSET = 24, MM = 100 / 25.4;
  const f = n => Math.round(n * 10) / 10;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

  // ---------- 2-D geometry: matrices [a, b, c, d, e, f]: x' = a·x + c·y + e, y' = b·x + d·y + f ----------
  const I = [1, 0, 0, 1, 0, 0];
  const mul = (A, B) => [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
  const det = M => M[0] * M[3] - M[1] * M[2];
  function inv(M) { const k = det(M); return [M[3] / k, -M[1] / k, -M[2] / k, M[0] / k, (M[2] * M[5] - M[3] * M[4]) / k, (M[1] * M[4] - M[0] * M[5]) / k]; }
  const ap = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
  function reflect(p, q) {
    const L = Math.hypot(q[0] - p[0], q[1] - p[1]), ux = (q[0] - p[0]) / L, uy = (q[1] - p[1]) / L;
    const a = 2 * ux * ux - 1, b = 2 * ux * uy, d = 2 * uy * uy - 1;
    return [a, b, b, d, p[0] - (a * p[0] + b * p[1]), p[1] - (b * p[0] + d * p[1])];
  }
  const side = (p, q, x) => (q[0] - p[0]) * (x[1] - p[1]) - (q[1] - p[1]) * (x[0] - p[0]);
  function clip(poly, p, q, sign) {                    // keep the part of a convex polygon where sign·side ≥ 0
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const A = poly[i], B = poly[(i + 1) % poly.length], sa = sign * side(p, q, A), sb = sign * side(p, q, B);
      if (sa >= 0) out.push(A);
      if ((sa >= 0) !== (sb >= 0)) { const t = sa / (sa - sb); out.push([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t]); }
    }
    return out;
  }
  const area = P => Math.abs(P.reduce((s, A, i) => { const B = P[(i + 1) % P.length]; return s + A[0] * B[1] - B[0] * A[1]; }, 0)) / 2;
  function inside(P, x) {                               // point in convex polygon (either winding), with a little slack
    let pos = 0, neg = 0;
    for (let i = 0; i < P.length; i++) { const s = side(P[i], P[(i + 1) % P.length], x) / (Math.hypot(P[(i + 1) % P.length][0] - P[i][0], P[(i + 1) % P.length][1] - P[i][1]) || 1); if (s > 0.01) pos++; else if (s < -0.01) neg++; }
    return !(pos && neg);
  }
  // helpers for writing planes: the crease that puts point P onto point Q, the line through A in direction d
  function bisector(P, Q) { const m = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2], d = [-(Q[1] - P[1]), Q[0] - P[0]]; return [[m[0] - d[0] * 4, m[1] - d[1] * 4], [m[0] + d[0] * 4, m[1] + d[1] * 4]]; }
  const through = (A, B) => { const d = [B[0] - A[0], B[1] - A[1]]; return [[A[0] - d[0] * 8, A[1] - d[1] * 8], [A[0] + d[0] * 8, A[1] + d[1] * 8]]; };

  // ---------- the model ----------
  const start = () => ({ facets: [{ poly: [[0, 0], [W, 0], [W, H], [0, H]], T: I.slice(), z: 0, tags: [] }] });
  const folded = fc => fc.poly.map(p => ap(fc.T, p));
  const chosen = (fc, sel) => !sel || (sel.has ? fc.tags.includes(sel.has) : sel.not ? !fc.tags.includes(sel.not) : true);
  function bbox(state) { const pts = state.facets.flatMap(folded); return { x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) }; }
  function top(state, x) { let best = null; for (const fc of state.facets) if (inside(folded(fc), x) && (!best || fc.z > best.z)) best = fc; return best; }

  function apply(state, st) {
    if (st.type === "turn") {
      const cx = st.axis == null ? W / 2 : st.axis, R = [-1, 0, 0, 1, 2 * cx, 0];   // turn over left to right, about the sheet's middle
      return { facets: state.facets.map(fc => ({ poly: fc.poly, T: mul(R, fc.T), z: -fc.z, tags: fc.tags })) };
    }
    if (st.type !== "valley" && st.type !== "mountain") return state;     // crease (fold and unfold), note, open: no change
    const [p, q] = st.line, s = Math.sign(side(p, q, st.move)), R = reflect(p, q);
    const keep = [], moved = [];
    for (const fc of state.facets) {
      if (!chosen(fc, st.select)) { keep.push(fc); continue; }
      const F = folded(fc), Ti = inv(fc.T);
      const mv = clip(F, p, q, s), sty = clip(F, p, q, -s);
      if (sty.length >= 3 && area(sty) > 0.5) keep.push({ poly: sty.map(x => ap(Ti, x)), T: fc.T, z: fc.z, tags: fc.tags });
      if (mv.length >= 3 && area(mv) > 0.5) moved.push({ poly: mv.map(x => ap(Ti, x)), T: mul(R, fc.T), z: fc.z, tags: fc.tags.concat(st.id || "") });
    }
    if (moved.length) {
      const zs = state.facets.map(x => x.z), mz = moved.map(x => x.z), hi = Math.max(...zs), lo = Math.min(...zs), mhi = Math.max(...mz), mlo = Math.min(...mz);
      moved.forEach(m => { m.z = st.type === "valley" ? hi + 1 + (mhi - m.z) : lo - 1 - (m.z - mlo); });
    }
    return { facets: keep.concat(moved) };
  }
  // every state: states[0] = flat sheet, states[i] = after step i
  function run(plane) { const out = [start()]; plane.steps.forEach((st, i) => { if (!st.id) st.id = "s" + (i + 1); out.push(apply(out[out.length - 1], st)); }); return out; }

  // Where a line crosses the top visible layer: pieces [{fc, a, b}] in folded coordinates.
  function visible(state, p, q, sel) {
    const d = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L];
    const ts = new Set();
    for (const fc of state.facets) { const F = folded(fc); for (let i = 0; i < F.length; i++) { const A = F[i], B = F[(i + 1) % F.length]; const den = u[0] * (B[1] - A[1]) - u[1] * (B[0] - A[0]); if (Math.abs(den) < 1e-9) continue; const t = ((A[0] - p[0]) * (B[1] - A[1]) - (A[1] - p[1]) * (B[0] - A[0])) / den; const s2 = ((A[0] - p[0]) * u[1] - (A[1] - p[1]) * u[0]) / den; if (s2 >= -1e-6 && s2 <= 1 + 1e-6) ts.add(Math.round(t * 100) / 100); } }
    const t = [...ts].sort((a, b) => a - b), out = [];
    for (let i = 0; i + 1 < t.length; i++) {
      if (t[i + 1] - t[i] < 1) continue;
      const m = (t[i] + t[i + 1]) / 2, fc = top(state, [p[0] + u[0] * m, p[1] + u[1] * m]);
      if (!fc || !chosen(fc, sel)) continue;
      const a = [p[0] + u[0] * t[i], p[1] + u[1] * t[i]], b = [p[0] + u[0] * t[i + 1], p[1] + u[1] * t[i + 1]];
      const last = out[out.length - 1];
      if (last && last.fc === fc && Math.hypot(last.b[0] - a[0], last.b[1] - a[1]) < 0.5) last.b = b; else out.push({ fc, a, b });
    }
    return out;
  }

  // ---------- printing on the sheet ----------
  const BACK = [-1, 0, 0, 1, W, 0];                    // back page coordinates (the sheet turned over like a book page)
  const sideOf = fc => (det(fc.T) > 0 ? "front" : "back");
  const toPage = fc => (sideOf(fc) === "front" ? inv(fc.T) : mul(BACK, inv(fc.T)));   // folded view → printed page
  const DASH = { valley: "16 10", mountain: "18 7 3 7", crease: "16 10" };
  const mat = M => `matrix(${M.map(v => f(v * 1000) / 1000).join(" ")})`;

  // A label: number, "in"/"out", and (verbose) a sentence, drawn in the folded view so it reads upright at that step.
  function labelBox(st, n, mode) {
    const words = mode === "verbose" ? wrap(st.text || "", 20) : [];
    const tag = st.type === "valley" ? "in" : st.type === "mountain" ? "out" : st.type === "crease" ? "in, then open" : "";
    const showTag = mode !== "minimal" && tag;
    const w = Math.max(48, showTag ? 60 + tag.length * 12 : 48, ...words.map(l => 16 + l.length * 8.6));
    return { w, h: 44 + words.length * 19, words, tag: showTag ? tag : "" };
  }
  function wrap(s, max) { const o = []; let l = ""; for (const w of String(s).split(" ")) { if ((l + " " + w).trim().length > max) { o.push(l.trim()); l = w; } else l += " " + w; } if (l.trim()) o.push(l.trim()); return o; }
  function labelSvg(box, n, x, y) {
    let s = `<rect x="${f(x)}" y="${f(y)}" width="${f(box.w)}" height="${f(box.h)}" rx="10" fill="#fff" stroke="#111" stroke-width="2"/>`;
    s += `<circle cx="${f(x + 23)}" cy="${f(y + 23)}" r="16" fill="#111"/><text x="${f(x + 23)}" y="${f(y + 31)}" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#fff">${n}</text>`;
    if (box.tag) s += `<text x="${f(x + 46)}" y="${f(y + 31)}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#111">${esc(box.tag)}</text>`;
    box.words.forEach((l, i) => { s += `<text x="${f(x + 9)}" y="${f(y + 58 + i * 19)}" font-family="Arial, sans-serif" font-size="16" fill="#111">${esc(l)}</text>`; });
    return s;
  }
  function arrowSvg(type, mid, u, nrm) {                 // a curved arrow crossing the fold, from the moving side
    const A = [mid[0] + nrm[0] * 70, mid[1] + nrm[1] * 70], B = [mid[0] - nrm[0] * 62, mid[1] - nrm[1] * 62], C = [mid[0] + u[0] * 42, mid[1] + u[1] * 42];
    const dx = B[0] - C[0], dy = B[1] - C[1], L = Math.hypot(dx, dy), hx = dx / L, hy = dy / L;
    const h1 = [B[0] - hx * 20 + hy * 10, B[1] - hy * 20 - hx * 10], h2 = [B[0] - hx * 20 - hy * 10, B[1] - hy * 20 + hx * 10];
    const head = `<path d="M${f(B[0])} ${f(B[1])} L${f(h1[0])} ${f(h1[1])} L${f(h2[0])} ${f(h2[1])} Z" fill="${type === "mountain" ? "#fff" : "#111"}" stroke="#111" stroke-width="2.5"/>`;
    return `<path d="M${f(A[0])} ${f(A[1])} Q${f(C[0] + (C[0] - mid[0]) * 0.6)} ${f(C[1] + (C[1] - mid[1]) * 0.6)} ${f(B[0])} ${f(B[1])}" fill="none" stroke="#111" stroke-width="3"/>` + head;
  }
  const turnArrow = (x, y) => `<path d="M${x - 40} ${y} A40 26 0 1 1 ${x + 34} ${y + 14}" fill="none" stroke="#111" stroke-width="3"/><path d="M${x + 34} ${y + 14} l-4 -20 l18 8 Z" fill="#111"/>`;

  // ---------- placing labels: on one top facet, inside the printable area, clear of every fold line and other labels ----------
  function boxOnPage(M, x, y, w, h) { const c = [[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(p => ap(M, p)); return { x0: Math.min(...c.map(p => p[0])), y0: Math.min(...c.map(p => p[1])), x1: Math.max(...c.map(p => p[0])), y1: Math.max(...c.map(p => p[1])) }; }
  const overlap = (A, B, m = 6) => A.x0 < B.x1 + m && B.x0 < A.x1 + m && A.y0 < B.y1 + m && B.y0 < A.y1 + m;
  function segHits(A, B, R, m = 8) {                    // does segment AB pass through rectangle R (grown by m)?
    let t0 = 0, t1 = 1; const dx = B[0] - A[0], dy = B[1] - A[1];
    for (const [pp, q] of [[-dx, A[0] - (R.x0 - m)], [dx, (R.x1 + m) - A[0]], [-dy, A[1] - (R.y0 - m)], [dy, (R.y1 + m) - A[1]]]) {
      if (pp === 0) { if (q < 0) return false; continue; }
      const r = q / pp; if (pp < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    }
    return true;
  }
  function makeFits(used, lines, arrows = { front: [], back: [] }) {
    fits.used = used;
    return fits;
    function fits(state, fc, x, y, w, h) {
      const pts = [[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y + h / 2], [x + w / 2, y], [x + w / 2, y + h]];
      if (!pts.every(p => top(state, p) === fc)) return false;
      const M = toPage(fc), R = boxOnPage(M, x, y, w, h), sd = sideOf(fc);
      if (R.x0 < INSET + 6 || R.x1 > W - INSET - 6 || R.y0 < INSET + 6 || R.y1 > H - INSET - 6) return false;
      if (used[sd].some(U => overlap(U, R)) || arrows[sd].some(U => overlap(U, R, 0))) return false;
      if (lines[sd].some(([A, B]) => segHits(A, B, R))) return false;
      return R;
    }
  }
  function arrowBox(fc, mid, u, nrm) {                  // the page area a step's arrow takes
    const pts = [[mid[0] + nrm[0] * 72, mid[1] + nrm[1] * 72], [mid[0] - nrm[0] * 64, mid[1] - nrm[1] * 64], [mid[0] + u[0] * 64, mid[1] + u[1] * 64], [mid[0] - u[0] * 64, mid[1] - u[1] * 64]].map(p => ap(toPage(fc), p));
    return { side: sideOf(fc), R: { x0: Math.min(...pts.map(p => p[0])), y0: Math.min(...pts.map(p => p[1])), x1: Math.max(...pts.map(p => p[0])), y1: Math.max(...pts.map(p => p[1])) } };
  }
  function place(state, seg, nrm, box, fits, strict = true) {
    const { a, b } = seg;
    for (const off of [90, 140, 200, 270, 60]) for (const sg of [1, -1]) for (const fr of [0.5, 0.35, 0.65, 0.22, 0.78, 0.12, 0.88]) {
      const cx = a[0] + (b[0] - a[0]) * fr + nrm[0] * off * sg, cy = a[1] + (b[1] - a[1]) * fr + nrm[1] * off * sg;
      const fc = top(state, [cx, cy]); if (!fc) continue;
      const R = fits(state, fc, cx - box.w / 2, cy - box.h / 2, box.w, box.h);
      if (!R) continue;
      const mid = [a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr], fcA = top(state, [mid[0] + nrm[0] * 60, mid[1] + nrm[1] * 60]) || fc;
      const AB = arrowBox(fcA, mid, [(b[0] - a[0]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1), (b[1] - a[1]) / (Math.hypot(b[0] - a[0], b[1] - a[1]) || 1)], nrm);
      if (strict && fits.used[AB.side].some(U => overlap(U, AB.R, 2))) continue;
      return { fc, R, x: cx - box.w / 2, y: cy - box.h / 2, mid, fcA, AB };
    }
    return null;
  }
  function placeFree(state, box, fits) {                // anywhere on the top of the model (turn over, notes, the last step)
    const bb = bbox(state);
    for (let gy = 0.05; gy <= 0.95; gy += 0.05) for (let gx = 0.1; gx <= 0.9; gx += 0.1) {
      const cx = bb.x0 + (bb.x1 - bb.x0) * gx, cy = bb.y0 + (bb.y1 - bb.y0) * (0.5 + (gy * 20 % 2 ? 1 : -1) * gy / 2), fc = top(state, [cx, cy]);
      if (!fc) continue;
      const R = fits(state, fc, cx - box.w / 2, cy - box.h / 2, box.w, box.h);
      if (R) return { fc, R, x: cx - box.w / 2, y: cy - box.h / 2 };
    }
    return null;
  }

  // Build both printed pages for a plane. opts: { mode: verbose|short|minimal, deco: bold|faint|none, offset, flip }
  function sheet(plane, opts = {}) {
    const mode = opts.mode || "verbose", deco = opts.deco || "bold";
    const states = run(plane), out = { front: [], back: [] }, report = [];
    const lines = { front: [], back: [] }, used = { front: [], back: [] }, arrows = { front: [], back: [] };
    // pass 1: every fold line, where it is printed
    const info = plane.steps.map((st, i) => {
      if (!(st.type === "valley" || st.type === "mountain" || st.type === "crease")) return null;
      const state = states[i], [p, q] = st.line, segs = visible(state, p, q, st.select);
      if (!segs.length) { report.push(`step ${i + 1}: the fold line misses the top layer`); return null; }
      const d = [q[0] - p[0], q[1] - p[1]], L = Math.hypot(...d), u = [d[0] / L, d[1] / L];
      let nrm = [-u[1], u[0]];
      const mv = st.move || ap(reflect(p, q), [0, 0]);
      if (side(p, q, mv) * side(p, q, [p[0] + nrm[0], p[1] + nrm[1]]) < 0) nrm = [-nrm[0], -nrm[1]];
      segs.forEach(sg => {
        const M = toPage(sg.fc), A = ap(M, sg.a), B = ap(M, sg.b);
        lines[sideOf(sg.fc)].push([A, B]);
        out[sideOf(sg.fc)].push(`<path d="M${f(A[0])} ${f(A[1])} L${f(B[0])} ${f(B[1])}" stroke="#111" stroke-width="${st.type === "crease" ? 3 : 3.6}" stroke-dasharray="${DASH[st.type]}" fill="none"/>`);
      });
      return { segs, u, nrm };
    });
    const fits = makeFits(used, lines, arrows);
    // pass 2: labels and arrows
    plane.steps.forEach((st, i) => {
      const state = states[i], n = i + 1;
      if (info[i]) {
        const { segs, u, nrm } = info[i];
        const bySize = segs.slice().sort((x, y) => Math.hypot(y.b[0] - y.a[0], y.b[1] - y.a[1]) - Math.hypot(x.b[0] - x.a[0], x.b[1] - x.a[1]));
        let at = null, box = null;
        for (const m of mode === "verbose" ? ["verbose", "short", "minimal"] : mode === "short" ? ["short", "minimal"] : ["minimal"]) {
          box = labelBox(st, n, m);
          for (const sg of bySize) { at = place(state, sg, nrm, box, fits); if (at) break; }
          if (!at) for (const sg of bySize) { at = place(state, sg, nrm, box, fits, false); if (at) { report.push(`step ${n}: arrow may touch another label`); break; } }
          if (at) { if (m !== mode) report.push(`step ${n}: ${m} label (no room for more)`); break; }
        }
        if (!at) { report.push(`step ${n}: no room for the step number`); return; }
        used[sideOf(at.fc)].push(at.R); arrows[at.AB.side].push(at.AB.R);
        const fcA = at.fcA;
        const arrow = st.type === "crease" ? arrowSvg("valley", at.mid, u, nrm) + arrowSvg("valley", at.mid, [-u[0], -u[1]], [-nrm[0], -nrm[1]]) : arrowSvg(st.type, at.mid, u, nrm);
        out[sideOf(fcA)].push(`<g transform="${mat(toPage(fcA))}">${arrow}</g>`);
        out[sideOf(at.fc)].push(`<g transform="${mat(toPage(at.fc))}">${labelSvg(box, n, at.x, at.y)}</g>`);
      } else if (st.type === "turn" || st.type === "open") {
        const text = st.type === "turn" ? "Turn it over" : st.text;
        let at = null, box = null;
        const tries = mode === "minimal" && st.type === "turn" ? [0] : mode === "verbose" ? [22, 14, 10, 0] : [14, 10, 0];
        for (const wd of tries) {
          const words = wd ? wrap(text, wd) : [];
          box = { w: Math.max(st.type === "turn" ? 100 : 48, ...words.map(l => 16 + l.length * 8.6)), h: 44 + words.length * 19 + (st.type === "turn" ? 40 : 0), words, tag: "" };
          at = placeFree(state, box, fits);
          if (at) { if (wd !== tries[0]) report.push(`step ${n}: shorter note (no room for more)`); break; }
        }
        if (!at) { report.push(`step ${n}: no room for the note`); return; }
        used[sideOf(at.fc)].push(at.R);
        let g = labelSvg(box, n, at.x, at.y);
        if (st.type === "turn") g += turnArrow(at.x + box.w / 2, at.y + box.h - 12);
        out[sideOf(at.fc)].push(`<g transform="${mat(toPage(at.fc))}">${g}</g>`);
        if (st.zone) st.zone.forEach(z => { const fc = top(state, z[0]); if (fc) out[sideOf(fc)].push(`<path d="M${z.map(p => ap(toPage(fc), p).map(f).join(" ")).join(" L")} Z" fill="none" stroke="#111" stroke-width="2.5" stroke-dasharray="4 6"/>`); });
      }
    });
    const blurbSpot = findBlurb(plane, used, lines, arrows);
    const fixed = placeFixed(plane, used, lines, arrows);
    if (!blurbSpot) report.push("the about box has no clear spot");
    return { pages: frame(plane, out, opts, deco, blurbSpot, fixed), report, states };
  }

  // ---------- page frames: title, scale check, attribution, decoration on the outside ----------
  function ruler(x, y) {
    let s = `<rect x="${x - 8}" y="${y - 30}" width="236" height="62" rx="8" fill="#fff" stroke="#111" stroke-width="1.5"/>`;
    s += `<path d="M${x} ${y} H${x + 200}" stroke="#111" stroke-width="2.5"/>`;
    for (let i = 0; i <= 8; i++) s += `<path d="M${x + i * 25} ${y} V${y - (i % 4 ? 8 : i % 8 ? 12 : 16)}" stroke="#111" stroke-width="2"/>`;
    for (let i = 0; i <= 50; i += 10) s += `<path d="M${x + i * MM} ${y} V${y + 9}" stroke="#111" stroke-width="1.5"/>`;
    return s + `<text x="${x + 100}" y="${y + 26}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" fill="#111">2 inches · 5 cm. Not? Print at 100%.</text>`;
  }
  const PATTERNS = {
    stripes: `<pattern id="dp" width="60" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><path d="M0 0 V60" stroke="#555" stroke-width="10"/></pattern>`,
    stars: `<pattern id="dp" width="90" height="90" patternUnits="userSpaceOnUse"><path d="M45 20 L51 38 L70 38 L55 49 L61 67 L45 56 L29 67 L35 49 L20 38 L39 38 Z" fill="none" stroke="#555" stroke-width="3"/></pattern>`,
    clouds: `<pattern id="dp" width="140" height="100" patternUnits="userSpaceOnUse"><path d="M20 60 Q20 40 40 42 Q48 22 70 30 Q90 20 98 42 Q120 42 118 60 Z" fill="none" stroke="#555" stroke-width="3"/></pattern>`,
    chevrons: `<pattern id="dp" width="80" height="50" patternUnits="userSpaceOnUse"><path d="M0 40 L40 10 L80 40" fill="none" stroke="#555" stroke-width="6"/></pattern>`
  };
    const titleOf = p => `Paper Airplanes #${p.code} · ${p.name}`;
  const titleW = p => 24 + Math.max(`Paper Airplanes #${p.code}`.length * 9.2, p.name.length * 12.5);
  // The title and the 2-inch scale check go on the front, clear of fold lines (searched from the bottom up).
  function placeFixed(plane, used, lines, arrows) {
    const tw = titleW(plane);
    const spot = (w, h, pref) => {
      const c = [pref];
      for (let y = H - INSET - 12 - h; y > INSET + 10; y -= 20) for (let x = INSET + 12; x + w < W - INSET - 12; x += 20) c.push([x, y]);
      for (const [x, y] of c) { const R = { x0: x, y0: y, x1: x + w, y1: y + h }; if (R.x1 > W - INSET - 6 || R.y1 > H - INSET - 6) continue; if (used.front.some(U => overlap(U, R)) || arrows.front.some(U => overlap(U, R, 4)) || lines.front.some(([A, B]) => segHits(A, B, R))) continue; used.front.push(R); return [x, y]; }
      used.front.push({ x0: pref[0], y0: pref[1], x1: pref[0] + w, y1: pref[1] + h }); return pref;
    };
    const t = spot(tw, 58, plane.titleAt || [40, 1000]);
    const r = spot(236, 62, plane.rulerAt || [590, 1000]);
    return { title: [t[0], t[1] + 30], ruler: [r[0] + 8, r[1] + 30] };
  }
  // The about box (name, where it comes from, a short story, "Pilot ___") goes on the outside of the plane.
  const blurbLines = (p, w) => wrap(p.blurb, Math.floor((w - 20) / 7.6)), blurbH = (p, w) => 66 + blurbLines(p, w).length * 18;
  function findBlurb(plane, used, lines, arrows) {
    const sd = plane.outside || "back";
    for (const w of [262, 214, 180]) {
      const h = blurbH(plane, w), cands = [plane.blurbAt || [60, 60]];
      for (let y = INSET + 10; y + h < H - INSET - 10; y += 20) for (let x = INSET + 10; x + w < W - INSET - 10; x += 20) cands.push([x, y]);
      for (const [x, y] of cands) {
        const R = { x0: x, y0: y, x1: x + w, y1: y + h };
        if (R.x1 > W - INSET - 6 || R.y1 > H - INSET - 6) continue;
        if (used[sd].some(U => overlap(U, R)) || arrows[sd].some(U => overlap(U, R, 4))) continue;
        if (lines[sd].some(([A, B]) => segHits(A, B, R))) continue;
        used[sd].push(R);
        return [x, y, w];
      }
    }
    return null;
  }
  function frame(plane, out, opts, deco, blurbSpot, fixed) {
    const off = opts.offset || { x: 0, y: 0 }, flip = opts.flip || "long";
    const tx = (flip === "long" ? off.x : -off.x) * MM, ty = (flip === "long" ? -off.y : off.y) * MM;
    const clipDef = `<clipPath id="pr"><rect x="${INSET}" y="${INSET}" width="${W - 2 * INSET}" height="${H - 2 * INSET}"/></clipPath>`;
    const op = deco === "bold" ? 0.5 : deco === "faint" ? 0.2 : 0;
    const decoSvg = op ? `<rect x="${INSET}" y="${INSET}" width="${W - 2 * INSET}" height="${H - 2 * INSET}" fill="url(#dp)" opacity="${op}"/>` : "";
    const name = titleOf(plane);
    const t = fixed.title;
    const title = `<rect x="${t[0]}" y="${t[1] - 30}" width="${f(titleW(plane))}" height="58" rx="8" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="${t[0] + 10}" y="${t[1] - 10}" font-family="Arial, sans-serif" font-size="16" fill="#111">Paper Airplanes #${esc(plane.code)}</text><text x="${t[0] + 10}" y="${t[1] + 16}" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="#111">${esc(plane.name)}</text>`;
    const r = fixed.ruler;
    const b = blurbSpot, lines = b ? blurbLines(plane, b[2]) : [];
    const blurb = !b ? "" : `<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${blurbH(plane, b[2])}" rx="10" fill="#fff" stroke="#111" stroke-width="1.5"/>
      <text x="${b[0] + 12}" y="${b[1] + 24}" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#111">${esc(plane.name)}</text>
      ${lines.map((l, i) => `<text x="${b[0] + 10}" y="${b[1] + 42 + i * 18}" font-family="Arial, sans-serif" font-size="14" fill="#111">${esc(l)}</text>`).join("")}
      <text x="${b[0] + 10}" y="${b[1] + 52 + lines.length * 18}" font-family="Arial, sans-serif" font-size="14" fill="#111">Pilot __________  Flight # ___</text>`;
    const outside = plane.outside || "back";
    const page = (sideName, extra) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="8.5in" height="11in">
<defs>${clipDef}${PATTERNS[plane.pattern || "stripes"]}</defs><rect width="${W}" height="${H}" fill="#fff"/>
<g${sideName === "back" ? ` transform="translate(${f(tx)} ${f(ty)})"` : ""}><g clip-path="url(#pr)">
${sideName === outside ? decoSvg : ""}
${extra}
${out[sideName].join("\n")}
</g></g></svg>`;
    // The title and scale check go on the front (visible at step 1). The about box goes on the outside of the plane.
    const frontExtra = title + ruler(r[0], r[1]) + (outside === "front" ? blurb : "");
    const backExtra = outside === "back" ? blurb : "";
    return [page("front", frontExtra), page("back", backExtra)];
  }

  // ---------- the alignment test sheet: hold it up to a window ----------
  function testSheet(opts = {}) {
    const off = opts.offset || { x: 0, y: 0 }, flip = opts.flip || "long";
    const tx = (flip === "long" ? off.x : -off.x) * MM, ty = (flip === "long" ? -off.y : off.y) * MM;
    const spots = [[425, 550], [170, 200], [680, 200], [170, 900], [680, 900]];
    const scale = (x, y) => { let s = ""; for (let i = -10; i <= 10; i++) { const k = i % 5 ? 10 : 18; s += `<path d="M${f(x + i * MM)} ${y - k} V${y + k}" stroke="#111" stroke-width="${i ? 1.2 : 2}"/><path d="M${x - k} ${f(y + i * MM)} H${x + k}" stroke="#111" stroke-width="${i ? 1.2 : 2}"/>`; if (i && !(i % 5)) s += `<text x="${f(x + i * MM)}" y="${y - 22}" text-anchor="middle" font-family="Arial" font-size="11">${i > 0 ? "+" : ""}${i}</text><text x="${x + 24}" y="${f(y + i * MM + 4)}" font-family="Arial" font-size="11">${i > 0 ? "+" : ""}${i}</text>`; } return s + `<path d="M${f(x - 10 * MM)} ${y} H${f(x + 10 * MM)} M${x} ${f(y - 10 * MM)} V${f(y + 10 * MM)}" stroke="#111" stroke-width="1"/>`; };
    const front = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="8.5in" height="11in"><rect width="${W}" height="${H}" fill="#fff"/>
      <text x="425" y="80" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700">Paper Airplanes · printer alignment test (front)</text>
      <text x="425" y="116" text-anchor="middle" font-family="Arial" font-size="18">Print two-sided at 100%. Hold it up to a window. Look at the middle scale from THIS side.</text>
      <text x="425" y="1010" text-anchor="middle" font-family="Arial" font-size="18">Find the thick cross from the back. Right of 0 = +X, below 0 = +Y (in mm, small lines = 1 mm).</text>
      <text x="425" y="1038" text-anchor="middle" font-family="Arial" font-size="18">Type the two numbers in ⚙️ → Back alignment → Add reading, then print this again to check it reads 0, 0.</text>
      ${spots.map(([x, y]) => scale(x, y)).join("")}${ruler(310, 960)}</svg>`;
    const back = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="8.5in" height="11in"><rect width="${W}" height="${H}" fill="#fff"/>
      <text x="425" y="1060" text-anchor="middle" font-family="Arial" font-size="20" font-weight="700">Back · offset now X ${off.x} mm, Y ${off.y} mm · ${flip} edge</text>
      <g transform="translate(${f(tx)} ${f(ty)})">${spots.map(([x, y]) => { const bx = W - x; return `<path d="M${bx - 26} ${y} H${bx + 26} M${bx} ${y - 26} V${y + 26}" stroke="#111" stroke-width="5"/><circle cx="${bx}" cy="${y}" r="9" fill="none" stroke="#111" stroke-width="3"/>`; }).join("")}</g></svg>`;
    return [front, back];
  }

  // ---------- a small picture of the model after a step (for the screen) ----------
  function picture(state, size = 160, hi = null) {
    const bb = bbox(state), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, s = (size - 12) / Math.max(w, h);
    const fcs = state.facets.slice().sort((a, b) => a.z - b.z);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${fcs.map(fc => `<path d="M${folded(fc).map(p => f(6 + (p[0] - bb.x0) * s + (size - 12 - w * s) / 2) + " " + f(6 + (p[1] - bb.y0) * s + (size - 12 - h * s) / 2)).join(" L")} Z" fill="${sideOf(fc) === "front" ? "#fff" : "#e8e1cf"}" stroke="#3b3248" stroke-width="1.6" stroke-linejoin="round"/>`).join("")}${hi ? (() => { const [p, q] = hi; const P = [6 + (p[0] - bb.x0) * s + (size - 12 - w * s) / 2, 6 + (p[1] - bb.y0) * s + (size - 12 - h * s) / 2], Q = [6 + (q[0] - bb.x0) * s + (size - 12 - w * s) / 2, 6 + (q[1] - bb.y0) * s + (size - 12 - h * s) / 2]; return `<clipPath id="c${Math.round(P[0] * 7 + Q[1])}"><rect x="0" y="0" width="${size}" height="${size}"/></clipPath><path d="M${f(P[0])} ${f(P[1])} L${f(Q[0])} ${f(Q[1])}" stroke="#e0604a" stroke-width="2.5" stroke-dasharray="6 4"/>`; })() : ""}</svg>`;
  }

  root.FOLD = { W, H, MM, INSET, run, apply, sheet, testSheet, picture, visible, bbox, bisector, through, reflect, ap };
})(typeof window !== "undefined" ? window : globalThis);
