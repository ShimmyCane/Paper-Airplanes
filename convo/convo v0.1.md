# Paper Airplanes — convo v0.1

**Date:** 2026-11-09 · Started with `/start-project` borrowed from the Index repo. Round 1 = schematic + questions; build after answers.

## What Jimmy asked

> Start a project for paper airplanes, more straightforward than the last two. No database: standalone files. We will test and approve every plane so we know how well each does. Start with the classic planes and a research folder on how airplanes work. Simulators are interesting, but teaching Felix to really fold a plane matters far more. Print true to scale, not fit to page, with dashed lines where it's folded in and solid lines where it's folded out, curved arrows, and a little "in" / "out" text, so following each step on the double-sided sheet folds and builds the plane. Precision folding is good for Felix.

## Draft

See `schematic.md`. The short version: the printed sheet is the paper you fold; numbered fold lines on both sides; a ruler bar proves it printed at 100%; eight classic planes; a test log saved as a file in the repo.

## Questions (answer inline)

1. **Paper size.** You wrote "4 1/2 × 11". Did you mean 8½ × 11 (US Letter)? Some planes start from a square or a half sheet; OK to have those start with a "fold and tear off" step?
   > American letter size.

2. **Where it lives.** Same as the last two: a `paper-airplanes/` folder inside Felix-Maze, linked from the Index Nursery and the Felix Maze home page? (That's where this draft is.)
   > Yes, for future breakout as a new independent repo.

3. **Line style for "out".** You suggested solid = folded out. Origami books use **dash-dot** for out (mountain) and keep solid for the paper's edge. Learning dash-dot means Felix can read any fold book later. Dash-dot, or solid as you said?
   > This is the type of input I really value from you and your ability to research. Yes, please implement typical standards.

4. **Which side shows what.** After "turn it over", the next lines are printed on the back. Two-sided printing can be off by a few millimetres. Is it OK if each sheet tells you to line folds up with corners and edges, and uses the printed lines as a guide? Or would you rather every line stays on the front (simpler printing, but some folds you'd have to find through the paper)?
   > That is the trickier part. Maybe a button in the settings that lets me dial it in, like a photo contact sheet or a zoom-and-focus sheet: print it, look at the printout under sunlight and identify the X/Y shift in millimetres.

5. **Instructions on the sheet or beside it.** Option A: everything on the fold sheet (step numbers, arrows, a tiny step strip along the edge). Option B: the fold sheet has only the numbered lines, and a separate instruction page (printed once, kept) shows each step with pictures. A is all-in-one; B keeps the plane clean so Felix can decorate it. Which?
   > Here's the innovation: it will be on the sheet directly itself.

6. **The starting planes.** Proposed: Classic Dart, Wide-wing Glider, Square Glider, Bulldog Dart, Nose-lock plane, Stunt/loop plane, Hoop glider, Canard. Add or drop any? Which one first?
   > Perfect. Felix and I will do this together.

7. **Named designs.** Some well-known planes were designed by people who are still living (for example the "Suzanne", which set a distance record). Your art rule is historical artists only. Apply the same rule to plane designs (traditional, unattributed designs only)?
   > My rule for artists didn't mean they had to be historical, but that there is proper attribution and a little description or blurb, so that while we do the activity we learn a bit more in depth about it, appropriate to his age group plus about two years so he reaches. Please update this lesson across all the projects inside maze.

8. **Words on the sheet.** Labels "in" and "out" next to each fold, plus a few words per step ("fold the corner to the middle line"). How many words do you want? Felix reads … just "in/out" and numbers, or a short sentence per step?
   > That should be a settings toggle to make it more or less wordy. The first time we print we'd use verbose mode, later minimum instructions to keep it clean.

9. **Testing.** Proposed test card per fold: who folded, minutes to fold, 3–5 throws (distance in steps or feet, time in the air, straight / curve / loop), notes, a tweak. Typed on a page, saved on the device, downloaded as a file and committed. Is that the right amount, and is "download a file, then I commit it" fine since there's no database?
   > I like the test card idea. I realize that would mean we need the database linked here; maybe flag it for future development.

10. **Approval.** A plane is ✅ approved when it's been folded from the printed sheet and flown well 3 times with no confusing step. Right bar? Who decides, you or Felix?
   > For now, approved vs unapproved is changed by Claude. All of these will be previewable but not approved. Alternatively, let's just bite the bullet: set up the database, have the settings notes be where I leave trackers for each flight (distance, ease of use), and in settings have a toggle for unapproved vs approved.

11. **Decorating.** The plane's outside could have a light pattern or a spot for Felix's name and a plane number, printed where it ends up on the outside. Want that, or plain?
   > I disagree: it's absolutely OK to have graphics on both sides. With the non-verbose (simplified) pattern the outside can be without, or a very faint 80% transparent print. So in settings, not a toggle but a dropdown with options.

12. **Simulator.** Leave it for later, or a small research page that shows a glide path when you change the balance point?
   > Definitely leave it for far, far later. This is to be an in-person game as much as possible.

13. **⚙️.** A settings gear with the printer check (alignment test sheet), a "show errors" switch and a notes box, like the other apps?
   > Yes, absolutely.
