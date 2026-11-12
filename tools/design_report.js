#!/usr/bin/env node
/* Paper Airplanes: read a design (a share link, or its "#d=…" part, or a pa_flights reason "design:…") and report it:
   its name, paper and steps in plain words, and what the sheet checker finds (the same rule as tools/check_planes.js).
   Usage: node tools/design_report.js "<link or code>"     (or pipe it in) */
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = path.join(__dirname, "..");
const ctx = { console, TextEncoder, TextDecoder, btoa, atob, URL, location: { href: "https://example.invalid/design.html" } };
ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ["js/fold.js", "js/codec.js"]) vm.runInContext(fs.readFileSync(path.join(dir, f), "utf8"), ctx, { filename: f });
const { FOLD, PA_CODEC: C } = ctx;
const input = (process.argv[2] || fs.readFileSync(0, "utf8")).trim();
const m = input.match(/(?:#d=|design:)([A-Za-z0-9_-]+)/) || input.match(/^([A-Za-z0-9_-]{20,})$/);
if (!m) { console.log("No design found in the input."); process.exit(1); }
const d = C.decode(m[1]), plane = C.toPlane(d), kind = C.kindOf(d.paper);
console.log(`${plane.name} (#${plane.code}) · ${plane.origin}`);
console.log(`Paper: ${kind} ${d.paper.w / 100} × ${d.paper.h / 100} in · outside: ${d.outside} · patterns: ${d.pattern} / inside ${d.inside}`);
if (d.blurb) console.log(`Story: ${d.blurb}`);
const ang = s => { const a = Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]) * 180 / Math.PI; const up = Math.abs(90 - ((a % 180) + 180) % 180); return Math.round(up * 10) / 10; };
d.steps.forEach((s, i) => console.log(`${String(i + 1).padStart(2)}. ${s.t}${s.a ? ` from (${s.a}) to (${s.b}) · ${ang(s)}° from straight up${s.sel ? " · top flap (" + s.sel + ")" : " · all layers"}` : ""}${s.txt ? ` · "${s.txt}"` : ""}`));
const BAD = /misses the top layer|no room for the step number|no room for the note|about box has no clear spot|has no clear spot \(it overlaps\)/;
const states = FOLD.run(plane), b = FOLD.bbox(states[states.length - 1]);
const moved = plane.steps.map((st, i) => st.type === "valley" || st.type === "mountain" ? JSON.stringify(states[i].facets.map(f => f.T)) === JSON.stringify(states[i + 1].facets.map(f => f.T)) && states[i].facets.length === states[i + 1].facets.length : false);
moved.forEach((same, i) => { if (same) console.log(`⚠️  step ${i + 1}: this fold does not move any paper`); });
for (const mode of ["verbose", "short", "minimal"]) {
  const r = FOLD.sheet(plane, { mode });
  const bad = r.report.filter(x => BAD.test(x)), notes = r.report.filter(x => !BAD.test(x));
  console.log(`${mode}: ${bad.length ? "❌ " + bad.join(" · ") : "✅ prints cleanly"}${notes.length && mode === "verbose" ? "  (notes: " + notes.join(" · ") + ")" : ""}`);
}
console.log(`Finished model: ${Math.round(b.x1 - b.x0) / 100} × ${Math.round(b.y1 - b.y0) / 100} in (sheet ${d.paper.w / 100} × ${d.paper.h / 100}).`);
