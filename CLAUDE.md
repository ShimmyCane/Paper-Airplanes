# Paper Airplanes — Claude Code pointer

Purpose: fold-on-the-line paper airplane sheets for Felix. Print true to scale (100%), two-sided; the printed lines are the folds, placed where each crease falls on the paper at that step, so following the numbers turns the sheet into the plane. Classic planes first; a research page on how planes fly. An in-person activity: a simulator is far, far later.

- Design: `schematic.md` · Process: `process.md` · Quality check: `qc.md` · Goals: `todo.md`
- Research: `research/index.html` and `research/topics.md`
- Q&A history: `convo/` (never compact; start a new version instead)
- AI notes: `04 AI/brief.md` and `04 AI/lessons.md`
- Shared conventions: the Index repo's root `CLAUDE.md` (public repo, privacy) and its `02 Refs/Skills/`

How to run: open `index.html` (works from the file or GitHub Pages). One plane: `plane.html?code=PA-01`.
Check: `node tools/check_planes.js` (every fold line lands on the top layer, every step has its number, the about box, title and scale fit, in all three instruction modes; fingerprints; `--update` only when a change is intended).

Rules:
- Origami notation: valley (in) = dashed + filled arrowhead; mountain (out) = dash-dot + hollow arrowhead; edges solid.
- Print at 100% (actual size), two-sided. Every sheet has a 2-inch / 5-cm scale check; ⚙️ has the back alignment test.
- A plane is a list of steps in `data/planes.js`; `js/fold.js` folds it and draws the sheet. A plane is `approved: true` only when Claude has read real flight notes (`pa_flights` or the device) and it flew well; until then it's a preview.
- Every plane has `origin` and `blurb`: proper attribution and a short story, a couple of years above Felix's reading level. Living designers are fine with attribution.
- Felix's first name only; no age, school or photos. Photos of real folds go in `private/` (ignored).
- Supabase: Family project, app `paper-airplanes`, table `pa_flights` (`supabase/001_flights.sql`, pasted by Jimmy). The pages work fully without it.
- Self-contained folder, so it can become its own repo later.
