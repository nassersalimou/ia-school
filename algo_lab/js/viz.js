/* Dessin SVG d'une étape de la trace : variables de l'appel en cours (à gauche) et structures du tas (à droite) :
   listes chaînées en cellules [valeur|•], arbres en nœuds reliés, piles et files dessinées dans la ligne de la variable. */
(function (root) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const ROW = 42, VARW = 210, GAP = 70;
  const CELL = { v: 44, p: 24, h: 30, gap: 34 };
  const TREE = { dx: 46, dy: 64, r: 19 };
  const COLORS = ["#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9", "#f08c00", "#0c8599", "#d6336c", "#5f3dc4"];

  const el = (tag, attrs = {}, text) => {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) e.setAttribute(k, v);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  const showPrim = (v) => {
    if (v === null) return "vide";
    if (v && v.undef) return "?";
    if (typeof v === "boolean") return v ? "vrai" : "faux";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
    if (typeof v === "string") return `"${v}"`;
    return "•";
  };
  const isRef = (v) => v && typeof v === "object" && "ref" in v;

  // Composantes (listes, arbres) placées dans l'ordre où les variables les désignent.
  function layout(step) {
    const heap = step.heap;
    const placed = new Map(); // id -> {x, y, kind}
    const incoming = new Set();
    for (const o of Object.values(heap)) {
      if (!o.f) continue;
      for (const k of ["suivant", "gauche", "droit"]) if (isRef(o.f[k])) incoming.add(o.f[k].ref);
    }
    const order = [];
    const seen = new Set();
    const visit = (id) => {
      if (seen.has(id) || !heap[id]) return;
      seen.add(id);
      const o = heap[id];
      if (!o.f) return;
      for (const k of ["precedent", "suivant", "gauche", "droit"]) if (isRef(o.f[k])) visit(o.f[k].ref);
      order.push(id);
    };
    // Racines : objets sans parent, dans l'ordre des variables (appelants d'abord, pour que le dessin reste stable).
    const roots = [];
    const addRoot = (id) => { if (heap[id] && heap[id].f && !roots.includes(id)) roots.push(id); };
    const fromVar = [];
    step.frames.forEach((fr) => fr.vars.forEach(([, v]) => isRef(v) && fromVar.push(v.ref)));
    fromVar.forEach(visit);
    // Remonter au vrai début d'une liste / à la racine d'un arbre.
    const parentOf = new Map();
    for (const [id, o] of Object.entries(heap)) {
      if (!o.f) continue;
      for (const k of ["suivant", "gauche", "droit"]) if (isRef(o.f[k]) && !parentOf.has(o.f[k].ref)) parentOf.set(o.f[k].ref, Number(id));
    }
    for (const id of fromVar) {
      let r = id, guard = 0;
      while (parentOf.has(r) && guard++ < 500) { r = parentOf.get(r); if (r === id) break; }
      addRoot(r);
    }
    for (const id of order) if (!incoming.has(id)) addRoot(id);
    for (const id of order) addRoot(id); // cycles éventuels

    let y = 0, maxX = 0;
    for (const rootId of roots) {
      if (placed.has(rootId)) continue;
      const o = heap[rootId];
      if (o.kind === "tree") {
        let idx = 0, maxDepth = 0;
        const place = (id, depth) => {
          if (!id || placed.has(id) || !heap[id] || !heap[id].f) return;
          const n = heap[id];
          const g = isRef(n.f.gauche) ? n.f.gauche.ref : null;
          const d = isRef(n.f.droit) ? n.f.droit.ref : null;
          placed.set(id, { kind: "tree", depth, x: 0, y: 0 });
          place(g, depth + 1);
          const p = placed.get(id);
          p.x = idx++ * TREE.dx + TREE.r + 4;
          p.y = y + depth * TREE.dy + TREE.r + 4;
          maxDepth = Math.max(maxDepth, depth);
          place(d, depth + 1);
        };
        place(rootId, 0);
        maxX = Math.max(maxX, idx * TREE.dx + 10);
        y += (maxDepth + 1) * TREE.dy + 10;
      } else {
        let id = rootId, i = 0;
        const doubly = Object.values(heap).some((c) => c.f && "precedent" in c.f && c.kind === "list");
        const w = (doubly ? CELL.p : 0) + CELL.v + CELL.p;
        while (id && heap[id] && heap[id].f && !placed.has(id) && i < 60) {
          placed.set(id, { kind: "list", x: i * (w + CELL.gap), y: y + 6, w, doubly });
          const s = heap[id].f.suivant;
          id = isRef(s) ? s.ref : null;
          i++;
        }
        maxX = Math.max(maxX, i * (w + CELL.gap));
        y += CELL.h + 40;
      }
    }
    return { placed, width: maxX, height: y };
  }

  function arrow(svg, x1, y1, x2, y2, cls, color, curve = 0) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2 - curve;
    const path = el("path", { d: curve ? `M${x1},${y1} Q${mx},${my} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`, class: cls, "marker-end": "url(#fl)" });
    if (color) path.style.stroke = color;
    svg.appendChild(path);
  }

  function render(container, step, prev, opts = {}) {
    container.innerHTML = "";
    if (!step) return;
    const frame = step.frames[step.frames.length - 1] || { fn: "", vars: [] };
    const lay = layout(step);
    const heap = step.heap;
    const prevHeap = prev ? prev.heap : null;
    const prevFrame = prev ? prev.frames[prev.frames.length - 1] : null;
    const prevVars = prevFrame && prevFrame.fn === frame.fn && prev.frames.length === step.frames.length ? new Map(prevFrame.vars.map(([k, v]) => [k, JSON.stringify(v)])) : null;

    // Largeur des lignes de variables (piles et files dessinées en ligne).
    const inlineW = (v) => {
      if (!isRef(v)) return 0;
      const o = heap[v.ref];
      if (!o || !o.items) return 0;
      return 90 + o.items.length * 34;
    };
    const vars = frame.vars;
    const varW = Math.max(VARW, ...vars.map(([k, v]) => 70 + k.length * 8 + inlineW(v)));
    const callers = step.frames.slice(0, -1).map((f) => f.fn).filter((f) => f !== "test");
    const top = 30 + (callers.length ? 18 : 0);
    const heapX = varW + GAP;
    const width = Math.max(heapX + lay.width + 40, varW + 40);
    const height = Math.max(top + vars.length * ROW + 20, lay.height + 50, 120);

    const svg = el("svg", { width, height, viewBox: `0 0 ${width} ${height}`, class: "viz" });
    const defs = el("defs");
    const marker = el("marker", { id: "fl", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: "auto-start-reverse" });
    marker.appendChild(el("path", { d: "M0,0 L10,5 L0,10 z", class: "fl-head" }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    // En-tête : appel en cours et pile d'appels.
    svg.appendChild(el("text", { x: 4, y: 16, class: "v-frame" }, frame.fn === "programme" ? "Programme principal" : `Dans ${frame.fn}( )`));
    if (callers.length && callers.every((f) => f === "programme")) svg.appendChild(el("text", { x: 4, y: 32, class: "v-callers" }, `appelée par : ${callers.reverse().join(" ← ")}` + (step.frames.length > 4 ? ` (${step.frames.length - 1} appels en cours)` : "")));

    // Structures du tas.
    const g = el("g", { transform: `translate(${heapX},${top})` });
    svg.appendChild(g);
    const heapG = g, ghosts = el("g", { class: "ghost" });
    g.appendChild(ghosts);
    const pos = (id) => lay.placed.get(id);
    for (const [id, p] of lay.placed) {
      const o = heap[id];
      const was = prevHeap && prevHeap[id];
      const fresh = prevHeap && !was;
      if (p.kind === "tree") {
        for (const k of ["gauche", "droit"]) {
          const c = o.f[k];
          if (isRef(c) && pos(c.ref)) {
            const q = pos(c.ref);
            const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
            const chg = was && JSON.stringify(was.f[k]) !== JSON.stringify(c);
            arrow(o.ghost ? ghosts : g, p.x + (dx / d) * TREE.r, p.y + (dy / d) * TREE.r, q.x - (dx / d) * (TREE.r + 2), q.y - (dy / d) * (TREE.r + 2), chg ? "edge chg" : "edge");
          }
        }
      }
    }
    let anyGhost = false;
    for (const [id, p] of lay.placed) {
      const o = heap[id];
      // Cellule que plus aucune variable ne désigne : dessinée en gris, elle n'a pas disparu de la mémoire.
      const g = o.ghost ? ghosts : heapG;
      if (o.ghost) anyGhost = true;
      const was = prevHeap && prevHeap[id];
      const fresh = prevHeap && !was;
      const valChg = was && JSON.stringify(was.f.valeur) !== JSON.stringify(o.f.valeur);
      const val = o.f.valeur === undefined || (o.f.valeur && o.f.valeur.undef) ? "?" : isRef(o.f.valeur) ? "•" : showPrim(o.f.valeur).replace(/^"|"$/g, "");
      if (p.kind === "tree") {
        g.appendChild(el("circle", { cx: p.x, cy: p.y, r: TREE.r, class: `node${fresh ? " fresh" : ""}${valChg ? " chg" : ""}` }));
        g.appendChild(el("text", { x: p.x, y: p.y + 5, class: "node-t" }, val));
        if (o.f.hauteur !== undefined && !(o.f.hauteur && o.f.hauteur.undef)) g.appendChild(el("text", { x: p.x + TREE.r + 2, y: p.y - TREE.r + 4, class: "node-h" }, `h=${showPrim(o.f.hauteur)}`));
      } else {
        let x = p.x;
        const y = p.y;
        if (p.doubly) {
          g.appendChild(el("rect", { x, y, width: CELL.p, height: CELL.h, class: "cell-p" }));
          const pr = o.f.precedent;
          if (isRef(pr) && pos(pr.ref)) { const q = pos(pr.ref); arrow(g, x + CELL.p / 2, y + CELL.h - 6, q.x + q.w - 4, q.y + CELL.h - 6, "edge back", null, -14); }
          else g.appendChild(el("text", { x: x + CELL.p / 2, y: y + CELL.h / 2 + 4, class: "nil" }, "⏚"));
          x += CELL.p;
        }
        g.appendChild(el("rect", { x, y, width: CELL.v, height: CELL.h, class: `cell${fresh ? " fresh" : ""}${valChg ? " chg" : ""}` }));
        g.appendChild(el("text", { x: x + CELL.v / 2, y: y + CELL.h / 2 + 5, class: "cell-t" }, val));
        x += CELL.v;
        const sChg = was && JSON.stringify(was.f.suivant) !== JSON.stringify(o.f.suivant);
        g.appendChild(el("rect", { x, y, width: CELL.p, height: CELL.h, class: `cell-p${sChg ? " chg" : ""}` }));
        const s = o.f.suivant;
        if (isRef(s) && pos(s.ref)) {
          const q = pos(s.ref);
          g.appendChild(el("circle", { cx: x + CELL.p / 2, cy: y + CELL.h / 2, r: 3, class: "dot" }));
          if (q.y === y && q.x > p.x) arrow(g, x + CELL.p / 2, y + CELL.h / 2, q.x - 2, q.y + CELL.h / 2, sChg ? "edge chg" : "edge");
          else arrow(g, x + CELL.p / 2, y + CELL.h / 2, q.x + 6, q.y - 2, sChg ? "edge chg" : "edge", null, 40);
        } else if (s === null || s === undefined) g.appendChild(el("text", { x: x + CELL.p / 2, y: y + CELL.h / 2 + 4, class: "nil" }, "⏚"));
        if (o.f.gauche !== undefined || o.f.droit !== undefined) {
          // cellule utilisée comme nœud : on signale les champs en plus
          g.appendChild(el("text", { x: p.x, y: y - 4, class: "v-callers" }, "(champs g/d)"));
        }
      }
    }

    // Variables de l'appel en cours, avec flèches vers ce qu'elles désignent.
    vars.forEach(([name, v, type, isVarParam, isParam], i) => {
      const y = top + i * ROW;
      const color = COLORS[i % COLORS.length];
      const chg = prevVars && prevVars.get(name) !== JSON.stringify(v);
      svg.appendChild(el("rect", { x: 2, y, width: varW - 6, height: ROW - 6, rx: 6, class: `var${chg ? " chg" : ""}` }));
      const label = el("text", { x: 10, y: y + 21, class: "var-n" }, (isVarParam ? "var " : "") + name);
      label.style.fill = color;
      svg.appendChild(label);
      if (isParam) svg.appendChild(el("text", { x: 10, y: y + 30, class: "var-tag" }, step.frames.length > 1 ? `paramètre (reçu de ${step.frames[step.frames.length - 2].fn === "programme" ? "l'appel" : step.frames[step.frames.length - 2].fn + "( )"})` : "paramètre (valeur du test)"));
      const vx = 18 + name.length * 8 + (isVarParam ? 28 : 0);
      if (isRef(v) && heap[v.ref] && heap[v.ref].items) {
        const o = heap[v.ref];
        const isPile = o.kind === "pile";
        svg.appendChild(el("text", { x: vx, y: y + 21, class: "var-small" }, isPile ? "fond" : o.kind === "file" ? "tête" : "["));
        o.items.forEach((it, j) => {
          const bx = vx + 34 + j * 34;
          svg.appendChild(el("rect", { x: bx, y: y + 4, width: 32, height: ROW - 14, class: `cell${j === o.items.length - 1 && isPile ? " top" : ""}` }));
          svg.appendChild(el("text", { x: bx + 16, y: y + 21, class: "cell-t" }, isRef(it) ? "•" : showPrim(it).replace(/^"|"$/g, "")));
        });
        svg.appendChild(el("text", { x: vx + 38 + o.items.length * 34, y: y + 21, class: "var-small" }, isPile ? "sommet" : o.kind === "file" ? "queue" : "]"));
        if (!o.items.length) svg.appendChild(el("text", { x: vx + 40, y: y + 21, class: "var-small" }, o.kind === "pile" ? "(pile vide)" : o.kind === "file" ? "(file vide)" : ""));
      } else if (isRef(v) && pos(v.ref)) {
        const q = pos(v.ref);
        svg.appendChild(el("circle", { cx: varW - 18, cy: y + ROW / 2 - 3, r: 4, class: "dot" })).style.fill = color;
        const tx = heapX + (q.kind === "tree" ? q.x - TREE.r : q.x) - 2;
        const ty = top + (q.kind === "tree" ? q.y : q.y + CELL.h / 2);
        // Une flèche vers une cellule au milieu d'une liste passe au-dessus des cellules précédentes.
        const over = q.kind === "list" && q.x > 0 ? 34 : 0;
        arrow(svg, varW - 14, y + ROW / 2 - 3, tx, ty - (over ? CELL.h / 2 - 2 : 0), `vptr${chg ? " chg" : ""}`, color, over || (i % 3) * 12);
      } else {
        svg.appendChild(el("text", { x: vx, y: y + 21, class: `var-v${v === null ? " nil-v" : ""}` }, showPrim(v)));
      }
    });

    container.appendChild(svg);
    if (anyGhost) {
      const n = document.createElement("div");
      n.className = "viz-caption";
      n.textContent = "En gris : les cellules que plus aucune variable ne désigne (déjà parcourues). Elles existent toujours en mémoire.";
      container.appendChild(n);
    }

    // Appels en attente : chaque appel récursif attend le résultat de celui du dessous.
    const waiting = step.frames.slice(0, -1).filter((f) => f.fn !== "programme");
    if (waiting.length) {
      const box = document.createElement("div");
      box.className = "viz-stack";
      const arg = (v) => (isRef(v) ? (heap[v.ref] && heap[v.ref].f && heap[v.ref].f.valeur !== undefined ? `→${showPrim(heap[v.ref].f.valeur).replace(/^"|"$/g, "")}…` : "•") : showPrim(v));
      const label = (f) => `${f.fn}(${f.vars.filter((x) => x[4]).map(([k, v]) => `${k} = ${arg(v)}`).join(", ")})`;
      box.append(Object.assign(document.createElement("b"), { textContent: `⏳ ${waiting.length} appel${waiting.length > 1 ? "s" : ""} en attente du résultat :` }));
      const ol = document.createElement("ol");
      const shown = waiting.length > 6 ? [...waiting.slice(0, 2), null, ...waiting.slice(-3)] : waiting;
      shown.forEach((f, i) => {
        const li = document.createElement("li");
        li.textContent = f ? label(f) : `… ${waiting.length - 5} autres appels …`;
        ol.appendChild(li);
      });
      const now = document.createElement("li");
      now.className = "now";
      now.textContent = `${label(frame)} ← en cours`;
      ol.appendChild(now);
      box.appendChild(ol);
      container.appendChild(box);
    }
    if (opts.end) {
      const e = document.createElement("div");
      e.className = `viz-end ${opts.end.ok ? "ok" : "ko"}`;
      e.textContent = opts.end.text;
      container.appendChild(e);
    }
    if (step.event && step.event.error) {
      const b = document.createElement("div");
      b.className = "viz-event err";
      b.textContent = `💥 Arrêt : ${step.event.error}`;
      container.prepend(b);
    }
    if (opts.caption) {
      const c = document.createElement("div");
      c.className = "viz-caption";
      c.textContent = opts.caption;
      container.prepend(c);
    }
    if (step.event && step.event.ret) {
      const b = document.createElement("div");
      b.className = "viz-event";
      const v = step.event.value;
      const what = isRef(v) ? (heap[v.ref] && heap[v.ref].f ? `la cellule ${showPrim(heap[v.ref].f.valeur).replace(/^"|"$/g, "")}` : "un pointeur") : showPrim(v);
      const back = step.frames.length > 1 && step.frames[step.frames.length - 2].fn !== "programme" ? ` à ${step.frames[step.frames.length - 2].fn}( ) qui l'attendait` : "";
      b.textContent = `↩ ${step.event.ret} se termine${v !== undefined ? ` et retourne ${what}${back}` : ""}`;
      container.prepend(b);
    }
  }

  // Petits dessins pour le tableau des tests : liste, pile, file, arbre, ou valeur simple.
  function mini(kind, value) {
    const txt = (t) => { const s = document.createElement("span"); s.className = "mini-v"; s.textContent = t; return s; };
    const lab = (v) => (typeof v === "string" ? v : showPrim(v));
    if (kind === "sortie") return txt(value === "" ? "(rien)" : value);
    if (kind === "valeur") return txt(typeof value === "string" ? `"${value}"` : showPrim(value));
    if ((kind === "liste" || kind === "listeD") && Array.isArray(value)) {
      const w = 30, p = 12, gap = 16, H = 26;
      const W = value.length * (w + p + gap) + 24;
      const svg = el("svg", { width: W, height: H, class: "viz mini" });
      const d = el("defs"); const m = el("marker", { id: "fm", viewBox: "0 0 10 10", refX: 9, refY: 5, markerWidth: 6, markerHeight: 6, orient: "auto" }); m.appendChild(el("path", { d: "M0,0 L10,5 L0,10 z", class: "fl-head" })); d.appendChild(m); svg.appendChild(d);
      value.forEach((v, i) => {
        const x = i * (w + p + gap) + 1;
        svg.appendChild(el("rect", { x, y: 2, width: w, height: H - 4, class: "cell" }));
        svg.appendChild(el("text", { x: x + w / 2, y: H / 2 + 4, class: "cell-t" }, lab(v)));
        svg.appendChild(el("rect", { x: x + w, y: 2, width: p, height: H - 4, class: "cell-p" }));
        svg.appendChild(el("path", { d: `M${x + w + p / 2},${H / 2} L${x + w + p + gap - 1},${H / 2}`, class: "edge", "marker-end": "url(#fm)" }));
      });
      svg.appendChild(el("text", { x: value.length * (w + p + gap) + 8, y: H / 2 + 4, class: "nil" }, "⏚"));
      return svg;
    }
    if ((kind === "pile" || kind === "file") && Array.isArray(value)) {
      const w = 28, H = 24, pad = kind === "pile" ? 34 : 30;
      const W = pad * 2 + Math.max(1, value.length) * w;
      const svg = el("svg", { width: W, height: H + 4, class: "viz mini" });
      svg.appendChild(el("text", { x: 2, y: H / 2 + 5, class: "var-small" }, kind === "pile" ? "fond" : "tête"));
      value.forEach((v, i) => {
        svg.appendChild(el("rect", { x: pad + i * w, y: 2, width: w, height: H - 2, class: `cell${kind === "pile" && i === value.length - 1 ? " top" : ""}` }));
        svg.appendChild(el("text", { x: pad + i * w + w / 2, y: H / 2 + 5, class: "cell-t" }, lab(v)));
      });
      if (!value.length) svg.appendChild(el("text", { x: pad, y: H / 2 + 5, class: "var-small" }, "vide"));
      svg.appendChild(el("text", { x: pad + Math.max(1, value.length) * w + 4, y: H / 2 + 5, class: "var-small" }, kind === "pile" ? "sommet" : "queue"));
      return svg;
    }
    if (kind === "arbre") {
      if (value === null) return txt("arbre vide");
      const DX = 26, DY = 34, R = 11;
      const pts = [];
      let idx = 0, maxD = 0;
      const walk = (t, dpt) => { if (!t) return null; const me = { v: t[0], d: dpt }; me.l = walk(t[1], dpt + 1); me.x = idx++ * DX + R + 2; me.r = walk(t[2], dpt + 1); maxD = Math.max(maxD, dpt); pts.push(me); return me; };
      walk(value, 0);
      const svg = el("svg", { width: idx * DX + 6, height: (maxD + 1) * DY + 4, class: "viz mini" });
      const Y = (n) => n.d * DY + R + 2;
      pts.forEach((n) => [n.l, n.r].forEach((c) => c && svg.appendChild(el("line", { x1: n.x, y1: Y(n), x2: c.x, y2: Y(c), class: "edge" }))));
      pts.forEach((n) => { svg.appendChild(el("circle", { cx: n.x, cy: Y(n), r: R, class: "node" })); svg.appendChild(el("text", { x: n.x, y: Y(n) + 4, class: "cell-t mini-t" }, lab(n.v))); });
      return svg;
    }
    return txt(showPrim(value));
  }

  root.Viz = { render, layout, mini };
})(window);
