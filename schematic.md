# Paper Airplanes — Schematic

**Round 3 (ground up), 2026-11-12:** the first app is archived as **V1** (`v1/`, linked from ⚙️). The new home has four modules: **Build** (`build.html`, today's model cards), **Fly** (`fly.html`, placeholder), **Design** (`design.html`, placeholder), **Photo booth** (`photo.html`, placeholder). Plans and open questions: `convo/convo v0.3.md`. The sections below describe V1 unless marked.

### Design (built, round 3)

- **Board** (`design.html`, `js/board.js`): the paper as it looks now. Tap two points to draw the next fold; dots snap to corners and edge middles, and the line clicks to exact angles every 7.5° (45° corner folds, the 22.5° dart nose). Toggles: valley · mountain · fold & open; all layers · top flap (the paper that last moved together, on top); other side moves (the smaller side moves by default; it shows pink). Buttons: add fold, turn over, add a note, undo, clear line.
- **Steps** list with pictures; the words are editable and print on the sheet.
- **Paper**: Letter · Square · Custom (inches). Smaller sheets print on letter with a cut line.
- **Name and look**: name, designed by (first name), short story, outside side, outside and inside patterns.
- **Sheet**: live front/back preview, problems listed, 🖨️ print the plane (red), 📄 print instructions (blue), 💾 save on this device, 🔗 share link.
- **Share** (`share.html#d=…`, `js/codec.js`): the link holds the whole design (about 500 characters for a dart). The page shows the story, the sheet, the steps, both print buttons and "copy into Design". No database.
- **Engine** (`js/fold.js`): a plane may give `paper: { w, h }`; labels, title and blurb stay on the paper; `insidePattern`; clip and pattern ids are unique per plane (several planes on one print keep their own patterns: this was a V1 bug).
- **Verified:** the Classic Dart drawn on the board prints the same fold lines as the hand-written one (within 0.8 hundredths of an inch; one centre line splits at a flap edge differently, the same crease). Real mouse and touch taps give an exact 45° fold.
- **3D view** (`js/view3d.js`; 🧊 on the Design board and on each plane page): the fold slider folds the paper step by step (a flap swings over its line; turn over spins the model; fold & open goes and comes back). The Open slider tugs the last two folds open (the wings) when their flaps share no paper. Drag to turn, pinch or wheel to zoom; plays twice, then waits for ▶. Checked: at the end of every fold the swinging flap lands within 0.13/100 in of the flat model.
- **To the database:** 💾 Save also records an open `flag` in `pa_flights` (code = the design's code, `reason` = `design:` + the link code) once signed in; a note from ⚙️ does the same (code = item~id, with the design on the Design page). Read one with `node tools/design_report.js "<reason or link>"`. No schema change.
- **⚙️ groups** (every page): ✈️ Flight notes (plane page, open there) · 🖨️ Printer and alignment · 📄 Sheets and planes · 📝 Notes for improvement · 🧭 Pages · ☁️ Database (Show errors last) · ℹ️ Version. Each collapses; open/closed is kept on the device (`pa.drawerOpen`).
- **Removing steps** (Design): two turns that cancel out (only notes between) → "Remove both"; a note or a fold-and-open → 🗑️. These never move the paper, so later folds stay exactly where they were; later top-flap choices are renumbered. Checked: a dart with a double turn, after "Remove both", prints the same sheet as the dart built without it.
- **Not yet:** folds defined as "edge onto a line" (the board uses two dots); random variations; the board does not check that a fold is physically possible beyond "it moves paper".

**Track:** A. Family play. The printed sheet is the product; the pages pick, print and record flights.
**Status:** Round 3 (v0.3.0) — seven planes as previews (none approved); Classic Dart has test versions. Not folded or flown yet.
**Platform:** plain HTML/CSS/JS, no build, GitHub Pages (inside Felix-Maze). Letter portrait, printed at 100%, two-sided.
**Conversation:** `convo/convo v0.1.md` (answered), `convo/convo v0.2.md` (open). Round 3 was a direct request (alignment, test versions, print), not a convo round.

## Purpose

Teach Felix to fold a good plane by himself, with precision, together with Jimmy. The sheet is the paper you fold: each crease is printed exactly where it falls, numbered in order, with an arrow and "in" or "out". Flying is the reward; careful folding is the lesson.

## How the sheet is made (`js/fold.js`)

- The paper is a set of flat pieces. Each knows where it is on the flat sheet, how it has been moved (turned or flipped) in the folded model, and how high it lies in the stack.
- A step folds the chosen layers on one side of a line onto the other side (valley: on top; mountain: behind), or turns the model over.
- Before each fold the engine finds where the line crosses the **top visible layer**, maps that piece back to the flat sheet, and prints it on the side that is facing up then: the front, or the back (mirrored, as a two-sided print lands).
- **Test versions:** a plane may list groups of A/B steps (`variants` in `data/planes.js`). The sheet prints a **test code** (the A/B bits, a 4-digit hash of the folded steps, what each group is set to) at the top of the front, in the title box. Classic Dart: nose (steps 4 and 5), top wing (7), bottom wing (9).
- Labels (number, "in"/"out", a sentence in verbose mode) and arrows are drawn in the view at that step, so they read upright while folding. They avoid every fold line, each other, the title, the scale check and the about box.
- The about box (name, origin, short story, "Pilot ____ Flight # __") goes on the outside of the plane, over the decoration.

## The sheet

- Letter 8.5 × 11 in, 1/100 inch units; nothing within ¼ in of the edge (printers can't print there).
- **Notation:** valley = dashed, mountain = dash-dot, crease-and-open = dashed with a double arrow, edge = solid. Filled arrowhead = toward you, hollow = away. Black circle = step number.
- **Scale check:** a 2-inch ruler (with a 5-cm scale). Title "Paper Airplanes #PA-01 / Classic Dart".
- **Decoration:** a light pattern on the outside side (bold, faint = 80% see-through, or none).

## Planes (all previews)

| Code | Plane | Steps | Level |
|---|---|---|---|
| PA-01 | Classic Dart | 10 | ● |
| PA-02 | Wide-wing Glider | 9 | ● |
| PA-03 | Square Glider | 8 | ● |
| PA-04 | Bulldog Dart | 11 | ●● |
| PA-05 | Nose-lock Plane | 12 | ●● |
| PA-06 | Loop Plane (elevator flaps) | 12 | ●● |
| PA-07 | Tube Glider | 5 | ●● |

The canard is on hold: a true canard needs a cut or a second piece of paper (convo v0.2).

## Pages

| Page | What it does |
|---|---|
| `index.html` | Planes as cards (the finished model, preview or ✅ approved), notation key |
| `plane.html?code=PA-01` | Front and back of the sheet, the steps as pictures, 🖨️ print (100%, two-sided), flights table; ⚙️ flight notes |
| `pack.html` | Several planes, copies (test versions as chosen) |
| `research/index.html` | Reading a fold sheet, four forces, balance point, trim table, history |

## ⚙️ Settings (every page)

Instructions (lots of words · number + in/out · numbers only) · outside decoration · printer flip · **back alignment** (five readings at 0.1 mm, see below) · planes to show (all previews · approved only) · **notes for improvement** (saved with the page, plane, test code and version) · database sign-in, sync, check · show errors · **version log** at the very bottom. On a plane's page: test versions (A/B per group, with the test code), copies, flight notes (the test code is put in front of each note).

## Back alignment (vernier, shift and skew)

The 🧪 test is two pages. At each of five spots (middle and four corners) there is an across row and a down column, each a **vernier**: the front has marks 1.0 mm apart (numbered −8…8), the back has marks 0.9 mm apart (numbered −5…4). Hold the test to a window. For each row and column, find the back mark that lines up exactly with a front mark. Type the front number and the back number. The offset is front − 0.9 × back, in 0.1 mm steps (for example front 3, back 3 = +0.3 mm).

Twenty numbers, a live readout per spot, then **Save readings**. The app fits one shift (across, down) and one turn (skew) to the five spots and adds them to what is saved. It reports what is left over; over 0.2 mm means one pair was misread. Printing again should show **0 and 0** everywhere.

Every 0.1 mm offset within ±3 mm has exactly one coinciding pair (checked). Marks are 0.2 mm lines at 1 mm or more, so they print. Labels are about 5 pt. The back numbers are drawn mirrored so they read correctly through the sheet.

The back's move is the same for long-edge and short-edge printers (the printer turns a short-edge back 180°, which mirrors it the same way). Derived from the geometry and checked in `tools/check_planes.js`, **not yet checked on paper**. Errors beyond ±3 mm are outside the vernier: correct by hand first (the ruler on the sheet gives the rough size).

## Printing

Only the sheets print: the page's steps and menus are hidden in print, so the print is one or more Letter pages (front, back, front, back…). Copies are a choice on the plane page and on Print several. Margins: none, at 100%.

## Later

A simple glide simulator, far later, only if wanted. This is an in-person activity.
