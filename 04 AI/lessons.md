# Paper Airplanes — lessons

## 2026-11-09 (round 1)

- Schematic and questions first; Jimmy asked to walk through one round before the build.

## 2026-11-09 (round 2)

- **Simulate the folding, don't hand-place lines.** A crease after earlier folds lands on a different spot of the flat sheet (and often on the back); a flat-fold model of facets with affine maps and a layer order finds it exactly.
- **Place everything in two passes:** all fold lines first, then labels and arrows that avoid every line and each other, then the about box, then the title and scale check. Placing the title first crowded out the labels.
- **Check by step number, not by guess:** two planes selected the wrong step's layers (`s9` instead of `s8`); a "line misses the top layer" check caught one, the pictures the other.
- **The art rule is attribution** (Jimmy, 2026-11-09), applied across the repo.

## 2026-11-10 (round 3: alignment, test versions, print)

- **Print only the thing: whitelist it.** Hiding the menu and the steps one by one let the steps print. In print media, hide everything except the print area (`body > *:not(#printArea)`). _(Paper Airplanes; the Index settings-gear rule that the gear and drawer hide in print)_
- **Derive the sign from the geometry, and check it in code.** The old short-edge branch moved the back the opposite way to the long edge. One rule now: the back shifts by −align seen from the front, for both flips, with the printer's 180° turn (a matrix checked against the spot positions). Physical verification still pending. _(Paper Airplanes)_
- **Five readings, not one.** Fit one shift and one turn (least squares), report what is left over, and tell the user to read again when it is over 0.2 mm, instead of averaging a misread away. Round-tripped with a known error in the checker. _(Paper Airplanes)_
- **A measuring tool is limited by the printer.** Hairlines narrower than their spacing merge into a block; 0.1 mm is about 2.4 dots at 600 dpi. Say what precision the result has. _(Jimmy's rule: show the limits with the result)_
- **Alternatives behind a switch, symmetric.** Keep the drawn version as A and add B for the same steps; a pair of steps changes together so the plane stays balanced. Let the user choose which one flew. _(Index lesson 14, "Keep a disliked mechanic" and "Balance mechanics symmetrically", applied to test versions)_
- **Put the version in the printed record.** A short code plus a hash of the folded steps on every sheet, and in every flight note, so a flight can be tied to the exact print. _(Index lesson 15, "Store the data version with saved state", and the Felix Maze fingerprints)_
- **Store settings with a shape check.** Per-plane A/B bits are dropped and reset when the number of groups changes. _(Index lesson 15)_
- **Never let a fallback overlap silently.** The title placement fell back to an overlapping spot and the checker still passed. A fallback is now a reported problem. Look at the rendered picture too: the front was crowded by the wing folds. _(Paper Airplanes)_
- **Feedback notes keep the tester's words.** Notes are saved with the page, the plane and the version; "Done" only sets the status. _(Index feedback_notes, 2026-11-04)_
- **Settings: one gear, version at the bottom.** Options, then notes, then the version log last, after Show errors. _(Index settings_gear §2, "Info: version, changelog at the very bottom")_

### Combined from the Index repo (2026-11-10)

Taken from `Index/04 AI/lessons_pool.md` §10 (settings), §Feedback, and §Print/Layout, and kept where they apply here: one gear everywhere; errors opt-in at the bottom; hide the gear in print; the test page at phone width; a feedback box that lives inside the panel that opens it; fingerprint published pieces so a later change is noticed; and check the whole page, not just the picture.
