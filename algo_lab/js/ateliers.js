/* Ateliers interactifs (questions d'examen qui ne sont pas du code) : construction / suppression dans un AVL,
   hachage par chaînage, hachage par coalescence ; et petits arbres pour vérifier les preuves sur des exemples. */
(function (root) {
  "use strict";
  const NS = "http://www.w3.org/2000/svg";
  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) { if (k === "on") Object.entries(v).forEach(([ev, f]) => e.addEventListener(ev, f)); else if (k === "html") e.innerHTML = v; else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v); }
    kids.flat().forEach((c) => c !== null && c !== undefined && c !== false && e.append(c.nodeType ? c : document.createTextNode(c)));
    return e;
  };
  const s = (tag, attrs = {}, text) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) e.setAttribute(k, v); if (text !== undefined) e.textContent = text; return e; };

  // ---------------- Arbres simples {v, l, r} ----------------
  const height = (n) => (n ? 1 + Math.max(height(n.l), height(n.r)) : -1);
  const bal = (n) => height(n.r) - height(n.l);
  const count = (n) => (n ? 1 + count(n.l) + count(n.r) : 0);
  const leaves = (n) => (!n ? 0 : !n.l && !n.r ? 1 : leaves(n.l) + leaves(n.r));
  const clone = (n) => (n ? { v: n.v, l: clone(n.l), r: clone(n.r) } : null);

  // Dessin : parcours infixe pour les abscisses ; avec slots, chaque fils vide devient un emplacement cliquable.
  function drawTree(container, rootNode, opts = {}) {
    container.innerHTML = "";
    const DX = opts.dx || 44, DY = opts.dy || 62, R = 18;
    const items = [];
    let idx = 0, maxD = 0;
    const walk = (n, d, parent, side) => {
      if (!n) {
        if (opts.slots && (parent || d === 0)) { items.push({ slot: true, x: idx++ * DX, d, parent, side }); maxD = Math.max(maxD, d); }
        return null;
      }
      const it = { node: n, d };
      it.left = walk(n.l, d + 1, n, "l");
      it.x = idx++ * DX;
      it.right = walk(n.r, d + 1, n, "r");
      items.push(it);
      maxD = Math.max(maxD, d);
      return it;
    };
    walk(rootNode, 0, null, null);
    const W = Math.max(idx * DX + 40, 120), H = (maxD + 1) * DY + 30;
    const svg = s("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, class: "viz tree-viz" });
    const X = (it) => it.x + 30, Y = (it) => it.d * DY + 26;
    const byNode = new Map(items.filter((i) => i.node).map((i) => [i.node, i]));
    for (const it of items) {
      if (it.slot) {
        if (it.parent) { const p = byNode.get(it.parent); svg.appendChild(s("line", { x1: X(p), y1: Y(p), x2: X(it), y2: Y(it), class: "edge slot-edge" })); }
        continue;
      }
      for (const c of [it.left, it.right]) if (c) svg.appendChild(s("line", { x1: X(it), y1: Y(it), x2: X(c), y2: Y(c), class: "edge" }));
    }
    for (const it of items) {
      if (it.slot) {
        const g = s("g", { class: "slot", tabindex: 0 });
        g.appendChild(s("circle", { cx: X(it), cy: Y(it), r: 11 }));
        g.appendChild(s("text", { x: X(it), y: Y(it) + 5 }, "+"));
        g.addEventListener("click", () => opts.onSlot && opts.onSlot(it.parent, it.side));
        svg.appendChild(g);
        continue;
      }
      const n = it.node;
      const g = s("g", { class: `tnode${opts.hi && opts.hi.has(n) ? " hi" : ""}${opts.bad && opts.bad.has(n) ? " bad" : ""}${opts.onNode ? " click" : ""}` });
      g.appendChild(s("circle", { cx: X(it), cy: Y(it), r: R, class: "node" }));
      g.appendChild(s("text", { x: X(it), y: Y(it) + 5, class: "node-t" }, String(n.v)));
      if (opts.label) { const t = opts.label(n); if (t !== null && t !== undefined) g.appendChild(s("text", { x: X(it) + R + 3, y: Y(it) - R + 6, class: `node-h${Math.abs(Number(t)) >= 2 ? " warn" : ""}` }, String(t))); }
      if (opts.onNode) g.addEventListener("click", () => opts.onNode(n));
      svg.appendChild(g);
    }
    if (!rootNode && !opts.slots) svg.appendChild(s("text", { x: 20, y: 30, class: "var-small" }, "arbre vide"));
    container.appendChild(svg);
  }

  // ---------------- Atelier AVL ----------------
  function rotR(a) { const b = a.l; a.l = b.r; b.r = a; return b; }
  function rotL(a) { const b = a.r; a.r = b.l; b.l = a; return b; }
  const ROT = { droite: "rotation droite", gauche: "rotation gauche", "gauche-droite": "rotation double gauche-droite", "droite-gauche": "rotation double droite-gauche" };
  function expectedRotation(n) {
    const b = bal(n);
    if (b >= 2) return bal(n.r) >= 0 ? "gauche" : "droite-gauche";
    return bal(n.l) <= 0 ? "droite" : "gauche-droite";
  }
  function deepestUnbalanced(rootNode) {
    let best = null, bestD = -1;
    const walk = (n, d) => { if (!n) return; if (Math.abs(bal(n)) >= 2 && d > bestD) { best = n; bestD = d; } walk(n.l, d + 1); walk(n.r, d + 1); };
    walk(rootNode, 0);
    return best;
  }
  function parentOf(rootNode, target) {
    let p = null, n = rootNode;
    while (n && n !== target) { p = n; n = target.v < n.v ? n.l : n.r; }
    return p;
  }

  function avl(container, ex, done) {
    const ops = [...ex.cles.map((k) => ({ type: "ins", k })), ...ex.suppressions.map((k) => ({ type: "del", k }))];
    let tree, step, phase, picked, journal, msg, showBal = true, pendingReplace = null;
    const reset = () => { tree = null; step = 0; phase = "op"; picked = null; journal = []; msg = null; pendingReplace = null; };
    reset();

    const apply = (node, kind) => {
      const fix = (n) => {
        if (kind === "droite") return rotR(n);
        if (kind === "gauche") return rotL(n);
        if (kind === "gauche-droite") { n.l = rotL(n.l); return rotR(n); }
        n.r = rotR(n.r); return rotL(n);
      };
      const p = parentOf(tree, node);
      const nr = fix(node);
      if (!p) tree = nr; else if (p.l === node) p.l = nr; else p.r = nr;
    };

    const afterChange = (what) => {
      const u = deepestUnbalanced(tree);
      if (u) { phase = "rot"; picked = null; msg = { ok: true, t: `${what} Un déséquilibre est apparu : clique sur le nœud déséquilibré le plus bas (équilibre ±2), puis choisis la rotation.` }; }
      else { msg = { ok: true, t: `${what} L'arbre est équilibré ✔` }; next(); }
    };
    const next = () => {
      step++; phase = "op"; picked = null;
      if (step >= ops.length) { phase = "fini"; done && done(); }
    };

    function onSlot(parent, side) {
      if (phase !== "op" || ops[step].type !== "ins") return;
      const k = ops[step].k;
      // vérifier que c'est bien la place de k dans l'ABR
      let n = tree, p = null, sd = null;
      while (n) { p = n; sd = k < n.v ? "l" : "r"; n = n[sd]; }
      if (p !== parent || sd !== side) {
        let m = tree, why = "";
        while (m) { const goLeft = k < m.v; why = `${k} ${goLeft ? "<" : "≥"} ${m.v} : il faut aller à ${goLeft ? "gauche" : "droite"} de ${m.v}.`; if (m === parent) break; m = goLeft ? m.l : m.r; if (!m) break; }
        msg = { ok: false, t: `Pas ici. On insère comme dans un ABR, en partant de la racine. ${why}` };
        return render();
      }
      const leaf = { v: k, l: null, r: null };
      if (!parent) tree = leaf; else parent[side] = leaf;
      journal.push(`Insertion de ${k}${parent ? ` (fils ${side === "l" ? "gauche" : "droit"} de ${parent.v})` : " (racine)"}.`);
      afterChange(`${k} est inséré.`);
      render();
    }

    function onNode(n) {
      if (phase === "rot") { picked = n; const u = deepestUnbalanced(tree); msg = n === u ? { ok: true, t: `Oui : ${n.v} est déséquilibré (équilibre ${bal(n) > 0 ? "+" : ""}${bal(n)}). Quelle rotation ?` } : { ok: false, t: Math.abs(bal(n)) >= 2 ? `${n.v} est déséquilibré, mais il y a un nœud déséquilibré plus bas : on corrige d'abord le plus proche de la modification.` : `${n.v} est équilibré (équilibre ${bal(n)}). Cherche un nœud à +2 ou −2.` }; if (n !== u) picked = null; return render(); }
      if (phase === "op" && ops[step].type === "del") {
        const k = ops[step].k;
        if (n.v !== k) { msg = { ok: false, t: `Ce nœud contient ${n.v}, on veut supprimer ${k}.` }; return render(); }
        if (n.l && n.r) {
          phase = "repl"; pendingReplace = n;
          let pred = n.l; while (pred.r) pred = pred.r;
          let succ = n.r; while (succ.l) succ = succ.l;
          msg = { ok: true, t: `${k} a deux fils : on le remplace par le plus grand du sous-arbre gauche (${pred.v}) ou le plus petit du sous-arbre droit (${succ.v}), selon la convention de ton cours.` };
          return render();
        }
        const p = parentOf(tree, n), child = n.l || n.r;
        if (!p) tree = child; else if (p.l === n) p.l = child; else p.r = child;
        journal.push(`Suppression de ${k} (${child ? `remplacé par son fils ${child.v}` : "c'était une feuille"}).`);
        afterChange(`${k} est supprimé.`);
        return render();
      }
    }

    function replaceWith(which) {
      const n = pendingReplace;
      let m;
      if (which === "pred") { let p = n, c = n.l; while (c.r) { p = c; c = c.r; } m = c; if (p === n) p.l = c.l; else p.r = c.l; }
      else { let p = n, c = n.r; while (c.l) { p = c; c = c.l; } m = c; if (p === n) p.r = c.r; else p.l = c.r; }
      journal.push(`Suppression de ${n.v} : remplacé par ${m.v} (${which === "pred" ? "plus grand du sous-arbre gauche" : "plus petit du sous-arbre droit"}).`);
      const old = n.v; n.v = m.v; pendingReplace = null; phase = "op";
      afterChange(`${old} est remplacé par ${m.v}.`);
      render();
    }

    function rotate(kind) {
      if (phase !== "rot") return;
      const u = deepestUnbalanced(tree);
      if (!picked) { msg = { ok: false, t: "Clique d'abord sur le nœud déséquilibré." }; return render(); }
      const exp = expectedRotation(u);
      if (kind !== exp) {
        const b = bal(u), c = b > 0 ? u.r : u.l;
        msg = { ok: false, t: `Pas celle-là. ${u.v} penche à ${b > 0 ? "droite (+2)" : "gauche (−2)"}, et son fils ${c.v} a un équilibre ${bal(c) > 0 ? "+" : ""}${bal(c)} : ${bal(c) * b < 0 ? "il penche de l'autre côté, il faut une rotation double" : "même sens (ou 0), une rotation simple suffit"}.` };
        return render();
      }
      journal.push(`  → Déséquilibre en ${u.v} (${bal(u) > 0 ? "+2" : "−2"}) : ${ROT[kind]} en ${u.v}.`);
      apply(u, kind);
      afterChange(`${ROT[kind][0].toUpperCase() + ROT[kind].slice(1)} effectuée.`);
      render();
    }

    function showMe() {
      if (phase === "op") {
        const o = ops[step];
        if (o.type === "ins") { let n = tree, p = null, sd = null; while (n) { p = n; sd = o.k < n.v ? "l" : "r"; n = n[sd]; } onSlot(p, sd); }
        else { const find = (n) => (!n ? null : n.v === o.k ? n : find(o.k < n.v ? n.l : n.r)); const n = find(tree); if (n) onNode(n); }
      } else if (phase === "repl") replaceWith("pred");
      else if (phase === "rot") { const u = deepestUnbalanced(tree); picked = u; rotate(expectedRotation(u)); }
    }

    function render() {
      container.innerHTML = "";
      const o = ops[step];
      container.append(h("div", { class: "ops" }, ops.map((x, i) => h("span", { class: `op${i < step ? " done" : ""}${i === step ? " cur" : ""}` }, x.type === "ins" ? `+${x.k}` : `−${x.k}`))));
      const instr = phase === "fini" ? "✅ Terminé ! L'AVL est construit et les suppressions sont faites. Relis le journal : c'est le détail attendu à l'examen."
        : phase === "repl" ? "Choisis le remplaçant :"
        : phase === "rot" ? "Rééquilibrage : clique sur le nœud déséquilibré le plus bas, puis choisis la rotation."
        : o.type === "ins" ? `Insère ${o.k} : clique sur l'emplacement (+) où il doit aller.` : `Supprime ${o.k} : clique sur le nœud qui le contient.`;
      container.append(h("p", { class: "instr" }, instr));
      if (msg) container.append(h("p", { class: `fb ${msg.ok ? "ok" : "ko"}` }, msg.t));
      const area = h("div", { class: "tree-area" });
      container.append(area);
      drawTree(area, tree, {
        slots: phase === "op" && o && o.type === "ins",
        onSlot, onNode: phase === "rot" || (phase === "op" && o && o.type === "del") ? onNode : null,
        label: showBal ? (n) => { const b = bal(n); return b > 0 ? `+${b}` : `${b}`; } : null,
        hi: picked ? new Set([picked]) : null,
      });
      const bar = h("div", { class: "row" });
      if (phase === "rot") Object.keys(ROT).forEach((k) => bar.append(h("button", { on: { click: () => rotate(k) } }, ROT[k])));
      if (phase === "repl") {
        let pred = pendingReplace.l; while (pred.r) pred = pred.r;
        let succ = pendingReplace.r; while (succ.l) succ = succ.l;
        bar.append(h("button", { on: { click: () => replaceWith("pred") } }, `par ${pred.v} (max à gauche)`), h("button", { on: { click: () => replaceWith("succ") } }, `par ${succ.v} (min à droite)`));
      }
      if (phase !== "fini") bar.append(h("button", { class: "alt", on: { click: showMe } }, "🪄 Montre-moi cette étape"));
      bar.append(h("label", { class: "chk" }, h("input", { type: "checkbox", checked: showBal ? "" : null, on: { change: (e) => { showBal = e.target.checked; render(); } } }), " équilibres"), h("button", { class: "alt", on: { click: () => { reset(); render(); } } }, "↺ Recommencer"));
      container.append(bar);
      container.append(h("details", { class: "journal", open: phase === "fini" ? "" : null }, h("summary", {}, `Journal des étapes (${journal.length})`), h("ol", {}, journal.map((j) => h("li", {}, j)))));
    }
    render();
  }

  // ---------------- Atelier chaînage ----------------
  function chainage(container, ex, done) {
    const m = ex.m;
    let phase = "taille", i = 0, table = Array.from({ length: m }, () => []), msg = null;
    const reset = () => { phase = "taille"; i = 0; table = Array.from({ length: m }, () => []); msg = null; };
    const render = () => {
      container.innerHTML = "";
      if (phase === "taille") {
        const inp = h("input", { type: "number", min: 1, placeholder: "taille m" });
        container.append(h("p", { class: "instr" }, `1) Avec h(k) = k mod ${m}, quelle doit être la taille de la table ?`), h("div", { class: "row" }, inp, h("button", { on: { click: () => {
          if (Number(inp.value) === m) { msg = { ok: true, t: `Oui : k mod ${m} vaut 0, 1, …, ${m - 1}, donc il faut ${m} cases.` }; phase = "ins"; }
          else msg = { ok: false, t: `Non. Quelles valeurs peut prendre k mod ${m} ?` };
          render();
        } } }, "Valider")));
        if (msg) container.append(h("p", { class: `fb ${msg.ok ? "ok" : "ko"}` }, msg.t));
        return;
      }
      if (msg) container.append(h("p", { class: `fb ${msg.ok ? "ok" : "ko"}` }, msg.t));
      if (phase === "ins") container.append(h("p", { class: "instr" }, `2) Insère la clé ${ex.cles[i]} : clique sur la bonne case (les clés s'ajoutent en fin de liste).`));
      const tbl = h("div", { class: "hash" });
      table.forEach((lst, b) => {
        const row = h("div", { class: `hrow${phase === "ins" ? " click" : ""}`, on: { click: () => {
          if (phase !== "ins") return;
          const k = ex.cles[i];
          if (k % m !== b) { msg = { ok: false, t: `${k} mod ${m} = ${k % m} (${k} = ${Math.floor(k / m)} × ${m} + ${k % m}).` }; return render(); }
          table[b].push(k);
          msg = { ok: true, t: `${k} mod ${m} = ${b}${table[b].length > 1 ? " : collision, on l'ajoute à la liste de la case." : "."}` };
          i++;
          if (i === ex.cles.length) phase = "cout";
          render();
        } } }, h("span", { class: "hidx" }, b), lst.map((k) => h("span", { class: "hcell" }, k)), h("span", { class: "nil" }, "⏚"));
        tbl.append(row);
      });
      container.append(tbl);
      if (phase === "ins") container.append(h("div", { class: "keys" }, ex.cles.map((k, j) => h("span", { class: `op${j < i ? " done" : ""}${j === i ? " cur" : ""}` }, k))));
      if (phase === "cout" || phase === "fini") {
        const inp = h("input", { placeholder: "ex : 3/2 ou 1,5" });
        const total = table.reduce((a, l) => a + (l.length * (l.length + 1)) / 2, 0), n = ex.cles.length;
        container.append(h("p", { class: "instr" }, "3) Coût moyen d'une recherche fructueuse (nombre moyen de comparaisons pour trouver une clé présente) ?"), h("div", { class: "row" }, inp, h("button", { on: { click: () => {
          const t = inp.value.replace(",", ".").trim();
          const v = t.includes("/") ? Number(t.split("/")[0]) / Number(t.split("/")[1]) : Number(t);
          if (Math.abs(v - total / n) < 1e-9) { phase = "fini"; msg = { ok: true, t: "Exact ✔" }; done && done(); }
          else msg = { ok: false, t: "Pas tout à fait : compte, pour chaque clé, sa position dans sa liste (1 pour la première), puis fais la moyenne." };
          render();
        } } }, "Valider")));
        if (phase === "fini") {
          const parts = table.flatMap((l) => l.map((k, j) => `${k}:${j + 1}`));
          container.append(h("div", { class: "fb ok" }, `Détail : ${parts.join(", ")}. Total = ${total} comparaisons pour ${n} clés : coût moyen = ${total}/${n} = ${(total / n).toLocaleString("fr-FR")}. (Si ton cours insère en tête de liste, l'ordre dans chaque case est inversé mais le coût moyen est le même.)`));
        }
      }
      container.append(h("div", { class: "row" }, h("button", { class: "alt", on: { click: () => { reset(); render(); } } }, "↺ Recommencer")));
    };
    render();
  }

  // ---------------- Atelier coalescence ----------------
  function coalescence(container, ex, done) {
    const m = ex.m;
    let T, dispo, i, phase, msg, delStep;
    const reset = () => { T = Array.from({ length: m }, () => ({ k: null, lien: null })); dispo = [...ex.disponible]; i = 0; phase = "ins"; msg = null; delStep = 0; };
    reset();
    const chainEnd = (start) => { let c = start; while (T[c].lien !== null) c = T[c].lien; return c; };
    const target = (k) => { const hk = k % m; return T[hk].k === null ? hk : dispo[0]; };

    function place(cell) {
      const k = ex.cles[i], hk = k % m, exp = target(k);
      if (cell !== exp) {
        msg = { ok: false, t: T[hk].k === null ? `${k} mod ${m} = ${hk}, et la case ${hk} est libre.` : `${k} mod ${m} = ${hk}, mais la case ${hk} est occupée : on prend la première case de Disponible (${dispo[0]}).` };
        return render();
      }
      if (cell === hk) {
        T[cell].k = k; dispo = dispo.filter((c) => c !== cell);
        msg = { ok: true, t: `${k} va dans sa case ${hk} (libre)${ex.disponible.includes(cell) ? `, qui sort de Disponible` : ""}.` };
      } else {
        const end = chainEnd(hk);
        T[cell].k = k; dispo.shift(); T[end].lien = cell;
        msg = { ok: true, t: `Collision en ${hk} : ${k} va en case ${cell} (tête de Disponible), et la fin de la chaîne (case ${end}) pointe maintenant vers ${cell}.` };
      }
      i++;
      if (i === ex.cles.length) {
        phase = "del";
        msg = { ok: true, t: `${msg.t} Toutes les clés sont placées. b) Pour supprimer une cellule p au milieu d'une liste chaînée, on relie la précédente à la suivante : prec->suivant ← p->suivant. C'est ce qu'on va faire dans la table.` };
      }
      render();
    }

    const del = ex.supprimer;
    let delCell = null, precCell = null;
    function delClick(cell) {
      if (delStep === 0) {
        if (T[cell].k !== del) { msg = { ok: false, t: `La clé ${del} n'est pas en case ${cell}. Pars de h(${del}) = ${del % m} et suis les liens.` }; return render(); }
        delCell = cell; delStep = 1; msg = { ok: true, t: `${del} est en case ${cell}. Quelle case la précède dans la chaîne (pointe vers elle) ?` }; return render();
      }
      if (delStep === 1) {
        if (T[cell].lien !== delCell) { msg = { ok: false, t: `Cherche la case dont le lien vaut ${delCell}.` }; return render(); }
        precCell = cell; delStep = 2;
        msg = { ok: true, t: `C'est la case ${cell}. Comme pour une liste : prec->suivant ← p->suivant. Que devient le lien de la case ${cell} ?` };
        return render();
      }
    }
    function setLink(v) {
      if (v !== T[delCell].lien) { msg = { ok: false, t: `Il faut « sauter » la case ${delCell} : le nouveau lien est l'ancien lien de la case ${delCell}.` }; return render(); }
      T[precCell].lien = T[delCell].lien;
      T[delCell] = { k: null, lien: null };
      dispo.push(delCell);
      delStep = 3; phase = "fini";
      msg = { ok: true, t: `Le lien de la case ${precCell} vaut maintenant ${v === null ? "∅" : v}. La case ${delCell} est libérée et enfilée dans Disponible.` };
      done && done();
      render();
    }

    function render() {
      container.innerHTML = "";
      if (phase === "ins") container.append(h("p", { class: "instr" }, `a) Insère la clé ${ex.cles[i]} (h = ${ex.cles[i]} mod ${m} = ${ex.cles[i] % m}) : clique sur la case où elle va.`));
      if (phase === "del") container.append(h("p", { class: "instr" }, `c) Suppression de la clé ${del}. ${["Clique sur la case qui contient " + del + ".", "Clique sur la case qui la précède dans sa chaîne.", "Choisis le nouveau lien."][delStep] || ""}`));
      if (phase === "fini") container.append(h("p", { class: "instr" }, "✅ Terminé : voici l'état final de la table."));
      if (msg) container.append(h("p", { class: `fb ${msg.ok ? "ok" : "ko"}` }, msg.t));
      const tbl = h("table", { class: "coal" }, h("tr", {}, h("th", {}, "case"), h("th", {}, "clé"), h("th", {}, "lien")));
      T.forEach((c, j) => tbl.append(h("tr", { class: phase === "ins" || (phase === "del" && delStep < 2) ? "click" : "", on: { click: () => (phase === "ins" ? place(j) : phase === "del" ? delClick(j) : null) } },
        h("td", {}, j), h("td", { class: c.k === null ? "empty" : "" }, c.k === null ? "" : c.k), h("td", {}, c.lien === null ? (c.k === null ? "" : "∅") : `→ ${c.lien}`))));
      container.append(h("div", { class: "row top" }, tbl, h("div", { class: "dispo" }, h("b", {}, "Disponible (FIFO) : "), dispo.length ? dispo.map((d) => h("span", { class: "hcell" }, d)) : h("span", { class: "var-small" }, "vide"))));
      if (phase === "del" && delStep === 2) {
        const choices = [...new Set([T[delCell].lien, ...T.map((_, j) => j)])];
        container.append(h("div", { class: "row" }, [null, ...choices.filter((c) => c !== null)].map((c) => h("button", { class: "alt", on: { click: () => setLink(c) } }, c === null ? "∅" : `→ ${c}`))));
      }
      container.append(h("div", { class: "row" }, h("button", { class: "alt", on: { click: () => { reset(); render(); } } }, "↺ Recommencer")));
    }
    render();
  }

  // ---------------- Vérifications pour les preuves ----------------
  function randomStrict(internals) {
    if (internals === 0) return { v: "•", l: null, r: null };
    const left = Math.floor(Math.random() * internals);
    return { v: "•", l: randomStrict(left), r: randomStrict(internals - 1 - left) };
  }
  function complete(hgt) { return hgt < 0 ? null : { v: "•", l: complete(hgt - 1), r: complete(hgt - 1) }; }
  function fibTree(n) { return n === 0 ? null : n === 1 ? { v: 1, l: null, r: null } : { v: n, l: fibTree(n - 1), r: fibTree(n - 2) }; }
  const fibN = (n) => { let a = 0, b = 1; for (let i = 0; i < n; i++) [a, b] = [b, a + b]; return a; };

  function verifier(container, kind) {
    container.innerHTML = "";
    const area = h("div", { class: "tree-area" });
    const info = h("p", { class: "fb ok" });
    let ctrl;
    if (kind === "strict") {
      const go = () => {
        const t = randomStrict(1 + Math.floor(Math.random() * 6));
        drawTree(area, t, { dx: 30, dy: 48 });
        const f = leaves(t), n = count(t);
        info.textContent = `Feuilles : ${f} · nœuds internes : ${n - f} → ${f} = ${n - f} + 1 ✔`;
      };
      ctrl = h("button", { on: { click: go } }, "🎲 Autre arbre (0 ou 2 fils)");
      container.append(ctrl, area, info); go();
    } else if (kind === "complet") {
      const inp = h("input", { type: "range", min: 0, max: 4, value: 2 });
      const go = () => { const hh = Number(inp.value); const t = complete(hh); drawTree(area, t, { dx: 26, dy: 46 }); info.textContent = `Hauteur ${hh} : ${count(t)} nœuds = 2^(${hh}+1) − 1 = ${2 ** (hh + 1) - 1} ✔`; };
      inp.addEventListener("input", go);
      container.append(h("label", { class: "row" }, "hauteur h ", inp), area, info); go();
    } else if (kind === "fibo") {
      const inp = h("input", { type: "range", min: 0, max: 6, value: 4 });
      const go = () => { const n = Number(inp.value); const t = fibTree(n); drawTree(area, t, { dx: 30, dy: 50 }); info.textContent = `A${n} : ${count(t)} nœuds (F${n + 2} − 1 = ${fibN(n + 2) - 1}), hauteur ${height(t)} (n − 1 = ${n - 1}).`; };
      inp.addEventListener("input", go);
      container.append(h("label", { class: "row" }, "Voir Aₙ, n = ", inp), area, info); go();
    }
  }

  root.Ateliers = { avl, chainage, coalescence, verifier, drawTree };
})(window);
