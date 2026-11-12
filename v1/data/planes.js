/* Paper Airplanes: the planes. Each is a list of steps on a Letter sheet (850 × 1100, 1/100 inch, portrait,
   printed side up, top edge = the nose end). Lines are given in the view at that step (after earlier folds).
   type: crease (fold and open) · valley (fold toward you, "in") · mountain (fold away, "out") · turn (turn over,
   left to right) · open (a note on top, e.g. "open the wings"). move: a point on the side that moves.
   select: { has: "s6" } = only paper moved in step 6; { not: "s6" } = only paper NOT moved in step 6.
   Steps get ids s1, s2 … in order. approved: set by Claude only after a real fold-and-fly test (see todo.md).
   origin + blurb: who made it or where it comes from, told a couple of years above Felix's reading level. */
(function (root) {
  const D = [-0.38268, 0.92388];                 // the second "edge to the middle" fold on a dart, from the nose
  const v = x => [[x, -200], [x, 1300]], h = y => [[-200, y], [1050, y]];
  const from = (A, d) => [A, [A[0] + d[0] * 1400, A[1] + d[1] * 1400]];
  const line = (A, B) => [A, B];
  const corners = [
    { type: "valley", line: line([425, 0], [0, 425]), move: [5, 5], text: "Fold the top corner down to the middle line." },
    { type: "valley", line: line([425, 0], [850, 425]), move: [845, 5], text: "Same on this side: corner to the middle line." }
  ];
  const middle = { type: "crease", line: v(425), move: [100, 600], text: "Fold in half the long way, press, then open it again." };
  // Test versions for the Classic Dart: small changes to the folds that decide how it flies. "A" is the sheet as drawn,
  // "B" the variant. Each group changes the steps named in its patch (printed step numbers). Fly one version at a time,
  // then tell Claude the test code printed at the bottom of the sheet.
  const D20 = [-Math.sin(Math.PI / 9), Math.cos(Math.PI / 9)];          // 20° from straight up (as drawn: 22.5°)
  const DART_VARIANTS = [
    { name: "nose", title: "Nose angle · steps 4 and 5", A: { label: "22.5°", patch: {} },
      B: { label: "20°", patch: { 4: { line: from([425, 0], D20) }, 5: { line: from([425, 0], [-D20[0], D20[1]]) } } } },
    { name: "top wing", title: "Top wing · step 7", A: { label: "as drawn", patch: {} },
      B: { label: "a little narrower", patch: { 7: { line: line([445, 0], [535, 1100]) } } } },
    { name: "bottom wing", title: "Bottom wing · step 9", A: { label: "as drawn", patch: {} },
      B: { label: "a little narrower", patch: { 9: { line: line([405, 0], [315, 1100]) } } } }
  ];
  root.PA_PLANES = [
    {
      code: "PA-01", name: "Classic Dart", level: 1, approved: false, outside: "back", pattern: "chevrons",
      origin: "traditional", blurb: "Traditional design. Nobody knows who folded the first dart: children have folded them for over a hundred years. The narrow body and pointy nose slice through the air, so it flies fast and straight.",
      blurbAt: [480, 560], variants: DART_VARIANTS, steps: [
        middle, ...corners,
        { type: "valley", line: from([425, 0], D), move: [20, 600], text: "Fold the slanted edge to the middle line." },
        { type: "valley", line: from([425, 0], [-D[0], D[1]]), move: [830, 600], text: "Same on this side." },
        { type: "valley", line: v(425), move: [100, 600], text: "Fold in half: left side over onto the right." },
        { type: "valley", line: line([445, 0], [545, 1100]), move: [800, 900], select: { has: "s6" }, text: "Fold the top wing over, along the line." },
        { type: "turn" },
        { type: "valley", line: line([405, 0], [305, 1100]), move: [50, 900], select: { not: "s6" }, text: "Fold this wing over to match." },
        { type: "open", text: "Open the wings out flat. Throw it hard and straight." }
      ]
    },
    {
      code: "PA-02", name: "Wide-wing Glider", level: 1, approved: false, outside: "back", pattern: "clouds",
      origin: "traditional", blurb: "Traditional design. Big wings push down on more air, so this plane floats instead of zooming. Gliders like this taught people how flying works long before planes had engines.",
      blurbAt: [480, 620], steps: [
        middle, ...corners,
        { type: "valley", line: h(300), move: [425, 40], text: "Fold the point down along the line." },
        { type: "valley", line: v(425), move: [100, 700], text: "Fold in half: left side over onto the right." },
        { type: "valley", line: v(470), move: [800, 800], select: { has: "s5" }, text: "Fold the top wing over, close to the middle." },
        { type: "turn" },
        { type: "valley", line: v(380), move: [50, 800], select: { not: "s5" }, text: "Fold this wing over to match." },
        { type: "open", text: "Open the wings flat and bend the tips up a little. Throw gently." }
      ]
    },
    {
      code: "PA-03", name: "Square Glider", level: 1, approved: false, outside: "back", pattern: "stars",
      origin: "traditional", blurb: "Traditional design. The rolled-up front edge puts weight at the nose, which keeps the plane from tipping back. Real planes need the same thing: the balance point just behind the front.",
      blurbAt: [460, 640], steps: [
        middle,
        { type: "valley", line: h(150), move: [425, 40], text: "Fold the top edge down along the line." },
        { type: "valley", line: h(300), move: [425, 200], text: "Fold it down again. Press hard." },
        { type: "valley", line: v(425), move: [100, 700], text: "Fold in half: left side over onto the right." },
        { type: "valley", line: v(505), move: [800, 800], select: { has: "s4" }, text: "Fold the top wing over along the line." },
        { type: "turn" },
        { type: "valley", line: v(345), move: [50, 800], select: { not: "s4" }, text: "Fold this wing over to match." },
        { type: "open", text: "Open the wings flat. A slow, gentle throw." }
      ]
    },
    {
      code: "PA-04", name: "Bulldog Dart", level: 2, approved: false, outside: "back", pattern: "chevrons",
      origin: "traditional", blurb: "Traditional design. A dart with its point tucked in. The blunt nose is tougher when it lands, and the extra paper up front helps it fly straight.",
      blurbAt: [480, 620], steps: [
        middle, ...corners,
        { type: "valley", line: h(200), move: [425, 40], text: "Fold the point down along the line." },
        { type: "valley", line: from([425, 0], D), move: [20, 700], text: "Fold the slanted edge to the middle line." },
        { type: "valley", line: from([425, 0], [-D[0], D[1]]), move: [830, 700], text: "Same on this side." },
        { type: "valley", line: v(425), move: [100, 700], text: "Fold in half: left side over onto the right." },
        { type: "valley", line: line([450, 200], [540, 1100]), move: [800, 900], select: { has: "s7" }, text: "Fold the top wing over, along the line." },
        { type: "turn" },
        { type: "valley", line: line([400, 200], [310, 1100]), move: [50, 900], select: { not: "s7" }, text: "Fold this wing over to match." },
        { type: "open", text: "Open the wings flat. Throw it straight ahead." }
      ]
    },
    {
      code: "PA-05", name: "Nose-lock Plane", level: 2, approved: false, outside: "front", pattern: "stars",
      origin: "traditional, also called the Nakamura lock", blurb: "Traditional design. A small flap locks the folds shut, so the plane keeps its shape for many flights. Planes like this are often named after Eiji Nakamura, a Japanese paper-plane designer.",
      blurbAt: [60, 560], steps: [
        middle, ...corners,
        { type: "valley", line: h(425), move: [425, 60], text: "Fold the point down along the line." },
        { type: "valley", line: null, from: [[0, 425], [425, 700]], move: [8, 430], text: "Fold this corner so it meets the dot near the middle." },
        { type: "valley", line: null, from: [[850, 425], [425, 700]], move: [842, 430], text: "Same on this side: corner to the middle." },
        { type: "valley", line: h(760), move: [425, 830], select: { has: "s4" }, text: "Fold the little point up over the corners: it locks them." },
        { type: "mountain", line: v(425), move: [100, 800], text: "Fold in half away from you: left side goes behind." },
        { type: "valley", line: line([470, 425], [540, 1100]), move: [800, 950], select: { not: "s8" }, text: "Fold the top wing over, along the line." },
        { type: "turn" },
        { type: "valley", line: line([380, 425], [310, 1100]), move: [50, 950], select: { has: "s8" }, text: "Fold this wing over to match." },
        { type: "open", text: "Open the wings flat. Smooth, gentle throw: it glides far." }
      ]
    },
    {
      code: "PA-06", name: "Loop Plane", level: 2, approved: false, outside: "back", pattern: "clouds",
      origin: "traditional", blurb: "Traditional design. Bend the back edges up and the air pushes the tail down, so the nose lifts and the plane loops. Real planes use flaps like these, called elevators.",
      blurbAt: [470, 520], steps: [
        middle, ...corners,
        { type: "valley", line: from([425, 0], D), move: [20, 600], text: "Fold the slanted edge to the middle line." },
        { type: "valley", line: from([425, 0], [-D[0], D[1]]), move: [830, 600], text: "Same on this side." },
        { type: "valley", line: v(425), move: [100, 600], text: "Fold in half: left side over onto the right." },
        { type: "valley", line: line([440, 0], [500, 1100]), move: [800, 900], select: { has: "s6" }, text: "Fold the top wing over, along the line." },
        { type: "crease", line: h(1035), move: [300, 1090], select: { has: "s7" }, text: "Fold the back edge of the wing up, then open: a flap." },
        { type: "turn" },
        { type: "valley", line: line([410, 0], [350, 1100]), move: [50, 900], select: { not: "s6" }, text: "Fold this wing over to match." },
        { type: "crease", line: h(1035), move: [500, 1090], select: { has: "s10" }, text: "Make a flap on this wing too." },
        { type: "open", text: "Open the wings. Bend both flaps up a little. Throw it up: it loops!" }
      ]
    },
    {
      code: "PA-07", name: "Tube Glider", level: 2, approved: false, outside: "front", pattern: "stripes",
      origin: "traditional", blurb: "Traditional design. It doesn't look like a plane at all, but a ring flies! Engineers have tested ring-shaped wings on real aircraft. The heavy band at the front keeps it steady.",
      blurbAt: [440, 420], steps: [
        { type: "valley", line: v(283), move: [100, 500], text: "Fold the left side over, a third of the way." },
        { type: "valley", line: v(354), move: [300, 500], text: "Fold the folded edge over again." },
        { type: "valley", line: v(425), move: [380, 500], text: "And once more. This band is the front." },
        { type: "open", text: "Curl it into a tube, band outside. Slide the top end into the bottom end, about 1 inch (dotted box).", zone: [[[440, 20], [830, 20], [830, 120], [440, 120]]] },
        { type: "open", text: "Hold it with the band in front. Push it gently forward, like a dart." }
      ]
    }
  ];
  // a step can be given as "the crease that puts point A onto point B"
  root.PA_PLANES.forEach(p => { p.steps = p.steps.map(s => Object.assign({}, s)); });      // shared steps get their own copy per plane
  if (root.FOLD) root.PA_PLANES.forEach(p => p.steps.forEach(s => { if (!s.line && s.from) s.line = root.FOLD.bisector(s.from[0], s.from[1]); }));
})(typeof window !== "undefined" ? window : globalThis);
