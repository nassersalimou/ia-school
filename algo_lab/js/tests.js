/* Exécution des tests d'un exercice et vérification des contraintes de l'énoncé (récursif, sans pile, …). */
(function (root) {
  "use strict";
  const A = typeof module !== "undefined" && module.exports ? require("./lang.js") : root.Algo;

  function buildArg(spec) {
    if (Array.isArray(spec) && typeof spec[0] === "string" && A.build[spec[0]]) return A.build[spec[0]](spec[1]);
    return spec;
  }

  // Valeur lue pour comparaison selon le type de résultat attendu.
  function readAs(check, v, out) {
    switch (check) {
      case "sortie": return out.trim().split(/\s+/).filter(Boolean).join(" ");
      case "liste": return A.read.liste(v);
      case "listeD": return A.read.listeD(v);
      case "pile": return A.read.pile(v);
      case "file": return A.read.file(v);
      case "arbre": return A.read.arbre(v);
      default: return v;
    }
  }

  function showAs(check, v) {
    if (v === undefined) return "—";
    switch (check) {
      case "sortie": return v === "" ? "(rien)" : v;
      case "liste": case "listeD": return Array.isArray(v) ? A.fmt.liste(v) : A.show(v);
      case "pile": return Array.isArray(v) ? A.fmt.pile(v) : A.show(v);
      case "file": return Array.isArray(v) ? A.fmt.file(v) : A.show(v);
      case "arbre": return v === null || Array.isArray(v) ? A.fmt.arbre(v) : A.show(v);
      default: return A.show(v);
    }
  }

  function showArg(spec) {
    if (Array.isArray(spec) && typeof spec[0] === "string" && A.build[spec[0]]) {
      const [k, v] = spec;
      if (k === "liste" || k === "listeD") return A.fmt.liste(v);
      if (k === "pile") return A.fmt.pile(v);
      if (k === "file") return A.fmt.file(v);
      if (k === "arbre") return A.fmt.arbre(v === null ? null : normTree(v));
      if (k === "abr") return `ABR des insertions ${v.join(", ")}`;
    }
    return typeof spec === "string" ? `"${spec}"` : A.show(spec);
  }
  const normTree = (t) => (t === null || t === undefined ? null : Array.isArray(t) ? [t[0], normTree(t[1]), normTree(t[2])] : [t, null, null]);

  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  // Contraintes de l'énoncé, vérifiées sur le code (pas seulement sur les résultats).
  function constraints(prog, ex) {
    const c = ex.contraintes || {};
    const info = A.analyse(prog, ex.fonction);
    const msgs = [];
    const usesPile = info.types.has("pile") || ["empiler", "depiler", "sommet", "creerpile"].some((f) => info.calls.has(f));
    const usesFile = info.types.has("file") || ["enfiler", "defiler", "tete", "creerfile"].some((f) => info.calls.has(f));
    if (c.recursif && !info.recursive) msgs.push("L'énoncé demande un algorithme récursif : ta fonction doit s'appeler elle-même.");
    for (const x of c.interdits || []) {
      if (x === "pile" && usesPile) msgs.push("L'énoncé interdit d'utiliser une pile.");
      if (x === "file" && usesFile) msgs.push("L'énoncé interdit d'utiliser une file.");
      if (x === "list" && info.types.has("list")) msgs.push("N'utilise que des piles et des entiers (pas de liste).");
      if (x === "tree" && info.types.has("tree")) msgs.push("N'utilise que des piles et des entiers (pas d'arbre).");
      if (x === "array" && info.types.has("array")) msgs.push("N'utilise que des piles et des entiers (pas de tableau).");
    }
    for (const x of c.requis || []) if (x === "pile" && !usesPile) msgs.push("L'énoncé impose d'utiliser une PILE.");
    if (c.sansNew && ["new", "nouveau", "allouer", "creer", "malloc", "creerliste", "creercellule", "cons", "creerarbre", "creernoeud"].some((f) => info.calls.has(f))) msgs.push("Il ne faut créer aucun nouveau nœud (pas de new).");
    if (c.maxVariables !== undefined && info.decls > c.maxVariables) msgs.push(`Une seule variable est autorisée : tu en déclares ${info.decls}.`);
    return msgs;
  }

  // Le nom de la fonction est libre : on prend celle de l'énoncé si elle existe, sinon la fonction principale
  // (bon nombre de paramètres, appelée par aucune autre fonction).
  function resolveFn(prog, ex) {
    const fns = Object.values(prog.functions);
    if (prog.functions[A.norm(ex.fonction)]) return { name: prog.functions[A.norm(ex.fonction)].name };
    if (!fns.length) return { error: "Écris une fonction (fonction avec retour … ou fonction sans retour …)." };
    const arity = ex.tests[0].args.length;
    let cand = fns.filter((f) => f.params.length === arity);
    // Version à accumulateur (ex. rever(L, R) appelée avec rever(L, vide)) : les paramètres en plus reçoivent vide.
    if (!cand.length) {
      const more = fns.filter((f) => f.params.length > arity && !f.params.slice(arity).some((pm) => pm.ref));
      if (more.length === 1) return { name: more[0].name, extra: more[0].params.length - arity };
      return { error: `Ta fonction doit avoir ${arity} paramètre(s), comme dans l'énoncé.` };
    }
    if (cand.length > 1) {
      const calledBy = (f) => fns.some((g) => g !== f && A.analyse(prog, g.name).calls.has(A.norm(f.name).replace(/_/g, "")));
      const top = cand.filter((f) => !calledBy(f));
      if (top.length) cand = top;
    }
    if (cand.length > 1) return { error: `Plusieurs fonctions pourraient être la réponse (${cand.map((f) => f.name).join(", ")}) : garde une seule fonction principale.` };
    return { name: cand[0].name };
  }

  // Lance tous les tests. traceIndex : numéro du test dont on enregistre l'exécution pas à pas.
  function run(src, ex, traceIndex = 0) {
    let prog;
    try { prog = A.parse(src); } catch (e) { return { parseError: e.message, line: e.line, results: [], constraints: [] }; }
    const fn = resolveFn(prog, ex);
    if (fn.error) return { parseError: fn.error, results: [], constraints: [] };
    const exNamed = { ...ex, fonction: fn.name };
    const results = ex.tests.map((t, i) => {
      const it = new A.Interp(prog, { trace: i === traceIndex });
      const exp = ex.check === "arbre" ? normTree(t.attendu) : t.attendu;
      const res = { args: t.args.map(showArg), argsRaw: t.args.map(rawArg), expected: showAs(ex.check, exp), expRaw: exp };
      try {
        const args = [...t.args.map(buildArg), ...Array(fn.extra || 0).fill(null)];
        const r = it.callWith(fn.name, args);
        const v = ex.apres !== undefined ? r.after[ex.apres] : r.result;
        const got = readAs(ex.check, v, it.out);
        res.got = showAs(ex.check, got);
        res.gotRaw = got;
        res.ok = same(got, exp) || (t.alt !== undefined && same(got, normTree(t.alt)));
      } catch (e) {
        res.ok = false;
        res.error = e.message;
        res.line = e.line;
      }
      res.out = it.out;
      if (i === traceIndex) res.trace = { steps: it.trace || [], truncated: it.truncated };
      return res;
    });
    return { results, constraints: constraints(prog, exNamed), prog, fonction: fn.name, extra: fn.extra || 0 };
  }

  // Entrée d'un test sous forme dessinable : {kind, value}.
  function rawArg(spec) {
    if (Array.isArray(spec) && typeof spec[0] === "string" && A.build[spec[0]]) {
      const [k, v] = spec;
      if (k === "abr") return { kind: "arbre", value: A.read.arbre(A.build.abr(v)) };
      if (k === "arbre") return { kind: "arbre", value: normTree(v) };
      return { kind: k === "listeD" ? "liste" : k, value: v };
    }
    return { kind: "valeur", value: spec };
  }

  // Entrées et résultat attendu de chaque test, à dessiner avant même de lancer les tests.
  const preview = (ex) => ex.tests.map((t) => ({ argsRaw: t.args.map(rawArg), expRaw: ex.check === "arbre" ? normTree(t.attendu) : t.attendu }));

  const api = { run, buildArg, showArg, constraints, resolveFn, preview };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Tests = api;
})(typeof window !== "undefined" ? window : globalThis);
