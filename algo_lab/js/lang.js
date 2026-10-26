/* Pseudo-code du cours (L2 « Structures de données fondamentales ») : lexer, parser, interpréteur avec trace.
   Syntaxe : fonction avec retour entier f(Liste L) … début … fin, si … alors … sinon … finsi,
   tant que … faire … fintantque, pour i allant de a à b faire … finpour, L->suivant, empiler(P, x), new(p), var. */
(function (root) {
  "use strict";

  const norm = (s) => s.replace(/œ/g, "oe").replace(/Œ/g, "OE").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  class AlgoError extends Error {
    constructor(msg, line) { super(line ? `Ligne ${line} : ${msg}` : msg); this.line = line; this.raw = msg; }
  }

  // ---------------- Lexer ----------------
  const SYMBOLS = [["<-", "←"], [":=", "←"], ["->", "->"], ["→", "->"], ["<=", "<="], [">=", ">="], ["≤", "<="], ["≥", ">="],
    ["!=", "≠"], ["<>", "≠"], ["≠", "≠"], ["==", "="], ["←", "←"], ["=", "="], ["<", "<"], [">", ">"], ["+", "+"], ["-", "-"],
    ["*", "*"], ["×", "*"], ["/", "/"], ["÷", "/"], ["%", "mod"], ["(", "("], [")", ")"], ["[", "["], ["]", "]"], [",", ","],
    [";", ";"], [":", ":"], [".", "."]];
  const QUOTES = { '"': '"', "'": "'", "“": "”", "«": "»", "‘": "’" };

  function lex(src) {
    const toks = [];
    let i = 0, line = 1;
    while (i < src.length) {
      const c = src[i];
      if (c === "\n") { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (src.startsWith("//", i) || c === "#") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (src.startsWith("/*", i)) {
        const end = src.indexOf("*/", i + 2);
        const stop = end < 0 ? src.length : end + 2;
        for (; i < stop; i++) if (src[i] === "\n") line++;
        continue;
      }
      if (/[0-9]/.test(c)) {
        const m = /^[0-9]+(\.[0-9]+)?/.exec(src.slice(i));
        toks.push({ t: "num", v: Number(m[0]), line });
        i += m[0].length;
        continue;
      }
      if (QUOTES[c]) {
        const close = QUOTES[c];
        let j = i + 1, s = "";
        while (j < src.length && src[j] !== close && src[j] !== "\n") {
          if (src[j] === "\\" && j + 1 < src.length) { s += { n: "\n", t: "\t" }[src[j + 1]] ?? src[j + 1]; j += 2; } else s += src[j++];
        }
        if (src[j] !== close) throw new AlgoError("guillemet non fermé", line);
        toks.push({ t: "str", v: s, line });
        i = j + 1;
        continue;
      }
      const id = /^[A-Za-z_À-ɏ][\wÀ-ɏ]*/.exec(src.slice(i));
      if (id) {
        let word = id[0];
        i += word.length;
        // jusqu'à
        if (norm(word) === "jusqu" && (src[i] === "'" || src[i] === "’")) {
          const rest = /^[A-Za-zÀ-ɏ]+/.exec(src.slice(i + 1));
          if (rest) { word += "'" + rest[0]; i += 1 + rest[0].length; }
        }
        toks.push({ t: "id", v: word, n: norm(word).replace(/'/g, ""), line });
        continue;
      }
      const sym = SYMBOLS.find(([s]) => src.startsWith(s, i));
      if (!sym) throw new AlgoError(`caractère inattendu « ${c} »`, line);
      toks.push({ t: "op", v: sym[1], line });
      i += sym[0].length;
    }
    toks.push({ t: "eof", v: "fin du texte", line });
    return toks;
  }

  // ---------------- Types et champs ----------------
  const TYPES = {
    entier: "num", reel: "num", nombre: "num", booleen: "bool", caractere: "str", chaine: "str", car: "str",
    liste: "list", cellule: "list", pointeur: "list", maillon: "list", listed: "list", liste_double: "list",
    arbre: "tree", noeud: "tree", abr: "tree", avl: "tree", pile: "pile", file: "file", element: "any", tableau: "array",
  };
  const typeKind = (t) => TYPES[norm(t)] || (/liste|cell/.test(norm(t)) ? "list" : /arbre|noeud/.test(norm(t)) ? "tree" : "any");

  const FIELDS = {
    valeur: "valeur", val: "valeur", info: "valeur", cle: "valeur", donnee: "valeur", v: "valeur", elt: "valeur", element: "valeur", contenu: "valeur",
    suivant: "suivant", suiv: "suivant", svt: "suivant", next: "suivant",
    precedent: "precedent", prec: "precedent", pred: "precedent", prev: "precedent",
    gauche: "gauche", g: "gauche", fg: "gauche", left: "gauche", sag: "gauche", filsgauche: "gauche", fils_gauche: "gauche",
    droit: "droit", droite: "droit", d: "droit", fd: "droit", right: "droit", sad: "droit", filsdroit: "droit", fils_droit: "droit",
    hauteur: "hauteur", h: "hauteur", equilibre: "equilibre", eq: "equilibre", bal: "equilibre",
  };
  const fieldName = (f) => FIELDS[norm(f)] || f;
  const POINTER_FIELDS = new Set(["suivant", "precedent", "gauche", "droit"]);

  const NULLS = new Set(["vide", "nil", "null", "arbre_vide", "liste_vide", "arbrevide", "listevide", "nul", "nulle"]);
  const KW_STOP = new Set(["fin", "finsi", "sinon", "sinonsi", "fintantque", "fintq", "ftq", "finpour", "fpour", "jusqua", "jusqu'a", "fsi"]);

  // ---------------- Parser ----------------
  function parse(src) {
    const toks = lex(src);
    let p = 0;
    const peek = (k = 0) => toks[p + k];
    const next = () => toks[p++];
    const isKw = (t, ...w) => t.t === "id" && w.includes(t.n);
    const isOp = (t, v) => t.t === "op" && t.v === v;
    const err = (msg, t = peek()) => new AlgoError(msg, t.line);
    const expectOp = (v, what) => { if (!isOp(peek(), v)) throw err(`« ${v} » attendu${what ? " " + what : ""}, trouvé « ${peek().v} »`); return next(); };
    const expectKw = (w, what) => { if (!isKw(peek(), w)) throw err(`« ${what || w} » attendu, trouvé « ${peek().v} »`); return next(); };
    const skipSemis = () => { while (isOp(peek(), ";")) next(); };
    const ident = (what) => { const t = peek(); if (t.t !== "id") throw err(`${what} attendu, trouvé « ${t.v} »`); return next(); };

    const functions = {};
    let main = null;

    // fin si / fin tant que / fin pour en deux mots
    function closer() {
      const t = peek();
      if (t.t !== "id") return null;
      if (t.n === "fin") {
        const u = peek(1);
        if (isKw(u, "si")) return "finsi";
        if (isKw(u, "tantque") || (isKw(u, "tant") && isKw(peek(2), "que"))) return "fintantque";
        if (isKw(u, "pour")) return "finpour";
        return "fin";
      }
      if (t.n === "fsi") return "finsi";
      if (t.n === "fintq" || t.n === "ftq") return "fintantque";
      if (t.n === "fpour") return "finpour";
      if (KW_STOP.has(t.n)) return t.n === "jusqu'a" ? "jusqua" : t.n;
      return null;
    }
    function eatCloser(want, open) {
      const c = closer();
      if (c !== want) throw err(`« ${want} » attendu pour fermer le « ${open.v} » de la ligne ${open.line}, trouvé « ${peek().v} »`);
      const t = next();
      if (t.n === "fin") {
        if (want === "finsi" || want === "finpour") next();
        else if (want === "fintantque") { if (isKw(peek(), "tantque")) next(); else { next(); next(); } }
      }
      skipSemis();
    }

    function isTypeStart() {
      const t = peek(), u = peek(1);
      if (t.t !== "id" || !(norm(t.v) in TYPES) && !/^(liste|arbre|pile|file|noeud)/.test(t.n)) return false;
      return u.t === "id" && !KW_STOP.has(u.n) && !isOp(peek(2), "(");
    }

    function parseDecl() {
      const typeTok = next();
      const names = [];
      do {
        const n = ident("nom de variable");
        let size = null;
        if (isOp(peek(), "[")) { next(); size = parseExpr(); expectOp("]"); }
        names.push({ name: n.v, size });
      } while (isOp(peek(), ",") && next());
      skipSemis();
      return { k: "decl", type: typeTok.v, names, line: typeTok.line };
    }

    // Les blocs ouverts (si, tant que, pour, début) : pour dire lequel n'est pas fermé.
    const open = [];
    function parseBlock(stopAt) {
      const body = [];
      for (;;) {
        skipSemis();
        const c = closer();
        if (c && stopAt.includes(c)) return body;
        if (peek().t === "eof") return body;
        if (c) {
          const o = open[open.length - 1];
          throw err(o ? `« ${o.close} » manquant pour fermer le « ${o.tok.n === "tant" ? "tant que" : o.tok.v} » de la ligne ${o.tok.line} (trouvé « ${peek().v} »)` : `« ${peek().v} » inattendu ici`);
        }
        body.push(parseStmt());
      }
    }
    const opened = (tok, close, f) => { open.push({ tok, close }); try { return f(); } finally { open.pop(); } };

    function parseStmt() {
      const t = peek();
      if (isKw(t, "si")) return parseIf();
      if (isKw(t, "tantque") || (isKw(t, "tant") && isKw(peek(1), "que"))) {
        next(); if (t.n === "tant") next();
        const cond = parseExpr();
        if (isKw(peek(), "faire")) next();
        const body = opened(t, "fintantque", () => parseBlock(["fintantque"]));
        eatCloser("fintantque", t);
        return { k: "while", cond, body, line: t.line };
      }
      if (isKw(t, "pour")) {
        next();
        const v = ident("variable de boucle");
        if (isKw(peek(), "allant")) next();
        if (isKw(peek(), "de")) next(); else if (isOp(peek(), "←") || isOp(peek(), "=")) next();
        const from = parseExpr();
        if (!isKw(peek(), "a", "jusqua")) throw err("« à » attendu dans « pour i allant de … à … »");
        next();
        const to = parseExpr();
        let step = null;
        if (isKw(peek(), "pas")) { next(); if (isKw(peek(), "de")) next(); step = parseExpr(); }
        if (isKw(peek(), "faire")) next();
        const body = opened(t, "finpour", () => parseBlock(["finpour"]));
        eatCloser("finpour", t);
        return { k: "for", v: v.v, from, to, step, body, line: t.line };
      }
      if (isKw(t, "repeter")) {
        next();
        const body = parseBlock(["jusqua"]);
        if (closer() !== "jusqua") throw err("« jusqu'à » attendu");
        next();
        const cond = parseExpr();
        skipSemis();
        return { k: "repeat", body, cond, line: t.line };
      }
      if (isKw(t, "retourner", "retourne", "renvoyer", "renvoie", "retour")) {
        next();
        let value = null;
        if (!isOp(peek(), ";") && !closer() && peek().t !== "eof") value = parseExpr();
        skipSemis();
        return { k: "return", value, line: t.line };
      }
      if (isKw(t, "ecrire", "afficher", "affiche", "ecris", "print")) {
        next();
        const args = [];
        if (isOp(peek(), "(")) { next(); if (!isOp(peek(), ")")) { do args.push(parseExpr()); while (isOp(peek(), ",") && next()); } expectOp(")"); }
        else { do args.push(parseExpr()); while (isOp(peek(), ",") && next()); }
        skipSemis();
        return { k: "write", args, line: t.line };
      }
      if (isTypeStart()) return parseDecl();
      const e = parseExpr();
      if (isOp(peek(), "←") || (isOp(peek(), "=") && false)) {
        next();
        if (!["var", "field", "index"].includes(e.k)) throw err("on ne peut affecter qu'à une variable, un champ (p->valeur) ou une case (T[i])", t);
        const value = parseExpr();
        skipSemis();
        return { k: "assign", target: e, value, line: t.line };
      }
      if (e.k === "call") { skipSemis(); return { k: "callstmt", call: e, line: t.line }; }
      if (e.k === "bin" && e.op === "=" && ["var", "field", "index"].includes(e.a.k)) throw err("pour affecter une valeur, utilise ← (ou <-) ; = sert à comparer", t);
      if (isOp(peek(), "=")) throw err("pour affecter une valeur, utilise ← (ou <-) ; = sert à comparer");
      throw err(`instruction incomplète : « ← », un appel de fonction ou un mot-clé était attendu après « ${t.v} »`, t);
    }

    // « sinon si » sur la même ligne (ou « sinonsi ») = branche du même si, fermée par un seul finsi.
    // « sinon » puis « si » à la ligne = si imbriqué, qui a son propre finsi (comme dans le cours).
    function parseIf() {
      const t = next();
      const node = opened(t, "finsi", () => parseIfRest(t));
      eatCloser("finsi", t);
      return node;
    }
    function parseIfRest(t, elif = false) {
      const cond = parseExpr();
      if (isKw(peek(), "alors")) next();
      const then = parseBlock(["sinon", "sinonsi", "finsi"]);
      let els = null;
      const c = closer();
      if (c === "sinonsi" || (c === "sinon" && isKw(peek(1), "si") && peek(1).line === peek().line)) {
        const s = next();
        const si = s.n === "sinon" ? next() : s;
        els = [parseIfRest(si, true)];
      } else if (c === "sinon") { next(); els = parseBlock(["finsi"]); }
      return { k: "if", cond, then, else: els, line: t.line, elif };
    }

    // Expressions
    function parseExpr() { return parseOr(); }
    function parseOr() { let a = parseAnd(); while (isKw(peek(), "ou", "or")) { const t = next(); a = { k: "bin", op: "ou", a, b: parseAnd(), line: t.line }; } return a; }
    function parseAnd() { let a = parseNot(); while (isKw(peek(), "et", "and")) { const t = next(); a = { k: "bin", op: "et", a, b: parseNot(), line: t.line }; } return a; }
    function parseNot() { if (isKw(peek(), "non", "not")) { const t = next(); return { k: "un", op: "non", a: parseNot(), line: t.line }; } return parseCmp(); }
    function parseCmp() {
      const a = parseAdd();
      const t = peek();
      if (t.t === "op" && ["=", "≠", "<", ">", "<=", ">="].includes(t.v)) { next(); return { k: "bin", op: t.v, a, b: parseAdd(), line: t.line }; }
      return a;
    }
    function parseAdd() { let a = parseMul(); while (isOp(peek(), "+") || isOp(peek(), "-")) { const t = next(); a = { k: "bin", op: t.v, a, b: parseMul(), line: t.line }; } return a; }
    function parseMul() {
      let a = parseUnary();
      for (;;) {
        const t = peek();
        if (isOp(t, "*") || isOp(t, "/") || isOp(t, "mod") || isKw(t, "mod", "div")) { next(); a = { k: "bin", op: t.t === "id" ? t.n : t.v, a, b: parseUnary(), line: t.line }; }
        else return a;
      }
    }
    function parseUnary() {
      if (isOp(peek(), "-")) { const t = next(); return { k: "un", op: "-", a: parseUnary(), line: t.line }; }
      if (isOp(peek(), "+")) { next(); return parseUnary(); }
      return parsePostfix();
    }
    function parsePostfix() {
      let e = parsePrimary();
      for (;;) {
        const t = peek();
        if (isOp(t, "->") || (isOp(t, ".") && peek(1).t === "id")) { next(); const f = ident("nom de champ"); e = { k: "field", obj: e, field: f.v, line: t.line }; }
        else if (isOp(t, "[")) { next(); const i = parseExpr(); expectOp("]"); e = { k: "index", obj: e, idx: i, line: t.line }; }
        else return e;
      }
    }
    function parsePrimary() {
      const t = next();
      if (t.t === "num") return { k: "num", v: t.v, line: t.line };
      if (t.t === "str") return { k: "str", v: t.v, line: t.line };
      if (isOp(t, "(")) { const e = parseExpr(); expectOp(")"); return e; }
      if (t.t === "id") {
        if (t.n === "vrai" || t.n === "true") return { k: "bool", v: true, line: t.line };
        if (t.n === "faux" || t.n === "false") return { k: "bool", v: false, line: t.line };
        if (isOp(peek(), "(")) {
          next();
          const args = [];
          if (!isOp(peek(), ")")) { do args.push(parseExpr()); while (isOp(peek(), ",") && next()); }
          expectOp(")", "pour fermer l'appel");
          return { k: "call", name: t.v, args, line: t.line };
        }
        if (NULLS.has(t.n)) return { k: "null", line: t.line };
        if (KW_STOP.has(t.n) || ["alors", "faire", "si", "et", "ou", "non"].includes(t.n)) throw new AlgoError(`expression attendue avant « ${t.v} »`, t.line);
        return { k: "var", name: t.v, line: t.line };
      }
      throw new AlgoError(`expression attendue, trouvé « ${t.v} »`, t.line);
    }

    // En-tête : fonction avec retour T nom(params) | fonction sans retour nom(params) | procédure nom(params) | fonction nom(params) : T
    function parseParams() {
      expectOp("(", "après le nom de la fonction");
      const params = [];
      while (!isOp(peek(), ")")) {
        let ref = false;
        if (isKw(peek(), "var", "ref", "es", "inout")) { next(); ref = true; }
        const a = ident("paramètre");
        let name = a.v, type = null;
        if (isOp(peek(), ":")) { next(); type = ident("type").v; }
        else if (peek().t === "id") { type = a.v; name = next().v; }
        params.push({ name, type, ref });
        if (isOp(peek(), ",") || isOp(peek(), ";")) next(); else break;
      }
      expectOp(")", "pour fermer les paramètres");
      return params;
    }

    function parseFunction() {
      const t = next();
      let returns = null, kindLabel = "procedure";
      if (t.n === "fonction") {
        kindLabel = "fonction";
        if (isKw(peek(), "avec")) { next(); expectKw("retour"); returns = ident("type de retour").v; }
        else if (isKw(peek(), "sans")) { next(); expectKw("retour"); }
      }
      const name = ident("nom de la fonction");
      const params = parseParams();
      if (isOp(peek(), ":")) { next(); returns = ident("type de retour").v; }
      skipSemis();
      const decls = [];
      while (!isKw(peek(), "debut")) {
        if (peek().t === "eof") throw err(`« début » attendu dans la fonction ${name.v}`);
        if (isKw(peek(), "var", "variables")) { next(); continue; }
        if (isTypeStart()) decls.push(parseDecl());
        else if (peek().t === "id" && (isOp(peek(1), ":") || isOp(peek(1), ","))) {
          // x, y : entier
          const names = [];
          do names.push({ name: next().v, size: null }); while (isOp(peek(), ",") && next());
          expectOp(":");
          const ty = ident("type");
          skipSemis();
          decls.push({ k: "decl", type: ty.v, names, line: ty.line });
        } else throw err(`« début » attendu, trouvé « ${peek().v} »`);
      }
      const d = next();
      const body = opened(d, "fin", () => parseBlock(["fin"]));
      if (closer() !== "fin") throw err(`« fin » attendu pour fermer le « début » de la ligne ${d.line}`);
      next();
      if (peek().t === "id" && peek().v === name.v) next();
      skipSemis();
      const fn = { name: name.v, params, returns, kind: kindLabel, body: [...decls, ...body], line: t.line };
      functions[norm(name.v)] = fn;
      return fn;
    }

    while (peek().t !== "eof") {
      skipSemis();
      const t = peek();
      if (t.t === "eof") break;
      if (isKw(t, "fonction", "procedure", "action")) parseFunction();
      else if (isKw(t, "debut")) {
        next();
        const body = parseBlock(["fin"]);
        if (closer() !== "fin") throw err(`« fin » attendu pour fermer le « début » de la ligne ${t.line}`);
        next(); skipSemis();
        main = { name: "programme", params: [], body, line: t.line };
      } else if (isKw(t, "type")) {
        // TYPE Arbre = VIDE ou enregistrement … fin enregistrement : accepté, ignoré.
        while (peek().t !== "eof" && !(isKw(peek(), "finenregistrement") || (isKw(peek(), "fin") && isKw(peek(1), "enregistrement")))) next();
        if (isKw(peek(), "fin")) next();
        next(); skipSemis();
      } else if (isKw(t, "algorithme", "programme")) { next(); if (peek().t === "id") next(); skipSemis(); }
      else if (isKw(t, "variables", "var") || isTypeStart()) {
        if (isKw(t, "variables", "var")) next();
        const d = parseDecl();
        (main ||= { name: "programme", params: [], body: [], line: t.line, pre: [] }).pre = [...(main.pre || []), d];
      } else throw err(`« fonction … », « procédure » ou « début » attendu, trouvé « ${t.v} »`);
    }
    if (main?.pre) main.body = [...main.pre, ...main.body];
    return { functions, main };
  }

  // ---------------- Valeurs du tas ----------------
  let nextId = 1;
  function newObj(kind) {
    const o = { id: nextId++, kind };
    if (kind === "pile" || kind === "file" || kind === "array") o.items = [];
    else if (kind === "tree") o.f = { valeur: undefined, gauche: null, droit: null };
    else o.f = { valeur: undefined, suivant: null };
    return o;
  }
  const isObj = (v) => v && typeof v === "object" && "id" in v;

  function show(v, depth = 0) {
    if (v === null) return "vide";
    if (v === undefined) return "?";
    if (typeof v === "boolean") return v ? "vrai" : "faux";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
    if (typeof v === "string") return v;
    if (v.kind === "pile") return `Pile[${v.items.map((x) => show(x, depth + 1)).join(", ")}⟩`;
    if (v.kind === "file") return `File⟨${v.items.map((x) => show(x, depth + 1)).join(", ")}]`;
    if (v.kind === "array") return `[${v.items.map((x) => show(x, depth + 1)).join(", ")}]`;
    if (v.kind === "tree") return depth > 3 ? "…" : `(${show(v.f.valeur)})`;
    return `@${v.id}`;
  }

  // ---------------- Interpréteur ----------------
  class Return { constructor(v) { this.v = v; } }

  class Interp {
    constructor(prog, opts = {}) {
      this.prog = prog;
      this.trace = opts.trace ? [] : null;
      this.maxSteps = opts.maxSteps || 200000;
      this.maxTrace = opts.maxTrace || 4000;
      this.steps = 0;
      this.out = "";
      this.frames = [];
      this.truncated = false;
      this.calls = 0;
      this.pinned = []; // structures reçues par le test : on continue de les dessiner (en gris) quand plus aucune variable ne les désigne
    }

    fn(name) { return this.prog.functions[norm(name)]; }

    snapshot(line, event) {
      if (!this.trace) return;
      if (this.trace.length >= this.maxTrace) { this.truncated = true; return; }
      const heap = {};
      const seen = new Set();
      const queue = [];
      const ser = (v) => {
        if (isObj(v)) { if (!seen.has(v.id)) { seen.add(v.id); queue.push(v); } return { ref: v.id }; }
        return v === undefined ? { undef: true } : v;
      };
      const frames = this.frames.map((fr) => ({
        fn: fr.fn, at: fr.line,
        vars: [...fr.vars.entries()].map(([k, e]) => [k, ser(e.ref ? e.ref.get() : e.v), e.type || null, !!e.ref, !!e.param]),
      }));
      while (queue.length && Object.keys(heap).length < 400) {
        const o = queue.shift();
        heap[o.id] = o.items ? { kind: o.kind, items: o.items.map(ser) } : { kind: o.kind, f: Object.fromEntries(Object.entries(o.f).map(([k, v]) => [k, ser(v)])) };
      }
      const ev = event && "value" in event ? { ...event, value: ser(event.value) } : event;
      while (queue.length && Object.keys(heap).length < 400) {
        const o = queue.shift();
        heap[o.id] = o.items ? { kind: o.kind, items: o.items.map(ser) } : { kind: o.kind, f: Object.fromEntries(Object.entries(o.f).map(([k, v]) => [k, ser(v)])) };
      }
      // Cellules du test que plus rien ne désigne (déjà parcourues) : dessinées en gris.
      this.pinned.forEach(ser);
      while (queue.length && Object.keys(heap).length < 400) {
        const o = queue.shift();
        heap[o.id] = o.items ? { kind: o.kind, items: o.items.map(ser), ghost: true } : { kind: o.kind, f: Object.fromEntries(Object.entries(o.f).map(([k, v]) => [k, ser(v)])), ghost: true };
      }
      this.trace.push({ line, event: ev, frames, heap, out: this.out.length });
    }

    tick(line) {
      if (++this.steps > this.maxSteps) throw new AlgoError("trop d'étapes : le programme tourne sans fin (boucle infinie ?)", line);
      this.snapshot(line);
    }

    frame() { return this.frames[this.frames.length - 1]; }

    lookup(name, line, fr = this.frame()) {
      let e = fr.vars.get(name);
      if (!e) {
        // tolérance : mauvaise casse ou accents
        for (const [k, v] of fr.vars) if (norm(k) === norm(name)) { e = v; break; }
      }
      if (!e) throw new AlgoError(`la variable « ${name} » n'existe pas (oubli de déclaration ?)`, line);
      return e;
    }

    declare(name, type, size, line) {
      const kind = typeKind(type);
      let v;
      if (size !== null && size !== undefined) {
        const n = this.eval(size);
        v = newObj("array"); v.items = Array.from({ length: n }, () => (kind === "num" ? 0 : null));
      } else if (kind === "pile" || kind === "file") v = newObj(kind);
      else if (kind === "num") v = undefined;
      else if (kind === "bool") v = undefined;
      else if (kind === "str") v = undefined;
      else v = null;
      this.frame().vars.set(name, { v, type, kind });
    }

    // Référence modifiable : variable, champ ou case de tableau.
    ref(e) {
      if (e.k === "var") {
        const fr = this.frame();
        return {
          get: () => { const x = this.lookup(e.name, e.line, fr); return x.ref ? x.ref.get() : x.v; },
          set: (val) => {
            let x = fr.vars.get(e.name);
            if (!x) for (const [k, v] of fr.vars) if (norm(k) === norm(e.name)) { x = v; break; }
            if (!x) { x = { v: undefined, type: null }; fr.vars.set(e.name, x); }
            if (x.ref) x.ref.set(val); else x.v = val;
          },
          typeKind: () => { const x = fr.vars.get(e.name); return x ? (x.ref ? x.ref.typeKind() : x.kind || (x.type && typeKind(x.type))) : null; },
          desc: e.name,
        };
      }
      if (e.k === "field") {
        const o = this.eval(e.obj);
        const f = fieldName(e.field);
        const desc = `${describe(e.obj)}->${e.field}`;
        if (o === null) throw new AlgoError(`${describe(e.obj)} vaut vide : impossible d'accéder à ${desc} (teste d'abord ${describe(e.obj)} ≠ vide)`, e.line);
        if (!isObj(o) || !o.f) throw new AlgoError(`${describe(e.obj)} n'est pas un pointeur vers une cellule ou un nœud`, e.line);
        return {
          get: () => this.readField(o, f, desc, e.line),
          set: (val) => { o.f[f] = val; },
          typeKind: () => (f === "gauche" || f === "droit" ? "tree" : f === "suivant" || f === "precedent" ? "list" : null),
          desc,
        };
      }
      if (e.k === "index") {
        const o = this.eval(e.obj);
        const i = this.eval(e.idx);
        const check = () => {
          if (!isObj(o) || o.kind !== "array") throw new AlgoError(`${describe(e.obj)} n'est pas un tableau`, e.line);
          if (!Number.isInteger(i) || i < 0 || i >= o.items.length) throw new AlgoError(`indice ${show(i)} hors du tableau ${describe(e.obj)} (0 à ${o.items.length - 1})`, e.line);
        };
        return { get: () => { if (typeof o === "string") return this.charAt(o, i, e); check(); return o.items[i]; }, set: (val) => { check(); o.items[i] = val; }, typeKind: () => null, desc: describe(e) };
      }
      throw new AlgoError("on ne peut pas modifier cette expression", e.line);
    }

    charAt(s, i, e) {
      if (!Number.isInteger(i) || i < 0 || i >= s.length) throw new AlgoError(`indice ${show(i)} hors de la chaîne (0 à ${s.length - 1})`, e.line);
      return s[i];
    }

    readField(o, f, desc, line) {
      if (!(f in o.f)) {
        if (POINTER_FIELDS.has(f)) return null;
        throw new AlgoError(`le champ ${desc} n'existe pas`, line);
      }
      const v = o.f[f];
      if (v === undefined) throw new AlgoError(`${desc} n'a pas encore de valeur`, line);
      return v;
    }

    eval(e) {
      switch (e.k) {
        case "num": case "str": case "bool": return e.v;
        case "null": return null;
        case "var": {
          const x = this.lookup(e.name, e.line);
          const v = x.ref ? x.ref.get() : x.v;
          if (v === undefined) throw new AlgoError(`la variable « ${e.name} » n'a pas encore de valeur`, e.line);
          return v;
        }
        case "field": case "index": return this.ref(e).get();
        case "un": {
          const a = this.eval(e.a);
          if (e.op === "-") { this.num(a, e); return -a; }
          this.bool(a, e); return !a;
        }
        case "bin": return this.binop(e);
        case "call": return this.call(e, true);
      }
      throw new AlgoError("expression inconnue", e.line);
    }

    num(v, e) { if (typeof v !== "number") throw new AlgoError(`un nombre était attendu, pas ${show(v)}`, e.line); }
    bool(v, e) { if (typeof v !== "boolean") throw new AlgoError(`une condition (vrai/faux) était attendue, pas ${show(v)}`, e.line); }

    binop(e) {
      if (e.op === "et") { const a = this.eval(e.a); this.bool(a, e); if (!a) return false; const b = this.eval(e.b); this.bool(b, e); return b; }
      if (e.op === "ou") { const a = this.eval(e.a); this.bool(a, e); if (a) return true; const b = this.eval(e.b); this.bool(b, e); return b; }
      const a = this.eval(e.a), b = this.eval(e.b);
      switch (e.op) {
        case "=": return a === b;
        case "≠": return a !== b;
        case "<": case ">": case "<=": case ">=":
          if (!((typeof a === "number" && typeof b === "number") || (typeof a === "string" && typeof b === "string"))) throw new AlgoError(`comparaison impossible entre ${show(a)} et ${show(b)}`, e.line);
          return e.op === "<" ? a < b : e.op === ">" ? a > b : e.op === "<=" ? a <= b : a >= b;
        case "+":
          if (typeof a === "string" || typeof b === "string") return show(a) + show(b);
          this.num(a, e); this.num(b, e); return a + b;
        case "-": this.num(a, e); this.num(b, e); return a - b;
        case "*": this.num(a, e); this.num(b, e); return a * b;
        case "/": this.num(a, e); this.num(b, e); if (b === 0) throw new AlgoError("division par zéro", e.line); return a / b;
        case "div": this.num(a, e); this.num(b, e); if (b === 0) throw new AlgoError("division par zéro", e.line); return Math.trunc(a / b);
        case "mod": this.num(a, e); this.num(b, e); if (b === 0) throw new AlgoError("modulo par zéro", e.line); return ((a % b) + b) % b;
      }
      throw new AlgoError(`opérateur ${e.op} inconnu`, e.line);
    }

    // Fonctions prédéfinies (piles, files, …). Une fonction de l'élève du même nom est prioritaire.
    builtin(name, e, args) {
      const n = norm(name).replace(/_/g, "");
      const arg = (i) => this.eval(args[i]);
      const want = (k) => { if (args.length !== k) throw new AlgoError(`${name} attend ${k} paramètre(s)`, e.line); };
      const stack = (v, ops) => { if (!isObj(v) || !ops.includes(v.kind)) throw new AlgoError(`${name} attend une ${ops.join(" ou ")}, pas ${show(v)}`, e.line); return v; };
      switch (n) {
        case "estvide": case "vide": case "estpilevide": case "estfilevide": case "pilevide": case "filevide": case "listevide": case "arbrevide": {
          if ((n === "pilevide" || n === "filevide") && args.length === 0) return newObj(n === "pilevide" ? "pile" : "file");
          want(1);
          const v = arg(0);
          if (v === null) return true;
          if (typeof v === "string") return v.length === 0;
          if (isObj(v) && v.items) return v.items.length === 0;
          return false;
        }
        case "creerpile": case "nouvellepile": case "initpile": return newObj("pile");
        case "creerfile": case "nouvellefile": case "initfile": return newObj("file");
        case "empiler": case "push": { want(2); const P = stack(arg(0), ["pile"]); P.items.push(arg(1)); return P; }
        case "depiler": case "pop": {
          want(1); const P = stack(arg(0), ["pile"]);
          if (!P.items.length) throw new AlgoError("dépiler une pile vide est impossible (teste estvide avant)", e.line);
          P.items.pop(); return P;
        }
        case "sommet": case "top": {
          want(1); const P = stack(arg(0), ["pile"]);
          if (!P.items.length) throw new AlgoError("une pile vide n'a pas de sommet", e.line);
          return P.items[P.items.length - 1];
        }
        case "enfiler": { want(2); const F = stack(arg(0), ["file"]); F.items.push(arg(1)); return F; }
        case "defiler": {
          want(1); const F = stack(arg(0), ["file"]);
          if (!F.items.length) throw new AlgoError("défiler une file vide est impossible (teste estvide avant)", e.line);
          F.items.shift(); return F;
        }
        case "tete": case "premier": case "tetefile": {
          want(1); const F = stack(arg(0), ["file"]);
          if (!F.items.length) throw new AlgoError("une file vide n'a pas de tête", e.line);
          return F.items[0];
        }
        case "longueur": case "taille": case "len": {
          want(1); const v = arg(0);
          if (typeof v === "string") return v.length;
          if (isObj(v) && v.items) return v.items.length;
          throw new AlgoError(`${name} attend une chaîne, une pile, une file ou un tableau`, e.line);
        }
        case "abs": want(1); return Math.abs(arg(0));
        case "max": return Math.max(...args.map((_, i) => arg(i)));
        case "min": return Math.min(...args.map((_, i) => arg(i)));
        case "racine": case "sqrt": want(1); return Math.sqrt(arg(0));
        case "ent": case "partieentiere": case "plancher": want(1); return Math.floor(arg(0));
        case "puissance": case "pow": want(2); return arg(0) ** arg(1);
        case "atoi": case "chiffre": case "valeurchiffre": case "entier": {
          want(1); const v = arg(0);
          const k = Number(v);
          if (typeof v !== "string" || Number.isNaN(k)) throw new AlgoError(`${name} attend un chiffre écrit comme un caractère, pas ${show(v)}`, e.line);
          return k;
        }
        case "estchiffre": { want(1); const v = arg(0); return typeof v === "string" && /^[0-9]$/.test(v); }
        case "new": case "nouveau": case "allouer": case "creer": case "malloc": {
          want(1);
          if (!["var", "field", "index"].includes(args[0].k)) throw new AlgoError(`${name}(p) : p doit être une variable ou un champ`, e.line);
          const r = this.ref(args[0]);
          const kind = r.typeKind() === "tree" ? "tree" : "list";
          r.set(newObj(kind));
          return null;
        }
        case "creerliste": case "creercellule": case "cons": {
          // creerListe(x, L) : nouvelle cellule de valeur x dont le suivant est L (vide si absent).
          if (args.length !== 1 && args.length !== 2) throw new AlgoError(`${name} attend 2 paramètres : la valeur et la liste qui suit`, e.line);
          const x = arg(0), L = args.length === 2 ? arg(1) : null;
          if (isObj(x) || x === null) throw new AlgoError(`${name}(x, L) : x est la valeur à ranger (un nombre), pas ${x === null ? "vide" : "une liste"} — l'ordre est (valeur, suivant)`, e.line);
          if (L !== null && !(isObj(L) && L.kind === "list")) throw new AlgoError(`${name}(x, L) : L doit être une liste ou vide, pas ${show(L)}`, e.line);
          const o = newObj("list"); o.f.valeur = x; o.f.suivant = L; return o;
        }
        case "creerarbre": case "creernoeud": {
          // creerArbre(x, G, D) : nouveau nœud de valeur x avec ses deux sous-arbres.
          if (args.length !== 1 && args.length !== 3) throw new AlgoError(`${name} attend 3 paramètres : la valeur, le sous-arbre gauche et le sous-arbre droit`, e.line);
          const x = arg(0), g = args.length === 3 ? arg(1) : null, d = args.length === 3 ? arg(2) : null;
          for (const t of [g, d]) if (t !== null && !(isObj(t) && t.kind === "tree")) throw new AlgoError(`${name} : les sous-arbres doivent être des arbres ou vide, pas ${show(t)}`, e.line);
          const o = newObj("tree"); o.f.valeur = x; o.f.gauche = g; o.f.droit = d; return o;
        }
        case "liberer": case "free": case "detruire": want(1); return null;
        case "ecrire": case "afficher": case "affiche": case "print":
          this.write(args.map((a) => this.eval(a))); return null;
      }
      return undefined;
    }

    write(vals) { this.out += vals.map((v) => show(v)).join(" ") + "\n"; }

    call(e, asValue) {
      const f = this.fn(e.name);
      if (!f) {
        const r = this.builtin(e.name, e, e.args);
        if (r === undefined) throw new AlgoError(`la fonction « ${e.name} » n'existe pas`, e.line);
        if (asValue && r === null && /^(new|nouveau|allouer|creer|malloc|liberer|free|ecrire|afficher|affiche)$/.test(norm(e.name))) {
          throw new AlgoError(`${e.name}(…) ne renvoie pas de valeur`, e.line);
        }
        return r;
      }
      if (e.args.length !== f.params.length) throw new AlgoError(`${f.name} attend ${f.params.length} paramètre(s), ${e.args.length} donné(s)`, e.line);
      const vars = new Map();
      f.params.forEach((pm, i) => {
        if (pm.ref) {
          const a = e.args[i];
          if (!["var", "field", "index"].includes(a.k)) throw new AlgoError(`le paramètre « var ${pm.name} » de ${f.name} doit recevoir une variable ou un champ`, e.line);
          vars.set(pm.name, { ref: this.ref(a), type: pm.type, kind: pm.type ? typeKind(pm.type) : null, param: true });
        } else vars.set(pm.name, { v: this.eval(e.args[i]), type: pm.type, kind: pm.type ? typeKind(pm.type) : null, param: true });
      });
      return this.invoke(f, vars, e.line, asValue);
    }

    invoke(f, vars, line, asValue) {
      if (this.frames.length > 600) throw new AlgoError(`trop d'appels imbriqués de ${f.name} : la récursion ne s'arrête pas (cas de base ?)`, line);
      this.calls++;
      this.frames.push({ fn: f.name, vars, line });
      let result;
      try {
        this.block(f.body);
        if (f.returns && asValue !== false) throw new AlgoError(`${f.name} s'est terminée sans « retourner » de valeur`, f.line);
      } catch (x) {
        if (!(x instanceof Return)) {
          if (!x.snapped) { x.snapped = true; this.snapshot(x.line ?? null, { error: x.raw || x.message }); }
          this.frames.pop();
          throw x;
        }
        result = x.v;
      }
      this.snapshot(null, { ret: f.name, value: result });
      this.frames.pop();
      if (asValue && result === undefined) throw new AlgoError(`${f.name} ne renvoie pas de valeur (fonction sans retour)`, line);
      return result;
    }

    block(stmts) { for (const s of stmts) this.exec(s); }

    exec(s) {
      this.tick(s.line);
      switch (s.k) {
        case "decl": for (const n of s.names) this.declare(n.name, s.type, n.size, s.line); return;
        case "assign": {
          const r = this.ref(s.target);
          r.set(this.eval(s.value));
          return;
        }
        case "if": {
          const c = this.eval(s.cond); this.bool(c, s.cond);
          if (c) this.block(s.then); else if (s.else) this.block(s.else);
          return;
        }
        case "while":
          for (;;) {
            const c = this.eval(s.cond); this.bool(c, s.cond);
            if (!c) return;
            this.block(s.body);
            this.tick(s.line);
          }
        case "for": {
          const r = this.ref({ k: "var", name: s.v, line: s.line });
          const a = this.eval(s.from), b = this.eval(s.to);
          const step = s.step ? this.eval(s.step) : 1;
          this.num(a, s); this.num(b, s);
          if (step === 0) throw new AlgoError("pas de boucle nul", s.line);
          for (let i = a; step > 0 ? i <= b : i >= b; i += step) {
            r.set(i);
            this.block(s.body);
            this.tick(s.line);
            i = r.get();
          }
          return;
        }
        case "repeat":
          for (;;) {
            this.block(s.body);
            const c = this.eval(s.cond); this.bool(c, s.cond);
            if (c) return;
            this.tick(s.line);
          }
        case "return": throw new Return(s.value ? this.eval(s.value) : undefined);
        case "write": this.write(s.args.map((a) => this.eval(a))); return;
        case "callstmt": this.call(s.call, false); return;
      }
      throw new AlgoError("instruction inconnue", s.line);
    }

    runMain() {
      if (!this.prog.main) throw new AlgoError("aucun programme principal (début … fin) à exécuter");
      this.frames.push({ fn: "programme", vars: new Map(), line: this.prog.main.line });
      try { this.block(this.prog.main.body); } catch (x) { if (!(x instanceof Return)) throw x; }
      this.snapshot(null, { end: true });
    }

    // Appel d'une fonction de l'élève avec des valeurs déjà construites (tests).
    callWith(name, values) {
      const f = this.fn(name);
      if (!f) throw new AlgoError(`la fonction « ${name} » est introuvable : garde exactement le nom de l'énoncé`);
      if (values.length !== f.params.length) throw new AlgoError(`${f.name} doit avoir ${values.length} paramètre(s) (elle en a ${f.params.length})`, f.line);
      // Un paramètre « var » reçoit une case (holder) : on relit sa valeur après l'appel.
      const holders = values.map((v) => ({ v }));
      this.pinned = values.filter((v) => isObj(v) && v.f);
      const vars = new Map();
      f.params.forEach((pm, i) => {
        const kind = pm.type ? typeKind(pm.type) : null;
        if (pm.ref) {
          const ref = { get: () => holders[i].v, set: (x) => { holders[i].v = x; }, typeKind: () => kind, desc: pm.name };
          vars.set(pm.name, { ref, type: pm.type, kind, param: true });
        } else vars.set(pm.name, { v: values[i], type: pm.type, kind, param: true });
      });
      const result = this.invoke(f, vars, f.line, !!f.returns);
      return { result, after: holders.map((h) => h.v) };
    }
  }

  function describe(e) {
    switch (e.k) {
      case "var": return e.name;
      case "field": return `${describe(e.obj)}->${e.field}`;
      case "index": return `${describe(e.obj)}[…]`;
      case "call": return `${e.name}(…)`;
      default: return "l'expression";
    }
  }

  // ---------------- Construction / lecture des structures (tests) ----------------
  const build = {
    liste(arr, doubly = false) {
      let head = null, prev = null;
      for (const x of arr) {
        const c = newObj("list"); c.f.valeur = x;
        if (doubly) c.f.precedent = prev;
        if (prev) prev.f.suivant = c; else head = c;
        prev = c;
      }
      return head;
    },
    listeD(arr) { return build.liste(arr, true); },
    pile(arr) { const P = newObj("pile"); P.items = [...arr]; return P; },
    file(arr) { const F = newObj("file"); F.items = [...arr]; return F; },
    // arbre : [valeur, gauche, droit] ou null
    arbre(t) {
      if (t === null || t === undefined) return null;
      if (!Array.isArray(t)) t = [t, null, null];
      const n = newObj("tree"); n.f.valeur = t[0]; n.f.gauche = build.arbre(t[1]); n.f.droit = build.arbre(t[2]);
      return n;
    },
    abr(keys) {
      let root = null;
      const ins = (n, k) => { if (!n) { const m = newObj("tree"); m.f.valeur = k; return m; } if (k < n.f.valeur) n.f.gauche = ins(n.f.gauche, k); else n.f.droit = ins(n.f.droit, k); return n; };
      for (const k of keys) root = ins(root, k);
      return root;
    },
  };

  const read = {
    liste(L) { const out = []; const seen = new Set(); while (L) { if (seen.has(L.id) || out.length > 500) { out.push("…(cycle)"); break; } seen.add(L.id); out.push(L.f.valeur); L = L.f.suivant; } return out; },
    // vérifie aussi les liens precedent
    listeD(L) {
      const out = read.liste(L); let p = null, x = L, ok = true;
      while (x) { if ((x.f.precedent ?? null) !== p) ok = false; p = x; x = x.f.suivant; if (out.length > 500) break; }
      return ok ? out : [...out, "(liens precedent incorrects)"];
    },
    pile(P) { return isObj(P) && P.items ? [...P.items] : P; },
    file(F) { return isObj(F) && F.items ? [...F.items] : F; },
    arbre(A, depth = 0) { if (!A || depth > 60) return null; return [A.f.valeur, read.arbre(A.f.gauche ?? null, depth + 1), read.arbre(A.f.droit ?? null, depth + 1)]; },
  };

  const fmt = {
    liste: (a) => (a.length ? a.map((x) => show(x)).join(" → ") + " → vide" : "vide"),
    pile: (a) => (a.length ? `bas [ ${a.map((x) => show(x)).join(", ")} ] sommet` : "pile vide"),
    file: (a) => (a.length ? `tête [ ${a.map((x) => show(x)).join(", ")} ] queue` : "file vide"),
    arbre: (t) => (t === null ? "vide" : t[1] === null && t[2] === null ? show(t[0]) : `${show(t[0])}(${fmt.arbre(t[1])}, ${fmt.arbre(t[2])})`),
  };

  // ---------------- Rigueur d'examen : ce que le correcteur sanctionnerait (le site l'accepte) ----------------
  function lint(src, prog) {
    const out = [];
    const add = (line, msg) => { if (!out.some((o) => o.msg === msg)) out.push({ line, msg }); };
    const fns = [...Object.values(prog.functions), ...(prog.main ? [prog.main] : [])];
    for (const f of fns) {
      f.params.forEach((pm) => { if (!pm.type) add(f.line, `Précise le type du paramètre « ${pm.name} » (ex : entier ${pm.name}, Liste ${pm.name}).`); });
      const declared = new Set(f.params.map((pm) => norm(pm.name)));
      walk(f.body, (n) => { if (n.k === "decl") n.names.forEach((x) => declared.add(norm(typeof x === "string" ? x : x.name))); });
      let returnsValue = false;
      walk(f.body, (n) => {
        if (n.k === "return" && n.value) returnsValue = true;
        const name = n.k === "assign" && n.target.k === "var" ? n.target.name : n.k === "for" ? n.v : null;
        if (name && !declared.has(norm(name))) { declared.add(norm(name)); add(n.line, `Déclare « ${name} » avant « début » (ex : entier ${name};).`); }
      });
      if (f !== prog.main && returnsValue && !f.returns) add(f.line, `${f.name} retourne une valeur : écris « fonction avec retour <type> ${f.name}(…) ».`);
    }
    const blockKw = /^(si|sinon|finsi|tant|fintantque|pour|finpour|d[ée]but|fin|fonction|proc[ée]dure|r[ée]p[ée]ter|jusqu|type|fin\s+enregistrement|\/\/|\{|\})\b/i;
    src.split("\n").forEach((raw, i) => {
      const l = raw.replace(/\/\/.*$/, "").trim();
      if (/^pour\s+\w+\s+de\b/i.test(l)) add(i + 1, "Écris « pour i allant de … à … faire » comme dans le cours.");
      if (/\balors\s+\S/i.test(l)) add(i + 1, "Une instruction par ligne : va à la ligne après « alors ».");
      const instr = /^[\w\->[\].→]+\s*(←|<-)|^(retourner|écrire|ecrire|empiler|enfiler|new|lib[ée]rer)\b|^\w+\s*\(/i.test(l);
      if (l && !blockKw.test(l) && instr && !/[;:]$|\b(alors|faire|sinon)$/i.test(l)) add(i + 1, "Termine chaque instruction par « ; ».");
    });
    return out.slice(0, 5);
  }

  // ---------------- Analyse statique (contraintes d'énoncé) ----------------
  function walk(node, fn) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach((n) => walk(n, fn)); return; }
    fn(node);
    for (const k of Object.keys(node)) if (k !== "line") walk(node[k], fn);
  }
  function analyse(prog, fname) {
    const f = prog.functions[norm(fname)];
    const info = { calls: new Set(), types: new Set(), decls: 0, loops: 0 };
    if (!f) return info;
    const visit = (fun, seen) => {
      walk(fun.body, (n) => {
        if (n.k === "call") {
          info.calls.add(norm(n.name).replace(/_/g, ""));
          if (norm(n.name) === norm(fun.name)) info.recursive = true;
          const g = prog.functions[norm(n.name)];
          if (g && !seen.has(g)) { seen.add(g); visit(g, seen); }
        }
        if (n.k === "decl") { info.types.add(typeKind(n.type)); if (fun === f) info.decls += n.names.length; }
        if (n.k === "while" || n.k === "for" || n.k === "repeat") info.loops++;
      });
      fun.params.forEach((pm) => pm.type && info.types.add(typeKind(pm.type)));
    };
    visit(f, new Set([f]));
    // Récursif : la fonction s'appelle elle-même, ou délègue à une fonction auxiliaire récursive.
    info.recursive = !!info.recursive || info.calls.has(norm(fname).replace(/_/g, ""));
    return info;
  }

  const api = { lex, parse, lint, Interp, AlgoError, build, read, fmt, show, analyse, norm, fieldName, typeKind, resetIds: () => { nextId = 1; } };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Algo = api;
})(typeof window !== "undefined" ? window : globalThis);
