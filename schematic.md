# Paper Airplanes — Schematic

**Track:** A. Family play. The printed sheet is the product; the pages pick, print and record flights.
**Status:** Round 2 — seven planes built as previews (none approved). Not folded or flown yet.
**Platform:** plain HTML/CSS/JS, no build, GitHub Pages (inside Felix-Maze). Letter portrait, printed at 100%, two-sided.
**Conversation:** `convo/convo v0.1.md` (answered), `convo/convo v0.2.md` (open)

## Purpose

Teach Felix to fold a good plane by himself, with precision, together with Jimmy. The sheet is the paper you fold: each crease is printed exactly where it falls, numbered in order, with an arrow and "in" or "out". Flying is the reward; careful folding is the lesson.

## How the sheet is made (`js/fold.js`)

- The paper is a set of flat pieces. Each knows where it is on the flat sheet, how it has been moved (turned or flipped) in the folded model, and how high it lies in the stack.
- A step folds the chosen layers on one side of a line onto the other side (valley: on top; mountain: behind), or turns the model over.
- Before each fold the engine finds where the line crosses the **top visible layer**, maps that piece back to the flat sheet, and prints it on the side that is facing up then: the front, or the back (mirrored, as a two-sided print lands).
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
| `pack.html` | Several planes, copies |
| `research/index.html` | Reading a fold sheet, four forces, balance point, trim table, history |

## ⚙️ Settings (every page)

Instructions (lots of words · number + in/out · numbers only) · outside decoration (dropdown) · printer flips on long / short edge · **back alignment** (🧪 test sheet; add the X/Y reading in mm; the backs are shifted to match) · planes to show (all previews · approved only) · database sign-in, sync, check · show errors. On a plane's page: flight notes (feet, seconds, how it flew, how easy to fold, notes).

## Back alignment

The test sheet has millimetre scales at the middle and four corners on the front, and thick crosses at the same spots on the back. Hold it to a window: where the back cross sits on the front scale is the shift (right = +X, down = +Y). Add the reading in ⚙️; the backs are moved by the opposite amount, and printing the test again should read 0, 0. Short-edge printers are handled by turning the back pages.

## Data

Supabase **Family** project, app `paper-airplanes`, table `pa_flights` (flight, printed, flag). `supabase/001_flights.sql` + rolled-back test, **pasted by Jimmy**. Flights are kept on the device first and synced when signed in. Approval stays in `data/planes.js`, set by Claude.

## Later

A simple glide simulator, far later, only if wanted. This is an in-person activity.
