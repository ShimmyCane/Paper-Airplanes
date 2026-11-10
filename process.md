# Paper Airplanes — Process

1. **Write a plane** in `data/planes.js`: the steps in order. Lines are given in the view at that step (`v(x)` vertical, `h(y)` horizontal, `line(A, B)`, `from(A, direction)`, or `from: [P, Q]` = the crease that puts P onto Q). `move` = a point on the side that moves. `select: { has: "s6" }` folds only the layers moved in step 6 (a top wing). Give `origin` and `blurb`.
2. **Check:** `node tools/check_planes.js`. Every line must land on the top layer, every step must have its number, the about box, title and ruler must fit, in all three modes.
3. **Look:** open `plane.html?code=…`. The step pictures show the model after each fold; the red dashed line is the next fold.
4. **Fold it for real** from a print (verbose mode first). Write any step that confused you in the flight notes.
5. **Fly and log** 3+ flights in ⚙️ → Flight notes.
6. **Approve:** Claude reads the flights and sets `approved: true` when it folds cleanly and flies well (see `qc.md`).
