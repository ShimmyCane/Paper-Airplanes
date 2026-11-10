#!/usr/bin/env node
/* Paper Airplanes: check every plane before it is printed.
   - codes unique; name, origin and blurb present (attribution + a short story, see CLAUDE.md)
   - every fold line lands on the top layer, every step has its number, the about box, title and scale fit
     (in all three instruction modes)
   - pages have no NaN; the finished model is smaller than the sheet (it really folded)
   - fingerprints in tools/fingerprints.json (verbose, bold, no offset); --update only when a change is intended
   Usage: node tools/check_planes.js [--update] */
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const dir = path.join(__dirname, "..");
const ctx = { console }; ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["js/fold.js", "data/planes.js"]) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
const { FOLD, PA_PLANES } = ctx;
const FP = path.join(__dirname, "fingerprints.json");
const fps = fs.existsSync(FP) ? JSON.parse(fs.readFileSync(FP, "utf8")) : {};
const update = process.argv.includes("--update");
const problems = [], notes = [], out = {}, codes = new Set();
const BAD = /misses the top layer|no room for the step number|no room for the note|about box has no clear spot/;
for (const p of PA_PLANES) {
  const say = m => problems.push(p.code + ": " + m);
  if (codes.has(p.code)) say("duplicate code"); codes.add(p.code);
  if (!p.name || !p.origin || !p.blurb) say("needs a name, an origin and a blurb");
  for (const mode of ["verbose", "short", "minimal"]) {
    let r;
    try { r = FOLD.sheet(p, { mode, deco: "bold" }); } catch (e) { say(mode + ": does not draw: " + e.message); continue; }
    r.report.forEach(m => (BAD.test(m) ? say(mode + ": " + m) : mode === "verbose" && notes.push(p.code + ": " + m)));
    if (r.pages.some(s => /NaN|undefined/.test(s))) say(mode + ": NaN or undefined on a page");
    if (mode === "verbose") {
      const b = FOLD.bbox(r.states[r.states.length - 1]);
      if (p.steps.some(s => s.type === "valley" || s.type === "mountain") && (b.x1 - b.x0) * (b.y1 - b.y0) > 0.6 * FOLD.W * FOLD.H) say("the finished model is nearly the whole sheet: did it fold?");
      if (!r.pages[0].includes("Paper Airplanes #" + p.code)) say("no code on the front");
      const fp = crypto.createHash("sha1").update(r.pages.join("")).digest("hex").slice(0, 12);
      out[p.code] = fp;
      if (fps[p.code] && fps[p.code] !== fp && !update) say("changed since the last check (run with --update if that is intended)");
    }
  }
}
FOLD.testSheet({ offset: { x: 1.5, y: -2 }, flip: "short" }).forEach((s, i) => { if (/NaN/.test(s)) problems.push("alignment test page " + (i + 1) + " has NaN"); });
if (!problems.length && (update || !fs.existsSync(FP))) { fs.writeFileSync(FP, JSON.stringify(Object.assign(fps, out), null, 1) + "\n"); console.log("fingerprints written"); }
if (notes.length) console.log("ℹ️  layout notes (fine, but worth a look):\n  " + notes.join("\n  "));
if (problems.length) { console.log("❌ " + problems.length + " problem(s):\n" + problems.join("\n")); process.exit(1); }
console.log(`✅ ${PA_PLANES.length} planes pass in all three instruction modes; alignment test draws.`);
