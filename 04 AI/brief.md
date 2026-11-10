# Paper Airplanes — brief (for Claude)

**What it is:** fold-on-the-line paper airplane sheets (Letter, 100%, two-sided). `js/fold.js` simulates the folds and prints each crease where it falls on the top layer at that step, on the front or the back. Folder `paper-airplanes/` inside Felix-Maze, self-contained.

**State (2026-11-09, round 2):**
- 7 planes in `data/planes.js`, all previews. `tools/check_planes.js` passes in verbose, short and minimal modes; fingerprints written. Some labels fall back to a shorter form where space is tight (the checker lists them).
- Pages: home, plane, pack, research. ⚙️ settings as in `schematic.md`. Smoke-tested offline.
- `pa_flights` SQL written; Jimmy pastes it. Approval stays in the data file.

**Decisions:** origami notation (valley dashed, mountain dash-dot); back alignment by a window-read test sheet and an X/Y offset; decoration as a dropdown; approval by Claude from flight notes; simulator far later; canard on hold (needs a cut).

**Not verified:** no real fold or flight yet. The geometry is checked by the engine, not by paper. The first real fold of each plane is the real test.

**Database (verified 2026-11-10):** `pa_flights` is live in the Family project. Rolled-back test returned the expected RESULT. Jimmy then pasted `001_flights.sql`. Checked: columns match the migration, RLS on, no anon grants, registry row present, no unregistered `pa_*` objects, 0 rows.
