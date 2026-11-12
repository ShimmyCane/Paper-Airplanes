/* Paper Airplanes: the 3-D view. The same folded model as the board, shown in 3-D.
   - Fold slider: 0 = flat paper, N = every step done. Between two whole numbers, that step is part-way: its flap swings
     about the fold line (valley toward you, mountain away; "turn over" spins the model; "fold and open" goes and comes back).
   - Open slider: gently tug the last folds open (the wings), 0–90°. Only the trailing folds whose flaps do not share paper
     are opened, so nothing tears: on a dart that is the two wing folds.
   - Drag to turn the model; pinch (two fingers) or the mouse wheel to zoom. Plays twice, then waits for ▶.
   Drawn on a canvas with the painter's method (far faces first); each flat layer sits a hair above the one below. */
(function (root) {
  "use strict";
  const LAYER = 0.9;                                        // height between stacked layers (1/100 inch)
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  // rotate point p about the line through c with unit direction u by angle t (Rodrigues)
  function rot(p, c, u, t) {
    const v = sub(p, c), cs = Math.cos(t), sn = Math.sin(t), k = cross(u, v), d = dot(u, v);
    return [c[0] + v[0] * cs + k[0] * sn + u[0] * d * (1 - cs), c[1] + v[1] * cs + k[1] * sn + u[1] * d * (1 - cs), c[2] + v[2] * cs + k[2] * sn + u[2] * d * (1 - cs)];
  }
  const lineAxis = ([a, b]) => { const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return { c: [a[0], a[1], 0], u: [(b[0] - a[0]) / L, (b[1] - a[1]) / L, 0] }; };
  const reflect2 = (M, p) => [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5]];
  const front = fc => fc.T[0] * fc.T[3] - fc.T[1] * fc.T[2] > 0;
  // a facet as a 3-D polygon: its points, its "up" normal, and which printed side faces up when flat
  const flat = fc => ({ pts: root.FOLD.folded(fc).map(p => [p[0], p[1], fc.z * LAYER]), n: [0, 0, 1], up: front(fc) });
  // swing a facet about an axis by angle t, choosing the sign that lifts it toward +z·want at the start of the swing
  function swing(f, ax, t, want) {
    const cen = f.pts.reduce((s, p) => [s[0] + p[0] / f.pts.length, s[1] + p[1] / f.pts.length, s[2] + p[2] / f.pts.length], [0, 0, 0]);
    const sgn = rot(cen, ax.c, ax.u, 0.2)[2] - cen[2] >= 0 ? want : -want;
    return { pts: f.pts.map(p => rot(p, ax.c, ax.u, sgn * t)), n: rot(f.n, [0, 0, 0], ax.u, sgn * t), up: f.up };
  }

  // the model at fold progress s (0…N) with the last folds opened by `open` (radians)
  function geometry(plane, states, s, open) {
    const F = root.FOLD, steps = plane.steps, N = steps.length;
    s = Math.max(0, Math.min(N, s));
    const k = Math.floor(s), f = s - k;
    if (k >= N || f < 1e-6) {
      const st = states[Math.min(k, N)], faces = st.facets.map(flat);
      return k >= N && open > 0 ? opened(plane, states, faces, open) : faces;
    }
    const step = steps[k], before = states[k];
    if (step.type === "turn") {                              // spin the whole model about the sheet's middle (as the engine turns it)
      const ax = { c: [step.axis == null ? F.W / 2 : step.axis, 0, 0], u: [0, 1, 0] };
      return before.facets.map(flat).map(g => ({ pts: g.pts.map(p => rot(p, ax.c, ax.u, f * Math.PI)), n: rot(g.n, [0, 0, 0], ax.u, f * Math.PI), up: g.up }));
    }
    if (step.type !== "valley" && step.type !== "mountain" && step.type !== "crease") return before.facets.map(flat);
    const valley = step.type !== "mountain", asFold = step.type === "crease" ? Object.assign({}, step, { type: "valley" }) : step;
    const after = step.type === "crease" ? F.apply(before, asFold) : states[k + 1];
    const R = F.reflect(step.line[0], step.line[1]), ax = lineAxis(step.line);
    const t = step.type === "crease" ? Math.PI * 0.85 * Math.sin(Math.PI * f) : Math.PI * f;
    return after.facets.map(fc => {
      if (fc.tags[fc.tags.length - 1] !== step.id) return flat(fc);
      // a moved piece: start from where it was before the fold (mirror it back), then swing it over the line
      // its layer height starts negated, so the half-turn brings it to exactly its height after the fold
      const g = { pts: F.folded(fc).map(p => reflect2(R, p)).map(p => [p[0], p[1], -fc.z * LAYER]), n: [0, 0, 1], up: !front(fc) };
      return swing(g, ax, t, valley ? 1 : -1);
    });
  }
  // the trailing folds that can open together (their flaps share no paper), in the final model's frame
  function openable(plane) {
    const steps = plane.steps, out = [];
    let turns = 0;
    for (let i = steps.length - 1; i >= 0; i--) {
      const st = steps[i];
      if (st.type === "turn") { turns++; continue; }
      if (st.type !== "valley" && st.type !== "mountain") continue;
      out.push({ step: st, turns });
      if (out.length >= 2) break;                           // the wings: two folds at most
    }
    return out;
  }
  function opened(plane, states, faces, open) {
    const F = root.FOLD, last = states[states.length - 1], list = openable(plane);
    // a flap opens only if none of its paper was moved by an earlier fold in the list (they must not share paper)
    const tagsOf = last.facets.map(fc => fc.tags);
    const groups = list.map(o => tagsOf.map((tg, i) => (tg.includes(o.step.id) ? i : -1)).filter(i => i >= 0));
    const ok = list.map((o, j) => groups[j].length && !list.some((p, q) => q !== j && groups[q].some(i => groups[j].includes(i))));
    let out = faces.slice();
    list.forEach((o, j) => {
      if (!ok[j]) return;
      let line = o.step.line.map(p => p.slice());
      // carry the line into the final frame: each later turn mirrors it about the sheet's middle
      for (let q = 0; q < o.turns; q++) line = line.map(p => [F.W - p[0], p[1]]);
      const ax = lineAxis(line), want = (o.step.type === "mountain" ? -1 : 1) * (o.turns % 2 ? -1 : 1);
      // open = swing back from folded (the flap lies on its side of the paper) toward that side
      groups[j].forEach(i => { out[i] = swing(out[i], ax, open, want); });
    });
    return out;
  }

  // ---------- the viewer ----------
  function mount(box, getPlane) {
    box.innerHTML = `<canvas class="v3d" width="800" height="600" aria-label="The plane in 3-D. Drag to turn it."></canvas>
      <div class="row v3dRow"><button class="btn" data-a="play" type="button">⏸</button><button class="btn" data-a="start" type="button">⏮</button>
        <input type="range" class="v3dFold" min="0" max="1" step="0.01" value="0" aria-label="Fold"><span class="v3dLbl"></span></div>
      <div class="row v3dRow"><label class="v3dOpenL">🪽 Open <input type="range" class="v3dOpen" min="0" max="90" step="1" value="0" aria-label="Open the last folds"></label>
        <button class="btn" data-a="view" type="button">🎯 Reset view</button></div>`;
    const cv = box.querySelector("canvas"), ctx = cv.getContext("2d"), foldR = box.querySelector(".v3dFold"), openR = box.querySelector(".v3dOpen"), lbl = box.querySelector(".v3dLbl"), playB = box.querySelector('[data-a="play"]');
    let plane = null, states = [], N = 0, s = 0, yaw = -0.5, pitch = 0.75, zoom = 1, playing = true, loops = 0, hold = 0, raf = 0, last = 0, alive = true, turned = false;
    function load() { plane = getPlane(); states = root.FOLD.run(plane); N = plane.steps.length; foldR.max = String(N); if (s > N) s = N; }
    function draw() {
      const W = cv.clientWidth || 600, H = Math.round(W * 0.75);
      if (cv.width !== Math.round(W * 2)) { cv.width = Math.round(W * 2); cv.height = Math.round(H * 2); }
      const faces = geometry(plane, states, s, s >= N ? (+openR.value) * Math.PI / 180 : 0);
      const all = faces.flatMap(f => f.pts), cx = all.reduce((a, p) => a + p[0], 0) / all.length, cy = all.reduce((a, p) => a + p[1], 0) / all.length;
      const span = Math.max(1, ...all.map(p => Math.hypot(p[0] - cx, p[1] - cy, p[2])));
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      // camera: turn about the vertical (yaw), then tilt (pitch); paper "up" (+z) faces the viewer at yaw = pitch = 0
      const cam = p => { const x = p[0] - cx, y = p[1] - cy, z = p[2]; const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw; const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp; return [x1, y2, z2]; };
      const camN = n => { const x1 = n[0] * cyw + n[2] * syw, z1 = -n[0] * syw + n[2] * cyw; return [x1, n[1] * cp - z1 * sp, n[1] * sp + z1 * cp]; };
      const scale = Math.min(cv.width, cv.height) * 0.46 / span * zoom;
      const polys = faces.map(f => { const q = f.pts.map(cam), n = camN(f.n); return { q, depth: q.reduce((a, p) => a + p[2], 0) / q.length, n, up: f.up }; });
      polys.sort((a, b) => a.depth - b.depth);                // far first (smaller z = farther from the viewer)
      ctx.fillStyle = "#f4efe2"; ctx.fillRect(0, 0, cv.width, cv.height);
      polys.forEach(p => {
        const facing = p.n[2] >= 0, showFront = facing ? p.up : !p.up, light = 0.55 + 0.45 * Math.abs(p.n[2]);
        const base = showFront ? [255, 255, 255] : [232, 225, 207];
        ctx.fillStyle = `rgb(${base.map(c => Math.round(c * light)).join(",")})`;
        ctx.strokeStyle = "#3b3248"; ctx.lineWidth = 2; ctx.lineJoin = "round";
        ctx.beginPath(); p.q.forEach((v, i) => { const X = cv.width / 2 + v[0] * scale, Y = cv.height / 2 + v[1] * scale; i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); ctx.fill(); ctx.stroke();
      });
      const k = Math.min(N, Math.floor(s + 1e-6));
      lbl.textContent = s >= N ? `Done · ${N} steps` : `Step ${k + 1} of ${N}`;
      foldR.value = String(s);
      const ol = box.querySelector(".v3dOpenL"); if (ol) ol.style.opacity = s >= N ? "1" : ".45";
    }
    function tick(t) {
      if (!alive) return;
      if (!cv.isConnected) { alive = false; return; }           // the viewer was taken off the page: stop quietly
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0; last = t;
      if (playing) {
        if (hold > 0) { hold -= dt; if (hold <= 0) { if (loops >= 2) { playing = false; playB.textContent = "▶"; } else s = 0; } }
        else { s += dt / 0.9; if (s >= N) { s = N; loops++; hold = 1.2; } }
        draw();
      }
      raf = requestAnimationFrame(tick);
    }
    playB.addEventListener("click", () => { if (playing) { playing = false; playB.textContent = "▶"; } else { if (s >= N) s = 0; loops = 1; hold = 0; playing = true; playB.textContent = "⏸"; } });
    box.querySelector('[data-a="start"]').addEventListener("click", () => { s = 0; draw(); });
    box.querySelector('[data-a="view"]').addEventListener("click", () => { yaw = -0.5; pitch = 0.75; zoom = 1; draw(); });
    foldR.addEventListener("input", () => { playing = false; playB.textContent = "▶"; s = +foldR.value; draw(); });
    openR.addEventListener("input", () => {
      if (s < N) { s = N; playing = false; playB.textContent = "▶"; }
      if (!turned) { yaw = 1.2; pitch = -0.5; turned = true; }   // the first tug: turn to see it as a plane (unless you turned it already)
      draw();
    });
    // drag to turn; two fingers to zoom
    const pts = new Map(); let pinch0 = 0, zoom0 = 1;
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]); if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch0 = Math.hypot(a[0] - b[0], a[1] - b[1]); zoom0 = zoom; } });
    cv.addEventListener("pointermove", e => {
      if (!pts.has(e.pointerId)) return;
      const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; zoom = Math.max(0.4, Math.min(4, zoom0 * Math.hypot(a[0] - b[0], a[1] - b[1]) / (pinch0 || 1))); }
      else { turned = true; yaw += (e.clientX - prev[0]) * 0.01; pitch = Math.max(-1.5, Math.min(1.5, pitch + (e.clientY - prev[1]) * 0.01)); }
      draw();
    });
    const up = e => { pts.delete(e.pointerId); };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", e => { e.preventDefault(); zoom = Math.max(0.4, Math.min(4, zoom * (e.deltaY < 0 ? 1.1 : 0.9))); draw(); }, { passive: false });
    load(); draw(); raf = requestAnimationFrame(tick);
    return {
      refresh() { load(); draw(); },
      stop() { alive = false; cancelAnimationFrame(raf); },
      set(o) { if (o.s != null) s = o.s; if (o.open != null) openR.value = String(o.open); if (o.yaw != null) yaw = o.yaw; if (o.pitch != null) pitch = o.pitch; if (o.play != null) { playing = o.play; playB.textContent = o.play ? "⏸" : "▶"; } draw(); },
      state: () => ({ s, N, playing, loops, open: +openR.value })
    };
  }
  root.VIEW3D = { mount, geometry, openable };
})(typeof window !== "undefined" ? window : globalThis);
