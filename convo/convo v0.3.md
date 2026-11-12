# Paper Airplanes — convo v0.3

**Date:** 2026-11-12 · Round 3 of the new direction (ground up). Answer inline, under each question.

## What is built now

- **V1 archive** in `v1/`: a frozen copy of the current app (the model cards, the plane pages, printing, alignment). Linked from ⚙️ as "📦 V1 archive".
- **Home** (`index.html`): four modules: 🛠️ Build, ✈️ Fly, ✏️ Design, 📸 Photo booth.
- **Build** (`build.html`): today's model cards. Open a plane → instructions, print, notes and ratings.
- **Fly**, **Design**, **Photo booth**: placeholder pages that describe the plan. Nothing else is built yet.

## Plan, in short

**Fly.** Teach what makes a paper plane fly, through a few models and small tweaks. Each tweak asks a question first ("what do you think a steeper fold does?"), then says what the plane does and why. Parts to cover: wings and their angle, nose weight, tail and elevators, fold size, the trim.

**Design.** A drawing board: pick a sheet (square, letter or a custom size), draw each fold as a line between two dots. Mountain or valley is chosen per line. Lines become the printed fold lines (the same engine as now). Then: number the steps (automatic from the order drawn), name the plane, write a blurb, pick outside and inside patterns, and print the sheet and the instruction pages. Later: small random variations of one fold, flown over time, to compare.

**Photo booth.** A fourth button on the home page. Take a photo or pick one, stamp a short line ("flying this day") on the lower left or right, and a small QR code in the other corner. The QR opens that plane's instructions.

## Questions for you

1. **Design: sheet sizes.** Which sizes first: square, letter, and one custom size? Should a custom sheet print on a regular sheet of paper, or only on a sheet you cut yourself?
   > One design sheets start with letter size. But they really should be three options.
2. **Design: how a drawn line becomes a fold.** When you draw a line between two dots, do you also choose the fold type there (mountain or valley), or do you draw it and set the type afterwards for each step?
   > Yes, I would select the folder type from a drop-down or a toggle
3. **Photo booth QR.** The QR can hold the whole plan inside its link (no database needed; it works offline and from a printout), or it can point to a saved record (needs the family database). I suggest the link holds the plan. OK?
   > Too OK agreed
   > The QR code should open up to the linked page which hold onto everything needed to build the airplane
4. **Fly: who is it for?** Only you and the kids, or should the Fly pages also be readable by other families later? (This decides how much words and pictures we use.)
   > It should be just me and the kids, but we can expand in the future in general as little text as possible

## What Claude took from the answers (2026-11-12)

1. Three sheets: **Letter** (default), **Square** and **Custom**. Square and custom print on letter paper with a cut line.
2. The fold type is a **toggle** on the board (valley · mountain · fold & open), picked before adding the fold.
3. The link holds the whole plane. The QR (photo booth, later) opens **share.html**, which shows everything needed to build it and prints the sheet and the instructions.
4. Fly is for you and the kids: pictures first, **as little text as possible**.
