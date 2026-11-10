/* Paper Airplanes: the folding engine and the fold sheet.
   The paper is simulated as flat pieces (facets). Each facet knows where it sits on the flat sheet (paper coordinates,
   1/100 inch, Letter 850 × 1100), how it is moved in the folded model (an affine map: rotation or mirror + shift),
   and how high it lies in the stack. A step folds every chosen facet on one side of a line onto the other side.
   Before each fold, the engine finds where the fold line crosses the TOP visible layer, maps that piece back to the
   flat sheet, and prints it there: on the front if the paper's front is facing up at that moment, on the back
   (mirrored) if the back is. So following the printed lines in order folds the plane.
   Notation (origami standard): valley fold (fold toward you, "in") = dashed; mountain fold (fold away, "out") =
   dash-dot; paper edge = solid; valley arrow has a filled head, mountain arrow a hollow head.
   Also here: the back alignment (five readings → shift and turn), and test versions (A/B groups for a plane). */
(function (root) {
  "use strict";
  const W = 850, H = 1100, INSET = 24, MM = 100 / 25.4;
  const f = n => Math.round(n * 10) / 10;
  const r2 = v => Math.round(v * 100) / 100;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  // the five alignment spots, in the order the readings are typed: middle, top left, top right, bottom left, bottom right
  // numbered as printed on the alignment test: 1 upper left, 2 upper right, 3 lower left, 4 lower right, 5 middle
  const SPOTS = [[170, 200], [680, 200], [170, 900], [680, 900], [425, 900]];
  const SPOT_NAMES = ["1. Upper Left", "2. Upper Right", "3. Lower Left", "4. Lower Right", "5. Bottom Middle"];
  // a short code from a text (FNV-1a, 4 hex digits): the test code's "hash" so a changed sheet is noticed
  const hash4 = s => { let h = 2166136261; for (const ch of String(s)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return (h >>> 0).toString(16).toUpperCase().padStart(8, "0").slice(0, 4); };

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

  // The back's move, so that seen from the front it shifts by −align (mm) and turns by −rot degrees about the sheet's middle.
  // A long-edge flip mirrors the back left to right. A short-edge print is turned 180° by the printer, which mirrors it the
  // same way (x only), so one rule covers both. As an SVG matrix: x' = a·x + c·y + e, y' = b·x + d·y + f.
  function alignMatrix(al = {}) {
    const psi = -(al.rot || 0) * Math.PI / 180, c = Math.cos(psi), s = Math.sin(psi), Cx = W / 2, Cy = H / 2;
    const Dx = -(al.x || 0) * MM, Dy = -(al.y || 0) * MM;
    return [c, -s, s, c, Cx * (1 - c) - s * Cy - Dx, Cy * (1 - c) + s * Cx + Dy];
  }
  // From five readings (mm, seen from the front, in SPOTS order) find the shift and the turn that explain them.
  // A turn by φ moves a spot at v (from the middle) by φ·(−v.y, v.x). Returns { x, y, rot (degrees), residual (mm) }.
  function fitAlign(R) {
    const C = [W / 2, H / 2], P = SPOTS.map(([x, y]) => [(x - C[0]) / MM, (y - C[1]) / MM]), J = P.map(([x, y]) => [-y, x]);
    const n = R.length, mx = R.reduce((s, r) => s + r.x, 0) / n, my = R.reduce((s, r) => s + r.y, 0) / n;
    let num = 0, den = 0;
    R.forEach((r, i) => { num += J[i][0] * (r.x - mx) + J[i][1] * (r.y - my); den += J[i][0] ** 2 + J[i][1] ** 2; });
    const phi = den ? num / den : 0;
    const tx = R.reduce((s, r, i) => s + r.x - phi * J[i][0], 0) / n, ty = R.reduce((s, r, i) => s + r.y - phi * J[i][1], 0) / n;
    const residual = Math.max(...R.map((r, i) => Math.hypot(r.x - tx - phi * J[i][0], r.y - ty - phi * J[i][1])));
    return { x: r2(tx), y: r2(ty), rot: r2(phi * 180 / Math.PI), residual: r2(residual) };
  }

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

  // Build both printed pages for a plane. opts: { mode: verbose|short|minimal, deco: bold|faint|none, align: {x, y, rot}, flip }
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
    fixed.fell.forEach(name => report.push(`the ${name} has no clear spot (it overlaps)`));
    return { pages: frame(plane, out, opts, deco, blurbSpot, fixed), report, states };
  }

  // ---------- test versions: a plane may have groups of A / B steps (see data/planes.js) ----------
  // bits "010" = A, B, A for the groups in order. The printed sheet gets a test code: the bits, a short hash of the
  // steps as they were folded, and what each group was set to.
  function withVariant(plane, bits) {
    if (!plane.variants) return plane;
    const groups = plane.variants, b = groups.map((g, i) => (bits && bits[i] === "1" ? "1" : "0")).join("");
    const pick = b.split("").map(c => (c === "1" ? "B" : "A"));
    const steps = plane.steps.map(s => Object.assign({}, s));
    groups.forEach((g, i) => { const patch = g[pick[i]].patch || {}; Object.keys(patch).forEach(n => { steps[+n - 1] = Object.assign({}, steps[+n - 1], patch[n]); }); });
    const id = hash4(JSON.stringify(steps.map(s => [s.type, s.line || null, s.move || null, s.select || null])));
    const text = groups.map((g, i) => `${g.name} ${pick[i]}`).join(" · ");
    return Object.assign({}, plane, { steps, variantBits: b, variantHash: id, variantText: text });
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
  const titleW = p => 24 + Math.max(`Paper Airplanes #${p.code}`.length * 9.2, p.name.length * 12.5, p.variantText ? p.variantText.length * 6.2 : 0);
  // The title, the 2-inch scale check and (test versions) the test code go on the front, clear of fold lines.
  function placeFixed(plane, used, lines, arrows) {
    const tw = titleW(plane), fell = [];
    const spot = (w, h, pref, name) => {
      const c = [pref];
      for (let y = H - INSET - 12 - h; y > INSET + 10; y -= 20) for (let x = INSET + 12; x + w < W - INSET - 12; x += 20) c.push([x, y]);
      for (const [x, y] of c) { const R = { x0: x, y0: y, x1: x + w, y1: y + h }; if (R.x1 > W - INSET - 6 || R.y1 > H - INSET - 6) continue; if (used.front.some(U => overlap(U, R)) || arrows.front.some(U => overlap(U, R, 4)) || lines.front.some(([A, B]) => segHits(A, B, R))) continue; used.front.push(R); return [x, y]; }
      fell.push(name); used.front.push({ x0: pref[0], y0: pref[1], x1: pref[0] + w, y1: pref[1] + h }); return pref;
    };
    const th = plane.variantBits == null ? 58 : 74;      // a test-version sheet has two more lines: its test code and what it is set to
    const t = spot(tw, th, plane.titleAt || [40, 1000], "title");
    const r = spot(236, 62, plane.rulerAt || [590, 1000], "scale check");
    return { title: t, titleH: th, ruler: [r[0] + 8, r[1] + 30], fell };
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
    const G = mat(alignMatrix(opts.align));
    const clipDef = `<clipPath id="pr"><rect x="${INSET}" y="${INSET}" width="${W - 2 * INSET}" height="${H - 2 * INSET}"/></clipPath>`;
    const op = deco === "bold" ? 0.5 : deco === "faint" ? 0.2 : 0;
    const decoSvg = op ? `<rect x="${INSET}" y="${INSET}" width="${W - 2 * INSET}" height="${H - 2 * INSET}" fill="url(#dp)" opacity="${op}"/>` : "";
    const name = titleOf(plane);
    const t = fixed.title, [tx, ty] = t;
    const v = plane.variantBits != null;               // compact lines when there is a test code (the front is crowded)
    const code = !v ? "" : `<text x="${tx + 10}" y="${ty + 54}" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#111">Test code ${esc(plane.code)} · ${plane.variantBits} · #${plane.variantHash}</text>
      <text x="${tx + 10}" y="${ty + 68}" font-family="Arial, sans-serif" font-size="10" fill="#111">${esc(plane.variantText)}</text>`;
    const title = `<rect x="${tx}" y="${ty}" width="${f(titleW(plane))}" height="${fixed.titleH}" rx="8" fill="#fff" stroke="#111" stroke-width="1.5"/><text x="${tx + 10}" y="${ty + (v ? 17 : 20)}" font-family="Arial, sans-serif" font-size="${v ? 13 : 16}" fill="#111">Paper Airplanes #${esc(plane.code)}</text><text x="${tx + 10}" y="${ty + (v ? 37 : 42)}" font-family="Arial, sans-serif" font-size="${v ? 19 : 22}" font-weight="700" fill="#111">${esc(plane.name)}</text>${code}`;
    const r = fixed.ruler;
    const b = blurbSpot, lines = b ? blurbLines(plane, b[2]) : [];
    const blurb = !b ? "" : `<rect x="${b[0]}" y="${b[1]}" width="${b[2]}" height="${blurbH(plane, b[2])}" rx="10" fill="#fff" stroke="#111" stroke-width="1.5"/>
      <text x="${b[0] + 12}" y="${b[1] + 24}" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="#111">${esc(plane.name)}</text>
      ${lines.map((l, i) => `<text x="${b[0] + 10}" y="${b[1] + 42 + i * 18}" font-family="Arial, sans-serif" font-size="14" fill="#111">${esc(l)}</text>`).join("")}
      <text x="${b[0] + 10}" y="${b[1] + 52 + lines.length * 18}" font-family="Arial, sans-serif" font-size="14" fill="#111">Pilot __________  Flight # ___</text>`;
    const outside = plane.outside || "back";
    const page = (sideName, extra) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="8.5in" height="11in">
<defs>${clipDef}${PATTERNS[plane.pattern || "stripes"]}</defs><rect width="${W}" height="${H}" fill="#fff"/>
<g${sideName === "back" ? ` transform="${G}"` : ""}><g clip-path="url(#pr)">
${sideName === outside ? decoSvg : ""}
${extra}
${out[sideName].join("\n")}
</g></g></svg>`;
    // The title and scale check go on the front (visible at step 1). The about box goes on the outside of the plane.
    const frontExtra = title + ruler(r[0], r[1]) + (outside === "front" ? blurb : "");
    const backExtra = outside === "back" ? blurb : "";
    return [page("front", frontExtra), page("back", backExtra)];
  }

  // ---------- the alignment test sheet: a vernier at each spot, hold it up to a window ----------
  // At each of the five spots there is an across row and a down column. The front has marks 1.0 mm apart (numbered i);
  // the back has marks 0.9 mm apart (numbered j). Where one back mark lines up exactly with a front mark, the back is
  // off by i − 0.9·j mm (0.1 mm steps). Numbers are 14 pt and stack in six levels, so neighbours never touch.
  // Back numbers are drawn mirrored so they read correctly when seen through the sheet from the front.
  // A registration star sits in the clear middle of both sides: with the back exactly aligned, the two stars coincide.
  const VP = 1.0, VQ = 0.9, VI = [-8, 8], VJ = [-5, 4], VOFF = 28;
  const LEVELS = 6, LEVEL_H = 21, NUM = 14;
  // the registration star: centred on the page, a third of its width (about 285 of 850 units)
  const STAR = { x: 425, y: 550, R: 150, r: 57 };
  const vernier = (i, j) => Math.round((i - VQ * j) * 10) / 10;      // the offset a coinciding pair reads
  const lvl = n => ((n % LEVELS) + LEVELS) % LEVELS;                 // level for mark n (neighbours on one level are 6 marks apart)
  function testSheet(opts = {}) {
    const al = opts.align || {}, G = mat(alignMatrix(al));
    const num = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n);
    // text in FRONT coordinates (X, Y); on the back it is mirrored so it reads from the front
    const text = (X, Y, t, anchor, back) => back
      ? `<text transform="translate(${f(W - X)} ${f(Y)}) scale(-1 1)" x="0" y="0" text-anchor="${anchor}" font-family="Arial" font-size="${NUM}">${t}</text>`
      : `<text x="${f(X)}" y="${f(Y)}" text-anchor="${anchor}" font-family="Arial" font-size="${NUM}">${t}</text>`;
    const line = (x1, y1, x2, y2, back) => back
      ? `<path d="M${f(W - x1)} ${f(y1)} L${f(W - x2)} ${f(y2)}" stroke="#111" stroke-width="0.9"/>`
      : `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="#111" stroke-width="0.9"/>`;
    // one spot: each mark is a long line out from its axis, ending just short of its number
    const spot = ([sx, sy], back) => {
      const up = sy > 425 ? -1 : 1;                                    // rows and numbers run away from the middle of the sheet
      const rowY = sy + up * VOFF, colX = sx + VOFF, P = back ? VQ : VP;
      const lo = back ? VJ : VI;
      let out = "";
      for (let n = lo[0]; n <= lo[1]; n++) {
        const dx = sx + n * P * MM, dy = sy + n * P * MM, k = lvl(n - lo[0]);
        const dAcross = 8 + k * LEVEL_H, dAcrossText = dAcross + 11;   // distance from the axis: line end, then text baseline
        out += line(dx, rowY, dx, rowY + up * dAcross, back);            // across: long line to the number
        out += text(dx, rowY + up * dAcrossText, num(n), "middle", back);
        const xDown = colX + 8 + k * LEVEL_H;                            // down: long line to the number, which starts there
        out += line(colX, dy, xDown, dy, back);
        out += text(xDown + 2, dy + 5, num(n), "start", back);
      }
      return out;
    };
    // names sit clear of the stacks: above the upper spots, below the lower ones
    const nameAt = ([sx, sy]) => sy < 425 ? [sx - 20, sy - 46, "start"] : [sx, sy + 56, "middle"];
    const names = (back) => SPOTS.map((sp, k) => { const [x, y, a] = nameAt(sp); return text(x, y, SPOT_NAMES[k], a, back); }).join("");
    const starPts = [];
    for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, R = k % 2 ? STAR.r : STAR.R; starPts.push(`${f(STAR.x + R * Math.cos(a))} ${f(STAR.y + R * Math.sin(a))}`); }
    const star = `<path d="M${starPts.join(" L")} Z" fill="none" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/>`;
    const front_ = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="8.5in" height="11in"><rect width="${W}" height="${H}" fill="#fff"/>
      <text x="425" y="50" text-anchor="middle" font-family="Arial" font-size="30" font-weight="700">Paper Airplanes · alignment test (front)</text>
      <text x="425" y="82" text-anchor="middle" font-family="Arial" font-size="18">Hold this page up to a window.</text>
      <text x="425" y="108" text-anchor="middle" font-family="Arial" font-size="18">At each numbered spot, find the back line that matches a front line.</text>
      ${star}
      ${SPOTS.map(sp => spot(sp, false)).join("")}${names(false)}
      <text x="425" y="1000" text-anchor="middle" font-family="Arial" font-size="18">Write the front number and the back number for each spot.</text>
      <text x="425" y="1026" text-anchor="middle" font-family="Arial" font-size="18">Type them in ⚙️ → Back alignment, then Save. Print again to check.</text></svg>`;
    const back_ = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="8.5in" height="11in"><rect width="${W}" height="${H}" fill="#fff"/>
      <text x="425" y="1060" text-anchor="middle" font-family="Arial" font-size="18" font-weight="700">Back · saved: across ${al.x || 0} mm · down ${al.y || 0} mm · turn ${al.rot || 0}°</text>
      <g transform="${G}">${SPOTS.map(sp => spot(sp, true)).join("")}${names(true)}${star}</g></svg>`;
    return [front_, back_];
  }

  // ---------- a small picture of the model after a step (for the screen) ----------
  function picture(state, size = 160, hi = null) {
    const bb = bbox(state), w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, s = (size - 12) / Math.max(w, h);
    const fcs = state.facets.slice().sort((a, b) => a.z - b.z);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${fcs.map(fc => `<path d="M${folded(fc).map(p => f(6 + (p[0] - bb.x0) * s + (size - 12 - w * s) / 2) + " " + f(6 + (p[1] - bb.y0) * s + (size - 12 - h * s) / 2)).join(" L")} Z" fill="${sideOf(fc) === "front" ? "#fff" : "#e8e1cf"}" stroke="#3b3248" stroke-width="1.6" stroke-linejoin="round"/>`).join("")}${hi ? (() => { const [p, q] = hi; const P = [6 + (p[0] - bb.x0) * s + (size - 12 - w * s) / 2, 6 + (p[1] - bb.y0) * s + (size - 12 - h * s) / 2], Q = [6 + (q[0] - bb.x0) * s + (size - 12 - w * s) / 2, 6 + (q[1] - bb.y0) * s + (size - 12 - h * s) / 2]; return `<clipPath id="c${Math.round(P[0] * 7 + Q[1])}"><rect x="0" y="0" width="${size}" height="${size}"/></clipPath><path d="M${f(P[0])} ${f(P[1])} L${f(Q[0])} ${f(Q[1])}" stroke="#e0604a" stroke-width="2.5" stroke-dasharray="6 4"/>`; })() : ""}</svg>`;
  }

  root.FOLD = { W, H, MM, INSET, SPOTS, SPOT_NAMES, STAR, VI, VJ, run, apply, sheet, testSheet, picture, visible, bbox, bisector, through, reflect, ap, alignMatrix, fitAlign, vernier, withVariant, hash4 };
})(typeof window !== "undefined" ? window : globalThis);
