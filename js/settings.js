/* Paper Airplanes settings (⚙️), kept on this device:
   instructions (verbose · short · minimal), outside decoration (bold · faint · none), printer flip (long · short edge),
   back alignment (X, Y in mm, from the alignment test sheet), and which planes to show (all as previews, or approved only).
   Also the flight notes form for the plane on screen. */
(function (root) {
  "use strict";
  const KEY = "pa.settings";
  const DEF = { mode: "verbose", deco: "bold", flip: "long", ox: 0, oy: 0, show: "all" };
  const get = () => Object.assign({}, DEF, root.APP.store.get(KEY, {}));
  const set = patch => { root.APP.store.set(KEY, Object.assign(get(), patch)); if (api.onChange) api.onChange(get()); };
  const sheetOpts = () => { const s = get(); return { mode: s.mode, deco: s.deco, flip: s.flip, offset: { x: s.ox, y: s.oy } }; };
  const planes = () => (root.PA_PLANES || []).filter(p => !p.retired && (get().show === "all" || p.approved));
  const find = code => (root.PA_PLANES || []).find(p => p.code === String(code || "").toUpperCase()) || null;
  const seg = (name, opts, cur) => `<div class="row seg" data-set="${name}">${opts.map(([v, t]) => `<button class="tag${v === cur ? " on" : ""}" data-v="${v}" type="button">${t}</button>`).join("")}</div>`;

  function drawerHtml(extra = "") {
    const s = get();
    return `${extra}
      <h3>Instructions on the sheet</h3>${seg("mode", [["verbose", "Lots of words"], ["short", "Number + in/out"], ["minimal", "Numbers only"]], s.mode)}
      <h3>Outside decoration</h3>
      <select class="field" id="decoSel" style="width:100%"><option value="bold"${s.deco === "bold" ? " selected" : ""}>Bold pattern</option><option value="faint"${s.deco === "faint" ? " selected" : ""}>Faint (80% see-through)</option><option value="none"${s.deco === "none" ? " selected" : ""}>None</option></select>
      <h3>Printer flips on the…</h3>${seg("flip", [["long", "Long edge"], ["short", "Short edge"]], s.flip)}
      <h3>Back alignment</h3>
      <p><small>Now X <b id="oxNow">${s.ox}</b> mm, Y <b id="oyNow">${s.oy}</b> mm. Print the test, hold it to a window, read where the thick back cross sits.</small></p>
      <div class="row"><button class="btn" id="testPrint" type="button">🧪 Print alignment test</button></div>
      <div class="row" style="margin-top:6px"><input class="field" id="rx" type="number" step="0.5" placeholder="X mm" style="width:96px"><input class="field" id="ry" type="number" step="0.5" placeholder="Y mm" style="width:96px"><button class="btn mint" id="addReading" type="button">Add reading</button><button class="btn" id="zero" type="button">Reset</button></div>
      <h3>Planes to show</h3>${seg("show", [["all", "All (previews)"], ["approved", "Approved only"]], s.show)}`;
  }
  function wire() {
    document.querySelectorAll(".seg").forEach(g => g.addEventListener("click", e => {
      const b = e.target.closest("[data-v]"); if (!b) return;
      set({ [g.dataset.set]: b.dataset.v });
      g.querySelectorAll("[data-v]").forEach(x => x.classList.toggle("on", x === b));
    }));
    const d = document.getElementById("decoSel"); if (d) d.addEventListener("change", () => set({ deco: d.value }));
    const tp = document.getElementById("testPrint"); if (tp) tp.addEventListener("click", () => { const s = get(); root.APP.printPages(root.FOLD.testSheet({ offset: { x: s.ox, y: s.oy }, flip: s.flip }), { duplex: true, flip: s.flip }); });
    const add = document.getElementById("addReading"); if (add) add.addEventListener("click", () => {
      const rx = parseFloat(document.getElementById("rx").value) || 0, ry = parseFloat(document.getElementById("ry").value) || 0, s = get();
      set({ ox: Math.round((s.ox + rx) * 10) / 10, oy: Math.round((s.oy + ry) * 10) / 10 });
      document.getElementById("oxNow").textContent = get().ox; document.getElementById("oyNow").textContent = get().oy;
      document.getElementById("rx").value = ""; document.getElementById("ry").value = "";
    });
    const z = document.getElementById("zero"); if (z) z.addEventListener("click", () => { set({ ox: 0, oy: 0 }); document.getElementById("oxNow").textContent = 0; document.getElementById("oyNow").textContent = 0; });
  }
  // print a list of planes: front, back, front, back … (backs aligned and, for short-edge printers, turned)
  function printPlanes(list, copies = 1) {
    const o = sheetOpts(), pages = [];
    list.forEach(p => { const pg = root.FOLD.sheet(p, o).pages; for (let c = 0; c < copies; c++) pages.push(...pg); root.APP.addReview({ code: p.code, kind: "printed", note: copies + (copies === 1 ? " copy" : " copies") }); });
    root.APP.printPages(pages, { duplex: true, flip: o.flip });
  }
  const api = { get, set, sheetOpts, planes, find, drawerHtml, wire, printPlanes, onChange: null };
  root.PA = api;
})(window);
