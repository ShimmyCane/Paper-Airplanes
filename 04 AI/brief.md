# Paper Airplanes — brief (for Claude)

**What it is:** fold-on-the-line paper airplane sheets (Letter, 100%, two-sided). `js/fold.js` simulates the folds and prints each crease where it falls on the top layer at that step, on the front or the back. Folder `paper-airplanes/` inside Felix-Maze, self-contained.

**State (2026-11-10, round 3, v0.3.0):**
- 7 planes in `data/planes.js`, all previews. Classic Dart (PA-01) has three test-version groups: nose (steps 4–5), top wing (7), bottom wing (9): 8 combinations, each with a test code printed at the top of the front (`Test code PA-01 · 100 · #3811`).
- ⚙️: back alignment is five readings (middle + four corners) at 0.1 mm → one shift and one turn (skew), saved with a log. Notes for improvement (device, with page, plane, test code, version). Version log at the bottom.
- Printing: only the sheets print (`body > *:not(#printArea)` hidden in print), with copies on the plane page and Print several.
- `tools/check_planes.js` checks all 14 versions in all three modes, the alignment geometry, a five-reading round trip, and reports any fallback placement that overlaps.
- Smoke-tested in headless Chromium at 390 px and 1180 px: no JS errors, no horizontal scroll, print area = the sheets, PDF page count = sheets.

**Decisions:** origami notation (valley dashed, mountain dash-dot); alignment by five readings to 0.1 mm with a turn; one rule for long and short edge (derived, not yet on paper); test versions as A/B patches keyed by printed step; the test code is a bit string plus a short hash of the folded steps; decoration as a dropdown; approval by Claude from flight notes; simulator far later; canard on hold (needs a cut).

**Not verified:** no real fold, print or flight yet. The alignment is derived from the geometry and round-tripped in code; the short-edge sign was corrected from the earlier code by that derivation and needs a real test. 0.1 mm is about the printer's limit.

**Database:** `pa_flights` is live in the Family project (verified 2026-11-10). Flights carry the test code in their note text (no new column).
