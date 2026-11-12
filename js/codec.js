/* Paper Airplanes: a design (drawn on the Design page) as a plane the engine folds, and as a short link.
   A design: { name, by, blurb, outside: "front"|"back", pattern, inside, paper: { w, h }, steps: [...] }.
   A step: { t: "valley"|"mountain"|"crease"|"turn"|"open", a: [x, y], b: [x, y] (two dots on the fold line, in the view at
   that step), m: [x, y] (a point on the side that moves), sel: "s4" (only the top flap: the paper that last moved in step 4)
   or "", txt: the words on the sheet }.
   The link holds the whole design after "#d=", so it needs no database and works from a printout (the QR code). */
(function (root) {
  "use strict";
  const PAPERS = { letter: { w: 850, h: 1100 }, square: { w: 850, h: 850 } };
  const kindOf = p => (p.w === 850 && p.h === 1100 ? "letter" : p.w === 850 && p.h === 850 ? "square" : "custom");
  const TYPES = { valley: "v", mountain: "m", crease: "c", turn: "t", open: "o" }, BACK = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [v, k]));
  const r = n => Math.round(n);
  const blank = () => ({ name: "My plane", by: "", blurb: "", outside: "back", pattern: "chevrons", inside: "none", paper: Object.assign({}, PAPERS.letter), steps: [] });
  const DEFAULT_TEXT = { valley: "Fold along the line.", mountain: "Fold away, along the line.", crease: "Fold and open again.", open: "Open the wings flat. Throw gently." };

  // the plane the engine folds and prints
  function toPlane(d) {
    const code = "D-" + root.FOLD.hash4(encode(d));
    return {
      code, name: d.name || "My plane", level: 1, approved: false, outside: d.outside || "back", pattern: d.pattern || "chevrons",
      insidePattern: d.inside || "none", paper: d.paper || PAPERS.letter, design: true,
      origin: d.by ? "designed by " + d.by : "your own design",
      blurb: d.blurb || "A plane we designed ourselves. Fold it, fly it, and change one fold to see what happens.",
      steps: d.steps.map(s => s.t === "turn" ? { type: "turn" }
        : s.t === "open" ? { type: "open", text: s.txt || DEFAULT_TEXT.open }
        : Object.assign({ type: s.t, line: [s.a, s.b], move: s.m, text: s.txt || DEFAULT_TEXT[s.t] }, s.sel ? { select: { has: s.sel } } : {}))
    };
  }
  // the link: compact JSON, then base64 (URL-safe)
  function encode(d) {
    const c = { v: 1, n: d.name || "", y: d.by || "", l: d.blurb || "", o: d.outside === "front" ? "f" : "b", p: d.pattern || "", i: d.inside || "none",
      w: r(d.paper.w), h: r(d.paper.h),
      s: d.steps.map(s => s.t === "turn" ? ["t"] : s.t === "open" ? ["o", s.txt || ""] : [TYPES[s.t], r(s.a[0]), r(s.a[1]), r(s.b[0]), r(s.b[1]), r(s.m[0]), r(s.m[1]), s.sel || "", s.txt || ""]) };
    const bytes = new TextEncoder().encode(JSON.stringify(c));
    let bin = ""; bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function decode(str) {
    const b64 = String(str).replace(/-/g, "+").replace(/_/g, "/"), bin = atob(b64 + "===".slice((b64.length + 3) % 4));
    const c = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
    if (c.v !== 1 || !Array.isArray(c.s)) throw new Error("This link is not a Paper Airplanes design.");
    return { name: c.n, by: c.y, blurb: c.l, outside: c.o === "f" ? "front" : "back", pattern: c.p, inside: c.i || "none", paper: { w: +c.w || 850, h: +c.h || 1100 },
      steps: c.s.map(a => a[0] === "t" ? { t: "turn" } : a[0] === "o" ? { t: "open", txt: a[1] || "" }
        : { t: BACK[a[0]], a: [a[1], a[2]], b: [a[3], a[4]], m: [a[5], a[6]], sel: a[7] || "", txt: a[8] || "" }) };
  }
  const link = d => new URL("share.html", location.href).href.split("#")[0] + "#d=" + encode(d);
  root.PA_CODEC = { PAPERS, kindOf, blank, toPlane, encode, decode, link, DEFAULT_TEXT };
})(typeof window !== "undefined" ? window : globalThis);
