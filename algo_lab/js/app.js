/* Interface : parcours, fiches, exercices (blocs / pseudo-code, tests, exécution pas à pas), annales, examen blanc. */
(() => {
  "use strict";
  const A = window.Algo, T = window.Tests, C = window.Contenu;
  const V = "11";

  const h = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === "on") Object.entries(v).forEach(([ev, f]) => e.addEventListener(ev, f));
      else if (k === "html") e.innerHTML = v;
      else if (v !== null && v !== undefined && v !== false) e.setAttribute(k, v === true ? "" : v);
    }
    kids.flat(Infinity).forEach((c) => c !== null && c !== undefined && c !== false && e.append(c.nodeType ? c : document.createTextNode(String(c))));
    return e;
  };
  const app = document.getElementById("app");
  // append qui ignore les éléments absents (null, false) au lieu d'écrire « null ».
  const put = (el, ...kids) => el.append(...kids.flat().filter((k) => k !== null && k !== undefined && k !== false));

  // ---------------- Progression (navigateur) ----------------
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } },
  };
  const prog = store.get("algolab:prog", {});
  const P = (id) => (prog[id] ||= {});
  const save = () => store.set("algolab:prog", prog);
  let prefMode = store.get("algolab:mode", "blocs");
  const status = (id) => { const p = prog[id]; return !p ? "" : p.done ? (p.hints || p.sol ? "aide" : "ok") : p.tried ? "essai" : ""; };
  const icon = (id) => ({ ok: "✅", aide: "🟢", essai: "🟠" })[status(id)] || "○";

  // ---------------- Coloration du pseudo-code ----------------
  const W = "(?<![\\w\\u00C0-\\u024F])", E = "(?![\\w\\u00C0-\\u024F])";
  const kw = (words) => new RegExp(`${W}(?:${words})${E}`, "i");
  CodeMirror.defineSimpleMode("algo", {
    start: [
      { regex: /\/\/.*/, token: "comment" },
      { regex: /"(?:[^\\"]|\\.)*"|'(?:[^\\']|\\.)*'/, token: "string" },
      { regex: kw("fonction|avec|sans|retour|d[ée]but|fin|si|alors|sinon|finsi|tant|que|faire|fintantque|pour|allant|de|à|finpour|retourner|var|r[ée]p[ée]ter|jusqu'à|proc[ée]dure"), token: "keyword" },
      { regex: kw("et|ou|non|mod|div"), token: "operator" },
      { regex: kw("vrai|faux|vide"), token: "atom" },
      { regex: kw("entier|bool[ée]en|cha[iî]ne|caract[èe]re|r[ée]el|Liste|Arbre|Pile|File|Element|Noeud"), token: "type" },
      { regex: kw("empiler|d[ée]piler|sommet|enfiler|d[ée]filer|t[êe]te|estvide|new|creerListe|creerArbre|[ée]crire|longueur|atoi|estchiffre|max|min"), token: "builtin" },
      { regex: /->|←|<-|≠|!=|<=|>=|[-+*/=<>]/, token: "operator" },
      { regex: /\d+/, token: "number" },
    ],
  });

  // ---------------- Blockly, chargé à la demande ----------------
  const script = (src) => new Promise((ok, ko) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => ko(new Error("chargement impossible (connexion ?)")); document.head.appendChild(s); });
  let blocklyReady = null;
  const loadBlockly = () => (blocklyReady ??= (async () => {
    await script("https://cdn.jsdelivr.net/npm/blockly@11.2.1/blockly_compressed.js");
    await script("https://cdn.jsdelivr.net/npm/blockly@11.2.1/msg/fr.js");
    await script(`js/blocks.js?v=${V}`);
  })().catch((e) => { blocklyReady = null; throw e; }));

  // ---------------- Établi : éditeur (blocs ou texte) + lecture de la trace ----------------
  let stopPlayer = () => {};
  function bench(opts) {
    let mode = "texte";
    const root = h("div", { class: "bench" });
    const bBlocs = h("button", { type: "button" }, "🧩 Blocs");
    const bTexte = h("button", { type: "button" }, "📝 Pseudo-code");
    const tabs = h("div", { class: "tabs" }, bBlocs, bTexte);
    const edText = h("div", { class: "editor" });
    const edBlocks = h("div", { class: "editor blockly", hidden: true });
    const errBox = h("div", { class: "error-box", hidden: true });
    const actions = h("div", { class: "row" }, ...(opts.buttons || []));
    const pos = h("span", { class: "pos" });
    const range = h("input", { type: "range", min: 0, max: 0, value: 0 });
    const vizbox = h("div", { class: "vizbox" });
    const curline = h("div", { class: "curline" });
    const cons = h("pre", { class: "console" });
    let steps = [], cur = 0, runCode = "", runOut = "", map = null, timer = null, mark = null, caption = "", endNote = null;
    const btn = (label, title, f) => h("button", { type: "button", class: "alt", title, on: { click: f } }, label);
    const playBtn = btn("▶ Lecture", "Rejouer l'exécution", () => (timer ? pause() : play()));
    const manual = (f) => () => { pause(); f(); };
    const speed = h("select", { title: "Vitesse de lecture" }, [["1800", "Très lent"], ["1100", "Lent"], ["600", "Normal"], ["250", "Rapide"]].map(([v, l]) => h("option", { value: v }, l)));
    speed.value = String(store.get("algolab:speed", 1100));
    speed.addEventListener("change", () => { store.set("algolab:speed", Number(speed.value)); if (timer) { pause(); play(); } });
    const player = h("div", { class: "player", hidden: true, tabindex: 0 },
      h("div", { class: "ctl" }, btn("⏮", "Début", manual(() => show(0))), btn("◀", "Étape précédente (flèche gauche)", manual(() => show(cur - 1))), playBtn, btn("▶", "Étape suivante (flèche droite)", manual(() => show(cur + 1))), btn("⏭", "Fin", manual(() => show(steps.length - 1))), speed, range, pos),
      curline, vizbox, h("div", { class: "muted" }, "Sortie :"), cons);
    range.addEventListener("input", manual(() => show(Number(range.value))));
    // Flèches du clavier quand le lecteur a le focus.
    player.addEventListener("keydown", (e) => {
      if (e.target.tagName === "SELECT") return;
      if (e.key === "ArrowRight") { e.preventDefault(); pause(); show(cur + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); pause(); show(cur - 1); }
      if (e.key === " ") { e.preventDefault(); timer ? pause() : play(); }
    });
    root.append(h("div", { class: "row" }, tabs, actions), edText, edBlocks, errBox, player);

    const cm = CodeMirror(edText, {
      value: opts.code || "", mode: "algo", lineNumbers: true, indentUnit: 4, tabSize: 4,
      extraKeys: { Tab: (c) => c.replaceSelection("    "), "Ctrl-Enter": () => opts.onRun && opts.onRun(), "Cmd-Enter": () => opts.onRun && opts.onRun() },
    });
    cm.on("change", () => opts.onChange && opts.onChange());
    setTimeout(() => cm.refresh(), 0);

    // Pendant la lecture, l'éditeur se réduit pour que le dessin reste visible ; il reprend sa taille dès qu'on y retourne.
    const EDIT_H = 380, PLAY_H = 170;
    function compact(on) {
      if (root.classList.contains("playing") === on) return;
      root.classList.toggle("playing", on);
      cm.setSize(null, on ? PLAY_H : EDIT_H);
      if (mode === "blocs" && window.Blocs) setTimeout(() => Blocs.resize(), 0);
    }
    cm.on("focus", () => compact(false));
    edBlocks.addEventListener("pointerdown", () => compact(false));

    const setTab = (m) => {
      mode = m;
      bBlocs.classList.toggle("on", m === "blocs");
      bTexte.classList.toggle("on", m === "texte");
      edText.hidden = m !== "texte";
      edBlocks.hidden = m !== "blocs";
      if (m === "texte") setTimeout(() => cm.refresh(), 0); else window.Blocs && Blocs.resize();
    };
    async function toBlocks(code, puzzle = false) {
      try { await loadBlockly(); } catch (e) { showError("Blocs indisponibles : " + e.message); return false; }
      const why = Blocs.translatable(code);
      if (why) { showError(`Ce code ne se traduit pas en blocs (${why}). Reste en pseudo-code.`); return false; }
      edBlocks.hidden = false;
      if (!edBlocks.dataset.mounted || !document.body.contains(edBlocks.firstChild)) { Blocs.mount(edBlocks); edBlocks.dataset.mounted = "1"; Blocs.onChange(() => opts.onChange && opts.onChange()); }
      setTab("blocs");
      if (puzzle) Blocs.puzzle(code); else Blocs.load(code);
      return true;
    }
    bBlocs.addEventListener("click", async () => { if (mode === "blocs") return; hideError(); if (await toBlocks(cm.getValue())) { prefMode = "blocs"; store.set("algolab:mode", "blocs"); } });
    bTexte.addEventListener("click", () => { if (mode === "texte") return; hideError(); cm.setValue(Blocs.code()); setTab("texte"); prefMode = "texte"; store.set("algolab:mode", "texte"); });

    // Fait défiler l'éditeur seulement (jamais la page) pour montrer la ligne.
    function scrollEditor(line) {
      const top = cm.heightAtLine(line, "local");
      const info = cm.getScrollInfo();
      if (top < info.top + 20 || top > info.top + info.clientHeight - 40) cm.scrollTo(null, Math.max(0, top - info.clientHeight / 3));
    }
    function showError(msg, line) {
      errBox.hidden = false; errBox.textContent = "⚠️ " + msg;
      if (line && mode === "texte") { mark && cm.removeLineClass(mark, "background", "cm-line-err"); mark = cm.addLineClass(line - 1, "background", "cm-line-err"); scrollEditor(line - 1); }
    }
    function hideError() { errBox.hidden = true; if (mark !== null) { cm.removeLineClass(mark, "background", "cm-line-err"); cm.removeLineClass(mark, "background", "cm-line-run"); mark = null; } }

    function lineAt(i) { for (let j = i; j >= 0; j--) if (steps[j].line) return steps[j].line; return null; }
    function show(i) {
      if (!steps.length) return;
      cur = Math.max(0, Math.min(steps.length - 1, i));
      range.value = cur;
      pos.textContent = `étape ${cur + 1} / ${steps.length}`;
      Viz.render(vizbox, steps[cur], steps[cur - 1], { caption, end: cur === steps.length - 1 ? endNote : null });
      const line = lineAt(cur);
      const src = runCode.split("\n")[line - 1];
      curline.textContent = line ? `➜ ligne ${line} :  ${src ? src.trim() : ""}` : "";
      if (mode === "texte") {
        if (mark !== null) { cm.removeLineClass(mark, "background", "cm-line-run"); cm.removeLineClass(mark, "background", "cm-line-err"); }
        mark = line ? cm.addLineClass(line - 1, "background", "cm-line-run") : null;
        if (line) scrollEditor(line - 1);
      } else if (map && window.Blocs) Blocs.highlight(line ? map[line - 1] : null);
      cons.textContent = runOut.slice(0, steps[cur].out);
    }
    // Lecture automatique, à la vitesse choisie (lente par défaut pour suivre chaque étape).
    function play() {
      if (steps.length < 2) return;
      if (cur >= steps.length - 1) show(0);
      playBtn.textContent = "⏸ Pause";
      timer = setInterval(() => { if (cur >= steps.length - 1) return pause(); show(cur + 1); }, Number(speed.value));
    }
    function pause() { clearInterval(timer); timer = null; playBtn.textContent = "▶ Lecture"; }
    stopPlayer = pause;

    return {
      el: root, cm,
      get mode() { return mode; },
      code: () => (mode === "blocs" && window.Blocs ? Blocs.code() : cm.getValue()),
      async setCode(code, wanted = prefMode) {
        cm.setValue(code);
        if (wanted === "blocs" && await toBlocks(code)) return;
        setTab("texte");
      },
      puzzle: (code) => toBlocks(code, true),
      isPuzzle: () => mode === "blocs" && window.Blocs && Blocs.isPuzzle(),
      puzzleSolved: () => window.Blocs && Blocs.solved(),
      looseBlocks: () => (mode === "blocs" && window.Blocs ? Blocs.loose() : 0),
      error: showError, hideError,
      // trace : liste d'étapes ; code : texte exécuté ; out : sortie complète
      trace(tr, code, out, startAt = "end", cap = "", end = null) {
        pause();
        caption = cap; endNote = end;
        steps = tr?.steps || [];
        runCode = code; runOut = out || "";
        map = mode === "blocs" && window.Blocs ? Blocs.lineMap() : null;
        player.hidden = !steps.length;
        range.max = Math.max(0, steps.length - 1);
        if (!steps.length) return;
        // Réduit l'éditeur et amène le lecteur à l'écran (une seule fois, pas à chaque étape).
        compact(true);
        requestAnimationFrame(() => player.scrollIntoView({ block: "nearest", behavior: "smooth" }));
        show(startAt === "start" ? 0 : steps.length - 1);
        if (startAt === "play") { show(0); play(); }
      },
      hideTrace() { pause(); player.hidden = true; compact(false); },
    };
  }

  // ---------------- Pages ----------------
  const chapterOf = (id) => C.chapters.find((c) => c.id === id);
  // Les preuves sont facultatives : hors du parcours principal et de la progression.
  const practical = (exs) => exs.filter((e) => e.type !== "preuve");
  const allEx = practical(C.chapters.flatMap((c) => c.exercices));
  const examEx = allEx.filter((e) => e.source);
  const progressOf = (exs) => { const d = exs.filter((e) => P(e.id).done).length; return { d, n: exs.length, pct: exs.length ? Math.round((100 * d) / exs.length) : 0 }; };

  function home() {
    const g = progressOf(allEx);
    put(app, 
      h("h1", {}, "Maîtriser les structures de données, en pratiquant"),
      h("p", { class: "lead" }, "Pseudo-code du cours, blocs pour mémoriser la syntaxe, exécution pas à pas pour voir vivre les listes, piles, files et arbres, et les exercices des annales corrigés automatiquement."),
      (() => {
        // Point d'entrée : le chapitre 1 pour un débutant, sinon le prochain exercice pas encore réussi.
        const next = allEx.find((e) => !P(e.id).done);
        if (!g.d) return h("a", { class: "card start", href: `#/chap/${C.chapters[0].id}` }, h("b", {}, "🚀 Commencer ici"), h("span", { class: "muted" }, "Chapitre 1 : lis la fiche, regarde l'exemple s'exécuter pas à pas, puis fais le premier exercice."));
        return next ? h("a", { class: "card start", href: `#/ex/${next.id}` }, h("b", {}, `▶ Continuer : ${next.titre}`), h("span", { class: "muted" }, `${chapterOf(next.chapitre).titre} · prochain exercice pas encore réussi`)) : null;
      })(),
      h("div", { class: "card row" }, h("b", {}, `Progression : ${g.d} / ${g.n} exercices`), h("div", { class: "bar", style: "flex:1;min-width:160px" }, h("i", { style: `width:${g.pct}%` }))),
      h("h2", {}, "Exercices d'examen"),
      h("a", { class: "card chap", href: "#/sujets", style: "max-width:520px" }, h("span", { class: "ic" }, "🎯"), h("b", {}, `Les ${examEx.length} exercices tombés aux examens`), h("span", { class: "muted" }, `${examEx.filter((e) => P(e.id).done).length} réussis · classés par thème, à coder avec le résultat dessiné`)),
      h("h2", {}, "Parcours"),
      h("div", { class: "grid" }, C.chapters.map((ch, i) => {
        const p = progressOf(practical(ch.exercices));
        return h("a", { class: "card chap", href: `#/chap/${ch.id}` }, h("span", { class: "ic" }, ch.icone), h("b", {}, `${i + 1}. ${ch.titre}`), h("span", { class: "muted" }, `${p.d} / ${p.n} exercices`), h("div", { class: "bar" }, h("i", { style: `width:${p.pct}%` })));
      })),
      h("h2", {}, "S'entraîner sur les sujets"),
      h("div", { class: "grid" },
        h("a", { class: "card chap", href: "#/annales" }, h("span", { class: "ic" }, "📝"), h("b", {}, "Annales et examens blancs"), h("span", { class: "muted" }, `${C.annales.length} sujets, chaque exercice est jouable`)),
        h("a", { class: "card chap", href: "#/bac-a-sable" }, h("span", { class: "ic" }, "🧪"), h("b", {}, "Bac à sable"), h("span", { class: "muted" }, "Écris un programme libre et regarde-le s'exécuter")),
        h("a", { class: "card chap", href: "#/conventions" }, h("span", { class: "ic" }, "📘"), h("b", {}, "Syntaxe et conventions"), h("span", { class: "muted" }, "Tout le pseudo-code accepté"))),
    );
  }

  // ---------------- Journal d'utilisation (résumé envoyé par usage.js) ----------------
  const track = (id, f) => {
    const d = Usage.data;
    d.ex = d.ex || {};
    const e = (d.ex[id] = d.ex[id] || { tries: 0, hints: 0 });
    f(e);
    Usage.save();
  };
  const visit = (what) => { const d = Usage.data; d.pages = d.pages || []; if (!d.pages.includes(what)) d.pages.push(what); Usage.save(); };
  function summarize(d) {
    const exs = Object.entries(d.ex || {});
    const ok = exs.filter(([, e]) => e.ok).length;
    const line = ([id, e]) => {
      const ex = C.byId[id];
      const bits = [e.ok ? "réussi ✅" : e.tries ? "pas encore réussi" : "ouvert seulement", e.tries ? `${e.tries} essai${e.tries > 1 ? "s" : ""}` : "", e.best ? `meilleur score ${e.best}` : "", e.hints ? `${e.hints} indice${e.hints > 1 ? "s" : ""}` : "", e.puzzle ? "casse-tête" : "", e.sol ? "correction vue" : "", e.lint ? "remarques « à l'examen »" : ""].filter(Boolean);
      return `${id} · ${ex ? ex.titre : id} : ${bits.join(" · ")}`;
    };
    return {
      titre: `${exs.length} exercice${exs.length > 1 ? "s" : ""} travaillé${exs.length > 1 ? "s" : ""}, ${ok} réussi${ok > 1 ? "s" : ""}`,
      points: d.pages && d.pages.length ? [`Pages consultées : ${d.pages.join(", ")}`] : [],
      sections: exs.length ? [{ titre: "Exercices", points: exs.map(line) }] : [],
    };
  }

  function chapter(id) {
    visit(`chapitre « ${(chapterOf(id) || {}).titre || id} »`);
    const ch = chapterOf(id);
    if (!ch) return notFound();
    const idx = C.chapters.indexOf(ch);
    put(app, h("p", {}, h("a", { href: "#/" }, "← Parcours")), h("h1", {}, `${ch.icone} ${idx + 1}. ${ch.titre}`));
    put(app, h("div", { class: "card fiche", html: ch.fiche }));
    if (ch.demo) {
      const b = bench({ code: ch.demo, buttons: [h("button", { type: "button", on: { click: () => runMain(b, "play") } }, "▶ Exécuter l'exemple")], onRun: () => runMain(b, "play") });
      put(app, h("h2", {}, "Exemple à exécuter pas à pas"), b.el);
      b.setCode(ch.demo, "texte");
    }
    const main = practical(ch.exercices), proofs = ch.exercices.filter((e) => e.type === "preuve");
    put(app, h("h2", {}, "Exercices"), h("div", { class: "exlist" }, [...main.filter((e) => e.source), ...main.filter((e) => !e.source)].map((ex) => exRow(ex))));
    if (proofs.length) put(app, h("details", { class: "card", style: "margin-top:14px" }, h("summary", {}, `Pour aller plus loin : preuves (facultatif, ${proofs.length})`), h("div", { class: "exlist", style: "margin-top:8px" }, proofs.map((ex) => exRow(ex)))));
    const next = C.chapters[idx + 1];
    if (next) put(app, h("p", {}, h("a", { href: `#/chap/${next.id}` }, `Chapitre suivant : ${next.titre} →`)));
  }
  const exRow = (ex, label) => h("a", { class: "card exrow", href: `#/ex/${ex.id}` }, h("span", { class: "st" }, icon(ex.id)), h("span", { class: "t" }, label ? h("b", {}, label + " · ") : null, ex.titre), ex.source ? h("span", { class: "chip c" }, "annales") : null, h("span", { class: "chip" }, ex.type === "atelier" ? "atelier" : ex.type === "preuve" ? "preuve" : "code"));

  function runMain(b, startAt) {
    b.hideError();
    const code = b.code();
    let prog;
    try { prog = A.parse(code); } catch (e) { b.error(e.message, e.line); return; }
    const it = new A.Interp(prog, { trace: true });
    try { it.runMain(); } catch (e) { b.error(e.message, e.line); }
    b.trace({ steps: it.trace }, code, it.out, startAt);
  }

  // ---------------- Exercice ----------------
  const examState = () => store.get("algolab:exam", null);
  function exercise(id, examId) {
    const ex = C.byId[id];
    if (!ex) return notFound();
    track(ex.id, () => {});
    const ch = chapterOf(ex.chapitre);
    const exam = examId && examState()?.id === examId && !examState().end ? examState() : null;
    const left = h("div", { class: "left" });
    const right = h("div", { class: "right" });
    put(app, h("div", { class: "ex" }, left, right));
    put(left, 
      h("p", { class: "muted" }, exam ? h("a", { href: `#/examen/${exam.id}` }, "← Retour au sujet") : h("a", { href: `#/chap/${ch.id}` }, `← ${ch.titre}`)),
      h("h1", {}, ex.titre),
      ex.source ? h("div", { class: "chips" }, ex.source.map((s) => h("span", { class: "chip c" }, s))) : null,
      h("div", { class: "card enonce", html: ex.enonce }),
    );
    if (ex.type === "atelier") return atelier(ex, left, right);
    if (ex.type === "preuve") return preuve(ex, left, right, exam);

    const c = ex.contraintes || {};
    const tags = [c.recursif && "récursif exigé", ...(c.interdits || []).map((x) => ({ pile: "sans pile", file: "sans file", list: "pas de liste", tree: "pas d'arbre", array: "pas de tableau" })[x]), ...(c.requis || []).map((x) => `${x} obligatoire`), c.sansNew && "aucun nouveau nœud (pas de new)", c.maxVariables !== undefined && "une seule variable"].filter(Boolean);
    if (tags.length) put(left, h("div", { class: "constraints" }, tags.map((t) => h("span", {}, t))));
    if (ex.recursive) put(left, h("p", { class: "fb ok" }, "🔁 Itératif ou récursif : les deux sont acceptés (tu peux aussi écrire des fonctions auxiliaires)."));
    const testedName = h("span");
    put(left, h("p", { class: "muted" }, "Nomme ta fonction comme tu veux (paramètres dans l'ordre de l'énoncé) : le site trouve ta fonction principale. Ctrl+Entrée pour tester. ", testedName));

    // Tableau des tests
    const tbody = h("tbody");
    const verdict = h("div", { class: "verdict", hidden: true });
    put(left, h("div", { class: "card" }, h("b", {}, "Tests"), h("div", { class: "tests-wrap" }, h("table", { class: "tests" }, h("thead", {}, h("tr", {}, h("th", {}, ""), h("th", {}, "Entrée"), h("th", {}, "Attendu"), h("th", {}, "Obtenu"))), tbody)), verdict));
    // Entrées, attendu et obtenu sont dessinés (listes, piles, files, arbres), pas écrits.
    const pre = T.preview(ex);
    const draw = (kind, v) => Viz.mini(kind, v);
    const fillTests = (results, sel) => {
      tbody.innerHTML = "";
      ex.tests.forEach((t, i) => {
        const r = results && results[i];
        const tr = h("tr", { class: `${r ? (r.ok ? "ok" : "ko") : ""}${i === sel ? " sel" : ""}${results ? " pick" : ""}`, title: results ? "Clique pour voir l'exécution de ce test" : null, on: { click: () => results && run(i) } },
          h("td", {}, r ? (r.ok ? "✓" : "✗") : "·"),
          h("td", {}, h("div", { class: "args" }, pre[i].argsRaw.map((a) => draw(a.kind, a.value)))),
          h("td", {}, draw(ex.check, pre[i].expRaw)),
          h("td", {}, !r ? "" : r.error ? h("span", { class: "err" }, r.error) : draw(ex.check, r.gotRaw)));
        tbody.append(tr);
      });
    };
    fillTests(null);

    // Aides
    const p = P(ex.id);
    const aids = h("div", { class: "card", hidden: !!exam });
    const hintList = h("ol", { class: "hints" });
    const hintBtn = h("button", { type: "button", class: "alt" });
    const puzzleBtn = h("button", { type: "button", class: "alt" }, "🧩 Casse-tête : la correction en blocs mélangés");
    // Correction : version du cours, et version récursive quand elle existe.
    const solPre = h("pre", {}, ex.correction);
    const solTabs = ex.recursive ? h("div", { class: "tabs" }, ...[["Itérative", ex.correction], ["Récursive", ex.recursive]].map(([lbl, code], i) => {
      const bt = h("button", { type: "button", class: i ? "" : "on" }, lbl);
      bt.addEventListener("click", () => { solTabs.querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === bt)); solPre.textContent = code; });
      return bt;
    })) : null;
    const solBox = h("div", { hidden: true }, solTabs, solPre, h("p", { class: "fb ok" }, `Complexité : ${ex.complexite.bonne}. ${ex.complexite.pourquoi}`));
    const solBtn = h("button", { type: "button", class: "alt" }, "✅ Voir la correction");
    let shown = 0;
    // La correction se débloque après 3 essais ou tous les indices : on cherche d'abord.
    const SOL_TRIES = 3;
    const solReady = () => p.done || p.sol || (p.tries || 0) >= SOL_TRIES || shown >= ex.indices.length;
    const renderSol = () => {
      solBtn.disabled = !solReady();
      if (p.done) solBtn.textContent = "✅ Comparer avec la correction";
      else solBtn.textContent = solReady() ? "✅ Voir la correction" : `🔒 Correction : après ${SOL_TRIES} essais (${p.tries || 0}/${SOL_TRIES}) ou tous les indices`;
    };
    const renderHints = () => {
      hintList.innerHTML = "";
      ex.indices.slice(0, shown).forEach((t) => hintList.append(h("li", {}, t)));
      hintBtn.textContent = shown < ex.indices.length ? `💡 Indice (${shown} / ${ex.indices.length} affichés)` : "💡 Tous les indices sont affichés";
      hintBtn.disabled = shown >= ex.indices.length;
      puzzleBtn.hidden = shown < 2;
      renderSol();
    };
    hintBtn.addEventListener("click", () => { shown++; p.hints = Math.max(p.hints || 0, shown); save(); renderHints(); track(ex.id, (e) => { e.hints = Math.max(e.hints, shown); }); });
    puzzleBtn.addEventListener("click", async () => { if (await b.puzzle(ex.correction)) { p.hints = Math.max(p.hints || 0, ex.indices.length); save(); track(ex.id, (e) => { e.puzzle = true; }); } });
    solBtn.addEventListener("click", () => {
      if (!p.done && !confirm("Voir la correction maintenant ? Essaie encore un peu : tu peux te tromper et recommencer autant que tu veux.")) return;
      p.sol = true; save(); solBox.hidden = false; solBtn.hidden = true; track(ex.id, (e) => { e.sol = true; });
    });
    renderHints();
    put(aids, h("b", {}, "Besoin d'aide ?"), hintList, h("div", { class: "row" }, hintBtn, puzzleBtn, solBtn), solBox);
    put(left, aids);

    // Établi
    const runBtn = h("button", { type: "button", on: { click: () => run() } }, "▶ Tester");
    const resetBtn = h("button", { type: "button", class: "alt", on: { click: () => { if (confirm("Revenir au code de départ ? Ton travail sera remplacé.")) b.setCode(ex.depart, b.mode); } } }, "↺ Départ");
    const b = bench({ buttons: [runBtn, resetBtn], onRun: () => run(), onChange: () => { p.code = b.code(); save(); } });
    put(right, b.el);
    b.setCode(p.code || ex.depart);

    function run(traceIdx) {
      stopPlayer();
      b.hideError();
      const code = b.code();
      p.code = code; p.tried = true; save();
      let r = T.run(code, ex, traceIdx ?? 0);
      if (r.parseError) { verdict.hidden = false; verdict.className = "verdict ko"; verdict.textContent = "Le code ne se lit pas : corrige l'erreur indiquée."; b.error(r.parseError, r.line); b.hideTrace(); fillTests(null); return; }
      testedName.textContent = r.extra ? `Fonction testée : ${r.fonction} (ses ${r.extra} dernier(s) paramètre(s) reçoivent vide).` : `Fonction testée : ${r.fonction}.`;
      const firstKo = r.results.findIndex((x) => !x.ok);
      if (traceIdx === undefined && firstKo > 0) r = T.run(code, ex, firstKo);
      const sel = traceIdx ?? Math.max(0, firstKo);
      fillTests(r.results, sel);
      const allOk = r.results.every((x) => x.ok);
      const success = allOk && !r.constraints.length;
      verdict.hidden = false;
      verdict.className = `verdict ${success ? "ok" : "ko"}`;
      verdict.innerHTML = "";
      if (success) {
        put(verdict, h("span", {}, p.done ? "✅ Tous les tests passent." : "✅ Bravo, tous les tests passent !"));
        if (!p.done) { p.done = true; save(); }
        if (b.looseBlocks()) put(verdict, h("div", { class: "muted" }, "Des blocs non reliés ont été ignorés."));
      } else {
        const n = r.results.filter((x) => x.ok).length;
        put(verdict, h("div", {}, `${n} / ${r.results.length} tests réussis. Corrige et recommence autant que tu veux.`));
        r.constraints.forEach((m) => put(verdict, h("div", {}, "⚠️ " + m)));
        const ko = r.results[sel];
        if (ko && ko.error) b.error(ko.error, ko.line);
      }
      // Ce qu'un correcteur d'examen sanctionnerait, même si les tests passent.
      const warn = A.lint(code, r.prog);
      if (warn.length) put(verdict, h("div", { class: "lint" }, h("b", {}, "📝 À l'examen, le correcteur attendrait aussi :"), h("ul", {}, warn.map((w) => h("li", {}, `Ligne ${w.line} : ${w.msg}`)))));
      if (traceIdx === undefined) {
        p.tries = (p.tries || 0) + 1; save(); renderSol();
        const n = r.results.filter((x) => x.ok).length;
        track(ex.id, (e) => { e.tries++; e.ok = e.ok || success; e.best = `${Math.max(n, Number((e.best || "0").split("/")[0]))}/${r.results.length}`; e.lint = warn.length > 0; });
      }
      if (exam) { const st = examState(); st.results = { ...(st.results || {}), [ex.id]: success }; store.set("algolab:exam", st); }
      const tr = r.results[sel];
      const end = tr.ok ? { ok: true, text: `✓ Test ${sel + 1} : obtenu ${tr.got}, c'est bien l'attendu.` } : { ok: false, text: `✗ Test ${sel + 1} : attendu ${tr.expected}, obtenu ${tr.error ? "une erreur" : tr.got}.` };
      b.trace(tr.trace, code, tr.out, "play", `Test ${sel + 1} rejoué : ${r.fonction}(${[...tr.args, ...Array(r.extra || 0).fill("vide")].join(" ; ")}). Les paramètres reçoivent les valeurs de ce test.`, end);
    }
  }

  function atelier(ex, left, right) {
    const box = h("div", { class: "card" });
    put(right, box);
    put(left, h("p", { class: "muted" }, "Atelier interactif : fais chaque étape toi-même, l'app vérifie et explique. « Montre-moi » fait l'étape à ta place si tu bloques."));
    Ateliers[ex.atelier](box, ex, () => { P(ex.id).done = true; save(); track(ex.id, (e) => { e.ok = true; }); });
  }

  function preuve(ex, left, right, exam) {
    const box = h("div", { class: "card" });
    put(right, h("h2", {}, "Vérifier sur des exemples"), box);
    Ateliers.verifier(box, ex.verifier);
    const list = h("ol", { class: "steps" });
    let k = 0;
    const nextBtn = h("button", { type: "button" }, "Étape suivante de la preuve");
    const renderSteps = () => { list.innerHTML = ""; ex.etapes.slice(0, k).forEach((t) => list.append(h("li", { html: t }))); nextBtn.hidden = k >= ex.etapes.length; };
    nextBtn.addEventListener("click", () => { k++; renderSteps(); });
    renderSteps();
    const fb = h("div");
    const q = h("div", { class: "card" }, h("b", {}, ex.qcm.question), h("div", { class: "qcm" }, ex.qcm.choix.map((c, i) => h("button", { type: "button", class: "alt", on: { click: () => { fb.innerHTML = ""; put(fb, h("p", { class: `fb ${i === ex.qcm.bonne ? "ok" : "ko"}` }, i === ex.qcm.bonne ? "Exact ✔" : "Non, réessaie.")); if (i === ex.qcm.bonne) { P(ex.id).done = true; save(); track(ex.id, (e) => { e.ok = true; }); } } } }, c))), fb);
    put(left, h("p", { class: "muted" }, "Essaie d'abord de rédiger la preuve sur papier, puis compare étape par étape."), q);
    if (!exam) put(left, h("div", { class: "card" }, h("b", {}, "Preuve rédigée"), list, nextBtn));
  }

  // ---------------- Annales et examen blanc ----------------
  function annales() {
    put(app, h("p", {}, h("a", { href: "#/" }, "← Parcours")), h("h1", {}, "📝 Annales"), h("p", { class: "lead" }, "Chaque exercice des sujets est jouable : tests automatiques, exécution pas à pas, correction. Le mode examen blanc chronomètre 2 h et cache les aides jusqu'à la fin."));
    C.annales.forEach((a) => {
      put(app, h("div", { class: "card", style: "margin:12px 0" },
        h("div", { class: "row" }, h("h2", { style: "margin:0;flex:1" }, `${a.titre} `, h("span", { class: "muted" }, a.annee)), h("a", { href: `#/examen/${a.id}` }, h("button", { type: "button" }, "⏱ Examen blanc (2 h)"))),
        h("div", { class: "exlist", style: "margin-top:8px" }, a.items.map(([lbl, id]) => exRow(C.byId[id], lbl)))));
    });
  }

  function sujets() {
    put(app, h("p", {}, h("a", { href: "#/" }, "← Parcours")), h("h1", {}, "🎯 Exercices d'examen"), h("p", { class: "lead" }, "Tous les exercices tombés aux sujets, classés par thème. Chacun se code (ou se manipule) et montre le résultat dessiné."));
    C.chapters.forEach((ch) => {
      const exs = practical(ch.exercices).filter((e) => e.source);
      if (exs.length) put(app, h("h2", {}, `${ch.icone} ${ch.titre}`), h("div", { class: "exlist" }, exs.map((ex) => exRow(ex))));
    });
  }

  function examen(id) {
    const a = C.annales.find((x) => x.id === id);
    if (!a) return notFound();
    visit(`examen blanc « ${a.titre} »`);
    let st = examState();
    put(app, h("p", {}, h("a", { href: "#/annales" }, "← Annales")), h("h1", {}, `⏱ ${a.titre}`));
    const ids = [...new Set(a.items.map(([, x]) => x))];
    if (!st || st.id !== id) {
      put(app, h("div", { class: "card" }, h("p", {}, "Durée : 2 h. Aucun document. Les indices, casse-têtes et corrections sont cachés jusqu'à la fin. Les tests automatiques restent disponibles : ils jouent le rôle du correcteur."), h("p", {}, `${ids.length} exercices.`),
        h("button", { type: "button", on: { click: () => { store.set("algolab:exam", { id, start: Date.now(), results: {} }); render(); } } }, "Commencer l'examen")));
      return;
    }
    if (!st.end) {
      put(app, h("div", { class: "exlist" }, a.items.map(([lbl, x]) => h("a", { class: "card exrow", href: `#/ex/${x}?exam=${id}` }, h("span", { class: "st" }, st.results?.[x] ? "✅" : "○"), h("span", { class: "t" }, h("b", {}, lbl + " · "), C.byId[x].titre)))),
        h("p", {}, h("button", { type: "button", on: { click: () => { if (confirm("Terminer l'examen ?")) { st.end = Date.now(); store.set("algolab:exam", st); render(); } } } }, "Terminer l'examen")));
      return;
    }
    const mins = Math.round((st.end - st.start) / 60000);
    const codeIds = ids.filter((x) => !C.byId[x].type);
    const ok = codeIds.filter((x) => st.results?.[x]).length;
    put(app, h("div", { class: "card exam-end" }, h("b", {}, `Examen terminé en ${mins} min.`), h("span", {}, `Exercices de code réussis : ${ok} / ${codeIds.length}.`), h("span", { class: "muted" }, "Les ateliers et preuves se refont en mode normal avec la correction."),
      h("div", { class: "exlist" }, a.items.map(([lbl, x]) => exRow(C.byId[x], `${st.results?.[x] ? "✅" : "✗"} ${lbl}`))),
      h("button", { type: "button", class: "alt", on: { click: () => { store.set("algolab:exam", null); render(); } } }, "Recommencer ce sujet")));
  }

  function examBanner() {
    const el = document.getElementById("exam-banner");
    const st = examState();
    if (!st || st.end) { el.hidden = true; return; }
    const left = 2 * 3600 - Math.floor((Date.now() - st.start) / 1000);
    el.hidden = false;
    el.innerHTML = "";
    const t = left > 0 ? `${Math.floor(left / 3600)} h ${String(Math.floor((left % 3600) / 60)).padStart(2, "0")} min` : "temps écoulé";
    el.append(h("a", { href: `#/examen/${st.id}` }, `⏱ Examen blanc : ${t}`));
  }
  setInterval(examBanner, 20000);

  // ---------------- Bac à sable et syntaxe ----------------
  const SANDBOX = `fonction sans retour ajouter_feuille(x : entier; var A : Arbre)
début
    si (A = vide) alors
        new(A);
        A->val ← x;
    sinon si (x < A->val) alors
        ajouter_feuille(x, A->g);
    sinon
        ajouter_feuille(x, A->d);
    finsi
fin

début
    Arbre A;
    Liste L, p;
    Pile P;
    entier i;
    A ← vide;
    L ← vide;
    pour i allant de 1 à 5 faire
        ajouter_feuille((i * 37) mod 11, A);
        new(p);
        p->valeur ← i * 10;
        p->suivant ← L;
        L ← p;
        empiler(P, i);
    finpour
fin`;
  function sandbox() {
    visit("bac à sable");
    put(app, h("p", {}, h("a", { href: "#/" }, "← Parcours")), h("h1", {}, "🧪 Bac à sable"), h("p", { class: "lead" }, "Écris des fonctions et un programme principal « début … fin », puis regarde l'exécution étape par étape."));
    const saved = store.get("algolab:sandbox", null);
    const b = bench({ buttons: [h("button", { type: "button", on: { click: () => runMain(b, "end") } }, "▶ Exécuter"), h("button", { type: "button", class: "alt", on: { click: () => b.setCode(SANDBOX, b.mode) } }, "↺ Exemple")], onRun: () => runMain(b, "end"), onChange: () => store.set("algolab:sandbox", b.code()) });
    put(app, b.el);
    b.setCode(saved || SANDBOX, "texte");
  }

  function conventions() {
    put(app, h("p", {}, h("a", { href: "#/" }, "← Parcours")), h("h1", {}, "📘 Syntaxe et conventions"), h("div", { class: "card fiche", html: `
<h2>Structure</h2>
<pre>fonction avec retour entier nom(Liste L, entier x)
début
    entier n;          // déclarations (aussi possibles avant début)
    …
    retourner n;
fin

fonction sans retour nom(x : entier; var A : Arbre)   // var : l'appelant voit les modifications
début … fin

début              // programme principal (bac à sable, exemples)
    …
fin</pre>
<h2>Instructions</h2>
<ul>
<li>Affectation : <code>x ← e;</code> (ou <code>&lt;-</code>, <code>:=</code>). Les <code>;</code> sont facultatifs.</li>
<li><code>si (c) alors … sinon … finsi</code> · <code>sinon si</code> sur la même ligne enchaîne sans finsi supplémentaire ; <code>sinon</code> puis <code>si</code> à la ligne ouvre un si imbriqué (avec son propre finsi).</li>
<li><code>tant que (c) faire … fintantque</code> · <code>pour i allant de a à b faire … finpour</code> (b compris, <code>pas</code> possible) · <code>répéter … jusqu'à (c)</code></li>
<li><code>retourner e;</code> · <code>écrire(a, b);</code></li>
</ul>
<h2>Expressions</h2>
<ul>
<li>Comparaisons <code>=</code> <code>≠</code> (<code>!=</code>, <code>&lt;&gt;</code>) <code>&lt;</code> <code>&gt;</code> <code>&lt;=</code> <code>&gt;=</code> · logique <code>et</code> <code>ou</code> <code>non</code> (évaluation paresseuse : <code>p ≠ vide et p->valeur = x</code> est sûr).</li>
<li><code>+ - * /</code>, <code>mod</code> (reste), <code>div</code> (quotient entier) · <code>vrai</code>, <code>faux</code>, <code>vide</code>.</li>
<li>Caractère <code>i</code> d'une chaîne : <code>ch[i]</code> (à partir de 0), <code>longueur(ch)</code>, <code>estchiffre(c)</code>, <code>atoi(c)</code>.</li>
</ul>
<h2>Types et pointeurs</h2>
<ul>
<li>Types : <code>entier</code>, <code>reel</code>, <code>booleen</code>, <code>caractere</code>, <code>chaine</code>, <code>Liste</code>, <code>Arbre</code>, <code>Pile</code>, <code>File</code>.</li>
<li>Liste : <code>L->valeur</code>, <code>L->suivant</code>, <code>L->precedent</code> (aussi <code>val</code>, <code>suiv</code>, <code>prec</code>).</li>
<li>Arbre : <code>A->val</code>, <code>A->g</code>, <code>A->d</code> (aussi <code>valeur</code>, <code>gauche</code>, <code>droit</code>).</li>
<li><code>L ← creerListe(x, L);</code> crée une cellule de valeur x placée <b>devant</b> L (ne modifie pas L, il faut récupérer le résultat). <code>creerArbre(x, G, D)</code> crée un nœud de valeur x avec ses deux sous-arbres.</li>
<li><code>new(p);</code> crée une cellule (si p est une Liste) ou un nœud (si p est un Arbre), avec les pointeurs à <code>vide</code>.</li>
</ul>
<h2>Piles et files</h2>
<ul>
<li><code>Pile P;</code> est une pile vide. <code>empiler(P, x);</code> · <code>P ← dépiler(P);</code> (retire le sommet) · <code>sommet(P)</code> · <code>estvide(P)</code>.</li>
<li><code>File F;</code> · <code>enfiler(F, x);</code> · <code>F ← défiler(F);</code> · <code>tête(F)</code> · <code>estvide(F)</code>.</li>
</ul>
<h2>Conventions des exercices</h2>
<ul>
<li>Positions dans une liste ou une pile : à partir de 1 (1 = tête / sommet).</li>
<li>Hauteur d'une feuille = 0, de l'arbre vide = −1.</li>
<li>ABR : les valeurs égales vont à droite. Suppression d'un nœud à deux fils : plus grand du sous-arbre gauche ou plus petit du sous-arbre droit (les deux sont acceptés).</li>
</ul>` }));
  }

  function notFound() { put(app, h("p", {}, "Page introuvable. ", h("a", { href: "#/" }, "Retour au parcours"))); }

  function render() {
    stopPlayer();
    app.innerHTML = "";
    window.scrollTo(0, 0);
    const [path, query] = (location.hash.slice(1) || "/").split("?");
    const parts = path.split("/").filter(Boolean);
    const q = new URLSearchParams(query || "");
    if (!parts.length) home();
    else if (parts[0] === "chap") chapter(parts[1]);
    else if (parts[0] === "ex") exercise(parts[1], q.get("exam"));
    else if (parts[0] === "annales") annales();
    else if (parts[0] === "sujets") sujets();
    else if (parts[0] === "examen") examen(parts[1]);
    else if (parts[0] === "bac-a-sable") sandbox();
    else if (parts[0] === "conventions") conventions();
    else notFound();
    examBanner();
  }
  Usage.start("algo_lab", summarize);
  window.addEventListener("hashchange", render);
  render();
})();
