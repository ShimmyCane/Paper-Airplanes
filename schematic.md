# Paper Airplanes — Schematic

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

## Back alignment (five readings, skew)

The 🧪 test is two pages. Front: a scale at each of five spots (middle, four corners), 0.1 mm ticks over ±3 mm. Back: a fine ring and cross at each spot, moved by the saved alignment. Hold it to a window and read each back cross against its scale: right or down = +, left or up = −, to 0.1 mm. Type the ten numbers and **Save readings**.

The app fits one shift (across, down) and one turn (skew, in degrees) to the five readings, and adds them to what is saved. The log keeps each save. It reports what is left over after the correction: over 0.2 mm means one spot was misread, so read it again. Printing the test again should read 0.0 at all five spots.

The back's move is the same for long-edge and short-edge printers (the printer turns a short-edge back 180°, which mirrors it the same way). Derived from the geometry and checked in `tools/check_planes.js`, **not yet checked on paper**.

Precision limit: 0.1 mm is about the printer's dot pitch at 600 dpi. Expect the real result to be within a few tenths of a millimetre; the log shows what was saved.

## Data

Supabase **Family** project, app `paper-airplanes`, table `pa_flights` (flight, printed, flag). `supabase/001_flights.sql` + rolled-back test, **pasted by Jimmy**. Flights are kept on the device first and synced when signed in. Approval stays in `data/planes.js`, set by Claude.

## Printing

Only the sheets print: the page's steps and menus are hidden in print, so the print is one or more Letter pages (front, back, front, back…). Copies are a choice on the plane page and on Print several. Margins: none, at 100%.

## Later

A simple glide simulator, far later, only if wanted. This is an in-person activity.
