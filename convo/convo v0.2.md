# Paper Airplanes — convo v0.2

**Date:** 2026-11-09 · Round 2: built from the answers in `convo v0.1.md`.

## What was built

- **The sheet is the plane.** A folding model (`js/fold.js`) folds the paper step by step and prints each crease exactly where it falls on the top layer at that moment, on the front or the back. Seven planes, all previews (none approved).
- **Origami notation:** valley (in) = dashed with a filled arrowhead, mountain (out) = dash-dot with a hollow arrowhead, edges solid, step numbers in black circles.
- **⚙️ settings:** instructions (lots of words · number + in/out · numbers only), outside decoration dropdown (bold · faint 80% see-through · none), printer flip (long or short edge), **back alignment** (🧪 test sheet: hold it to a window, read the thick back cross on the millimetre scale, add the reading), planes to show (all as previews · approved only), and on each plane's page **flight notes** (distance, seconds, how it flew, how easy to fold, notes).
- **Database:** `supabase/001_flights.sql` + `test_001_flights_rollback.sql` for you to paste (table `pa_flights`). Until then flights stay on the device.
- **Attribution:** every plane has an about box on its outside (origin + a short story). The rule is now "attribution, not historical-only" across the whole maze repo (an `about` line on all 50 drawing sheets too).
- **Research page:** reading a fold sheet, the four forces, the balance point, a trim fix table, a little history.

## Questions (answer inline)

1. **The canard.** A real canard (a small wing in front) can't be folded from one sheet without a cut or a second piece of paper. One snip with scissors, a second small sheet taped on, or drop it for now?
   > 
2. **First test.** Which plane do you and Felix fold first? I'd start with the Classic Dart in "lots of words" mode, after the 🧪 alignment test.
   > 
3. **Approval bar.** When you've logged flights, I'll mark a plane ✅ approved when it has 3+ good flights (straight or the intended loop, about 15+ feet) and no flagged confusing step. Right numbers?
   > 
4. **Retired maze art.** Under the clarified rule, should the retired Kusama-inspired mazes come back (with an attribution blurb)? The maze generator still holds back `living: true` designs until you say.
   > 
5. **Index preferences.** `04 AI/Personal Preferences/jimmy_preferences.md` in the Index repo still says "historical artists only". Update it there too (that file applies to every project)?
   > 
