#!/usr/bin/env node
/* Paper Airplanes: check every plane before it is printed.
   - codes unique; name, origin and blurb present (attribution + a short story, see CLAUDE.md)
   - every fold line lands on the top layer, every step has its number, the about box, title and scale fit
     (in all three instruction modes), for every combination of test versions
   - pages have no NaN; the finished model is smaller than the sheet (it really folded)
   - test versions: the test code is on the front
   - alignment: the back's move matches the geometry (shift and turn, seen from the front); a vernier reading fits back exactly
   - fingerprints in tools/fingerprints.json (verbose, bold, no alignment, default versions); --update only when a change is intended
   Usage: node tools/check_planes.js [--update] */
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const dir = path.join(__dirname, "..");
const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["js/fold.js", "data/planes.js"]) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
const { FOLD, PA_PLANES } = ctx;
const { W, H, MM } = FOLD;
const FP = path.join(__dirname, "fingerprints.json");
const fps = fs.existsSync(FP) ? JSON.parse(fs.readFileSync(FP, "utf8")) : {};
const update = process.argv.includes("--update");
const problems = [], notes = [], out = {}, codes = new Set();
const BAD = /misses the top layer|no room for the step number|no room for the note|about box has no clear spot|has no clear spot \(it overlaps\)/;
const MODES = ["verbose", "short", "minimal"];
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- alignment geometry: the back's move, seen from the front, is a shift by −align and a turn by −rot about the middle
{
  const al = { x: 1.5, y: -2, rot: 0.4 }, M = FOLD.alignMatrix(al), psi = -al.rot * Math.PI / 180;
  FOLD.SPOTS.forEach(([x, y]) => {
    const q = [W - x, y];                                           // where the back cross is printed (page coordinates)
    const pp = [M[0] * q[0] + M[2] * q[1] + M[4], M[1] * q[0] + M[3] * q[1] + M[5]];
    const front = [W - pp[0], pp[1]];                                // seen from the front
    const v = [(x - W / 2) / MM, (y - H / 2) / MM];
    const want = [-al.x - psi * v[1], -al.y + psi * v[0]], got = [(front[0] - x) / MM, (front[1] - y) / MM];
    if (Math.hypot(got[0] - want[0], got[1] - want[1]) > 0.02) problems.push(`alignment: back spot (${x}, ${y}) moves to ${got.map(n => n.toFixed(3))} mm, expected ${want.map(n => n.toFixed(3))}`);
  });
}
// ---- vernier: at each spot the sheet shows the pair (i, j) that lines up; the form reads i − 0.9·j. A known error must come back
{
  const e = { x: 0.7, y: -1.2, rot: 0.35 }, th = e.rot * Math.PI / 180;
  const err = (x, y) => { const v = [(x - W / 2) / MM, (y - H / 2) / MM]; return [e.x - th * v[1], e.y + th * v[0]]; };
  const pairFor = d => {                                       // the coinciding pair the eye would find for a displacement d (mm)
    let best = null;
    for (let i = FOLD.VI[0]; i <= FOLD.VI[1]; i++) for (let j = FOLD.VJ[0]; j <= FOLD.VJ[1]; j++) {
      const err1 = Math.abs(FOLD.vernier(i, j) - d); if (!best || err1 < best.err) best = { i, j, err: err1 };
    }
    return best;
  };
  const readings = FOLD.SPOTS.map(([x, y]) => {
    const [dx, dy] = err(x, y), px = pairFor(dx), py = pairFor(dy);
    return { x: FOLD.vernier(px.i, px.j), y: FOLD.vernier(py.i, py.j) };
  });
  const fit = FOLD.fitAlign(readings), tol = 0.06;                       // readings are to 0.1 mm
  if (!near(fit.x, e.x, tol) || !near(fit.y, e.y, tol) || !near(fit.rot, e.rot, 0.1) || fit.residual > 0.1) problems.push(`vernier fit: got ${JSON.stringify(fit)}, expected ${JSON.stringify(e)}`);
  const bad = readings.map((r, i) => (i === 3 ? { x: r.x + 0.5, y: r.y } : r));
  if (FOLD.fitAlign(bad).residual < 0.2) problems.push("vernier fit: a misread spot does not show as a residual");
  // every 0.1 mm offset from −3 to 3 has exactly one coinciding pair on the sheet, so the reading is never ambiguous
  for (let k = -30; k <= 30; k++) {                                      // within ±3 mm, the range the sheet reads
    const d = k / 10; let n = 0;
    for (let i = FOLD.VI[0]; i <= FOLD.VI[1]; i++) for (let j = FOLD.VJ[0]; j <= FOLD.VJ[1]; j++) if (Math.abs(FOLD.vernier(i, j) - d) < 1e-9) n++;
    if (n !== 1) { problems.push(`vernier: ${d} mm has ${n} coinciding pairs (need exactly 1)`); break; }
  }
}
FOLD.testSheet({ align: { x: 1.5, y: -2, rot: 0.4 } }).forEach((s, i) => { if (/NaN|undefined/.test(s)) problems.push("alignment test page " + (i + 1) + " has NaN"); });

for (const p of PA_PLANES) {
  const say = m => problems.push(p.code + ": " + m);
  if (codes.has(p.code)) say("duplicate code"); codes.add(p.code);
  if (!p.name || !p.origin || !p.blurb) say("needs a name, an origin and a blurb");
  const n = p.variants ? p.variants.length : 0;
  const combos = p.variants ? Array.from({ length: 2 ** n }, (_, k) => k.toString(2).padStart(n, "0")) : [null];
  const defaultBits = "0".repeat(n);
  for (const bits of combos) {
    const q = bits === null ? p : FOLD.withVariant(p, bits), tag = bits === null ? "" : `[test ${bits}] `;
    for (const mode of MODES) {
      let r;
      try { r = FOLD.sheet(q, { mode, deco: "bold" }); } catch (e) { say(tag + mode + ": does not draw: " + e.message); continue; }
      r.report.forEach(m => (BAD.test(m) ? say(tag + mode + ": " + m) : mode === "verbose" && bits === defaultBits && notes.push(p.code + ": " + m)));
      if (r.pages.some(s => /NaN|undefined/.test(s))) say(tag + mode + ": NaN or undefined on a page");
      if (mode === "verbose") {
        const b = FOLD.bbox(r.states[r.states.length - 1]);
        if (p.steps.some(s => s.type === "valley" || s.type === "mountain") && (b.x1 - b.x0) * (b.y1 - b.y0) > 0.6 * W * H) say(tag + "the finished model is nearly the whole sheet: did it fold?");
        if (!r.pages[0].includes("Paper Airplanes #" + p.code)) say(tag + "no code on the front");
        if (q.variantBits !== undefined && !r.pages[0].includes("Test code " + p.code + " · " + q.variantBits)) say(tag + "no test code on the front");
        if (bits === null || bits === defaultBits) {
          const fp = crypto.createHash("sha1").update(r.pages.join("")).digest("hex").slice(0, 12);
          out[p.code] = fp;
          if (fps[p.code] && fps[p.code] !== fp && !update) say("changed since the last check (run with --update if that is intended)");
        }
      }
    }
  }
}
if (!problems.length && (update || !fs.existsSync(FP))) { fs.writeFileSync(FP, JSON.stringify(Object.assign(fps, out), null, 1) + "\n"); console.log("fingerprints written"); }
if (notes.length) console.log("ℹ️  layout notes (fine, but worth a look):\n  " + notes.join("\n  "));
if (problems.length) { console.log("❌ " + problems.length + " problem(s):\n" + problems.join("\n")); process.exit(1); }
const combos = PA_PLANES.reduce((s, p) => s + (p.variants ? 2 ** p.variants.length : 1), 0);
console.log(`✅ ${PA_PLANES.length} planes pass in all three instruction modes (${combos} versions in all); alignment geometry and the vernier fit pass.`);
