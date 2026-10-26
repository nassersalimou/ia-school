/* Blocs = Python en pièces (Blockly + rendu « zelos »). Un bloc = une instruction Python, et la forme dit le rôle :
   chapeau = départ, pièce de puzzle = instruction, bloc en C = structure avec un corps, ovale = valeur, hexagone = vrai/faux.
   Voir struc_scr/Langage à blocs pour débutants — conception.pdf */
(() => {
  const COLOR = {
    depart: "#666EE8", valeurs: "#5CB1D6", afficher: "#CF63CF", operations: "#59C059", variables: "#FF8C1A",
    boucles: "#FFAB19", conditions: "#4C97FF", listes: "#FF661A", fonctions: "#FF6680",
  };
  const stmt = { previousStatement: null, nextStatement: null };

  Blockly.Blocks.py_program = {
    init() {
      this.jsonInit({ message0: "▶ Programme", nextStatement: null, colour: COLOR.depart, tooltip: "Le programme s'exécute de haut en bas à partir d'ici." });
      this.hat = "cap";
      this.setDeletable(false);
    },
  };

  Blockly.common.defineBlocksWithJsonArray([
    // Le texte des blocs est la syntaxe Python elle-même (pour la mémoriser) ; l'infobulle explique en français.
    // Valeurs
    { type: "py_text", message0: "\" %1 \"", args0: [{ type: "field_input", name: "TEXT", text: "Bonjour" }], output: "String", colour: COLOR.valeurs, tooltip: "Un texte (chaîne de caractères), entre guillemets." },
    { type: "py_number", message0: "%1", args0: [{ type: "field_number", name: "NUM", value: 0 }], output: "Number", colour: COLOR.valeurs, tooltip: "Un nombre." },
    { type: "py_bool", message0: "%1", args0: [{ type: "field_dropdown", name: "BOOL", options: [["True", "True"], ["False", "False"]] }], output: "Boolean", colour: COLOR.valeurs, tooltip: "Vrai (True) ou faux (False)." },
    // Afficher
    { type: "py_print", message0: "print( %1 )", args0: [{ type: "input_value", name: "VALUE" }], inputsInline: true, ...stmt, colour: COLOR.afficher, tooltip: "Affiche une valeur dans la console." },
    { type: "py_input", message0: "input( %1 )", args0: [{ type: "input_value", name: "PROMPT" }], inputsInline: true, output: "String", colour: COLOR.afficher, tooltip: "Pose une question et renvoie le texte tapé par l'utilisateur." },
    // Opérations
    { type: "py_arith", message0: "%1 %2 %3", args0: [{ type: "input_value", name: "A" }, { type: "field_dropdown", name: "OP", options: [["+", "+"], ["-", "-"], ["*", "*"], ["/", "/"], ["//", "//"], ["%", "%"], ["**", "**"]] }, { type: "input_value", name: "B" }], inputsInline: true, output: null, colour: COLOR.operations, tooltip: "+ - * / ; // division entière ; % reste ; ** puissance. + colle aussi deux textes." },
    { type: "py_len", message0: "len( %1 )", args0: [{ type: "input_value", name: "X" }], inputsInline: true, output: "Number", colour: COLOR.operations, tooltip: "Nombre de lettres d'un texte ou d'éléments d'une liste." },
    { type: "py_convert", message0: "%1 ( %2 )", args0: [{ type: "field_dropdown", name: "F", options: [["int", "int"], ["str", "str"], ["float", "float"]] }, { type: "input_value", name: "X" }], inputsInline: true, output: null, colour: COLOR.operations, tooltip: "Convertit : int = nombre entier, str = texte, float = nombre à virgule." },
    // Variables
    { type: "py_get", message0: "%1", args0: [{ type: "field_variable", name: "VAR", variable: "x" }], output: null, colour: COLOR.variables, tooltip: "La valeur rangée dans la variable." },
    { type: "py_set", message0: "%1 = %2", args0: [{ type: "field_variable", name: "VAR", variable: "x" }, { type: "input_value", name: "VALUE" }], inputsInline: true, ...stmt, colour: COLOR.variables, tooltip: "Affectation : range la valeur dans la variable (= ne compare pas, == compare)." },
    { type: "py_change", message0: "%1 += %2", args0: [{ type: "field_variable", name: "VAR", variable: "x" }, { type: "input_value", name: "VALUE" }], inputsInline: true, ...stmt, colour: COLOR.variables, tooltip: "Ajoute la valeur à la variable (x += 1 revient à x = x + 1)." },
    // Boucles
    { type: "py_repeat", message0: "for _ in range( %1 ): %2 %3", args0: [{ type: "input_value", name: "TIMES" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], inputsInline: true, ...stmt, colour: COLOR.boucles, tooltip: "Répète le corps n fois (_ = variable qu'on n'utilise pas)." },
    { type: "py_for", message0: "for %1 in %2 : %3 %4", args0: [{ type: "field_variable", name: "VAR", variable: "lettre" }, { type: "input_value", name: "ITER" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], inputsInline: true, ...stmt, colour: COLOR.boucles, tooltip: "Parcourt un texte, une liste ou des nombres, un élément à chaque tour." },
    { type: "py_range", message0: "range( %1 , %2 )", args0: [{ type: "input_value", name: "A" }, { type: "input_value", name: "B" }], inputsInline: true, output: null, colour: COLOR.boucles, tooltip: "Les nombres de a jusqu'à b NON compris (range(0, n) s'écrit aussi range(n))." },
    { type: "py_while", message0: "while %1 : %2 %3", args0: [{ type: "input_value", name: "COND", check: "Boolean" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], inputsInline: true, ...stmt, colour: COLOR.boucles, tooltip: "Répète tant que la condition est vraie." },
    { type: "py_break", message0: "break", previousStatement: null, colour: COLOR.boucles, tooltip: "Sort de la boucle tout de suite." },
    // Conditions
    { type: "py_if", message0: "if %1 : %2 %3", args0: [{ type: "input_value", name: "COND", check: "Boolean" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], inputsInline: true, ...stmt, colour: COLOR.conditions, tooltip: "Exécute le corps seulement si la condition est vraie." },
    { type: "py_ifelse", message0: "if %1 : %2 %3 else: %4 %5", args0: [{ type: "input_value", name: "COND", check: "Boolean" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }, { type: "input_dummy" }, { type: "input_statement", name: "ELSE" }], inputsInline: true, ...stmt, colour: COLOR.conditions, tooltip: "Si la condition est vraie le premier corps, sinon le second. Un if seul dans le else donne elif." },
    { type: "py_compare", message0: "%1 %2 %3", args0: [{ type: "input_value", name: "A" }, { type: "field_dropdown", name: "OP", options: [["==", "=="], ["!=", "!="], ["<", "<"], [">", ">"], ["<=", "<="], [">=", ">="]] }, { type: "input_value", name: "B" }], inputsInline: true, output: "Boolean", colour: COLOR.conditions, tooltip: "Compare deux valeurs : == égal, != différent." },
    { type: "py_logic", message0: "%1 %2 %3", args0: [{ type: "input_value", name: "A", check: "Boolean" }, { type: "field_dropdown", name: "OP", options: [["and", "and"], ["or", "or"]] }, { type: "input_value", name: "B", check: "Boolean" }], inputsInline: true, output: "Boolean", colour: COLOR.conditions, tooltip: "and : les deux sont vraies ; or : au moins une est vraie." },
    { type: "py_not", message0: "not %1", args0: [{ type: "input_value", name: "X", check: "Boolean" }], inputsInline: true, output: "Boolean", colour: COLOR.conditions, tooltip: "Le contraire de la condition." },
    { type: "py_in", message0: "%1 in %2", args0: [{ type: "input_value", name: "A" }, { type: "input_value", name: "B" }], inputsInline: true, output: "Boolean", colour: COLOR.conditions, tooltip: "Vrai si l'élément est dans la liste ou le texte." },
    // Listes
    { type: "py_list", message0: "[ %1 , %2 , %3 ]", args0: [{ type: "input_value", name: "I0" }, { type: "input_value", name: "I1" }, { type: "input_value", name: "I2" }], inputsInline: true, output: null, colour: COLOR.listes, tooltip: "Une liste (les cases vides sont ignorées)." },
    { type: "py_append", message0: "%1 .append( %2 )", args0: [{ type: "input_value", name: "LIST" }, { type: "input_value", name: "ITEM" }], inputsInline: true, ...stmt, colour: COLOR.listes, tooltip: "Ajoute un élément à la fin de la liste." },
    { type: "py_index", message0: "%1 [ %2 ]", args0: [{ type: "input_value", name: "L" }, { type: "input_value", name: "I" }], inputsInline: true, output: null, colour: COLOR.listes, tooltip: "L'élément à cette position : les positions commencent à 0." },
    // Fonctions
    { type: "py_def", message0: "def %1 ( %2 ): %3 %4", args0: [{ type: "field_input", name: "NAME", text: "ma_fonction" }, { type: "field_input", name: "PARAMS", text: "" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], colour: COLOR.fonctions, tooltip: "Définit une fonction (paramètres séparés par des virgules)." },
    { type: "py_return", message0: "return %1", args0: [{ type: "input_value", name: "VALUE" }], inputsInline: true, previousStatement: null, colour: COLOR.fonctions, tooltip: "Renvoie une valeur et termine la fonction." },
    { type: "py_call", message0: "%1 ( %2 %3 )", args0: [{ type: "field_input", name: "NAME", text: "ma_fonction" }, { type: "input_value", name: "A1" }, { type: "input_value", name: "A2" }], inputsInline: true, output: null, colour: COLOR.fonctions, tooltip: "Appelle une fonction et donne la valeur qu'elle renvoie." },
    { type: "py_call_stmt", message0: "%1 ( %2 %3 )", args0: [{ type: "field_input", name: "NAME", text: "ma_fonction" }, { type: "input_value", name: "A1" }, { type: "input_value", name: "A2" }], inputsInline: true, ...stmt, colour: COLOR.fonctions, tooltip: "Appelle une fonction (instruction seule)." },
  ]);

  // ---------- Blocs -> Python ----------
  // Priorité des opérateurs Python : on ne met des parenthèses que là où Python en a besoin.
  const ARITH = { "+": 5, "-": 5, "*": 6, "/": 6, "//": 6, "%": 6, "**": 7 };
  function prec(b) {
    switch (b.type) {
      case "py_logic": return b.getFieldValue("OP") === "and" ? 2 : 1;
      case "py_not": return 3;
      case "py_compare": case "py_in": return 4;
      case "py_arith": return ARITH[b.getFieldValue("OP")];
      case "py_number": return b.getFieldValue("NUM") < 0 ? 6.5 : 9;
      default: return 9;
    }
  }
  const pad = (n) => "    ".repeat(n);
  const vname = (b) => b.getField("VAR").getText();
  const ident = (s) => s.trim().replace(/\s+/g, "_") || "f";
  const raw = (b, name, def = "None") => { const c = b.getInputTargetBlock(name); return c ? expr(c) : def; };
  const val = (b, name, def = "None", min = 9) => { const c = b.getInputTargetBlock(name); return !c ? def : prec(c) < min ? `(${expr(c)})` : expr(c); };
  // Opérande gauche / droite d'un opérateur binaire (- / // % et ** ne sont pas associatifs du même côté).
  function binary(b, def) {
    const op = b.getFieldValue("OP"); const p = prec(b);
    const left = op === "**" ? p + 1 : b.type === "py_compare" ? p + 1 : p;
    const right = op === "**" ? p : ["-", "/", "//", "%"].includes(op) || b.type === "py_compare" ? p + 1 : p;
    return `${val(b, "A", def, left)} ${op} ${val(b, "B", def, right)}`;
  }
  const args = (b) => ["A1", "A2"].map((n) => b.getInputTargetBlock(n)).filter(Boolean).map(expr).join(", ");

  function expr(b) {
    switch (b.type) {
      case "py_text": return JSON.stringify(b.getFieldValue("TEXT"));
      case "py_number": return String(b.getFieldValue("NUM"));
      case "py_bool": return b.getFieldValue("BOOL");
      case "py_input": return `input(${raw(b, "PROMPT", "")})`;
      case "py_arith": return binary(b, "0");
      case "py_len": return `len(${raw(b, "X", "")})`;
      case "py_convert": return `${b.getFieldValue("F")}(${raw(b, "X", "")})`;
      case "py_get": return vname(b);
      case "py_range": { const a = raw(b, "A", "0"); const z = raw(b, "B", "0"); return a === "0" ? `range(${z})` : `range(${a}, ${z})`; }
      case "py_compare": case "py_logic": return binary(b, "None");
      case "py_not": return `not ${val(b, "X", "False", 3)}`;
      case "py_in": return `${val(b, "A", "None", 5)} in ${val(b, "B", "[]", 5)}`;
      case "py_list": return `[${["I0", "I1", "I2"].map((n) => b.getInputTargetBlock(n)).filter(Boolean).map(expr).join(", ")}]`;
      case "py_index": return `${val(b, "L", "[]", 9)}[${raw(b, "I", "0")}]`;
      case "py_call": return `${ident(b.getFieldValue("NAME"))}(${args(b)})`;
      default: return "None";
    }
  }

  const chainCode = (b, ind) => { const out = []; for (; b; b = b.getNextBlock()) out.push(...stmtCode(b, ind)); return out; };
  const body = (b, name, ind) => { const l = chainCode(b.getInputTargetBlock(name), ind + 1); return l.length ? l : [pad(ind + 1) + "pass"]; };

  // Chaque ligne générée garde l'id de son bloc (après MARK) : le pas à pas sait quel bloc allumer.
  const MARK = "\u0000";
  function stmtCode(b, ind) {
    const lines = stmtLines(b, ind);
    if (lines.length) lines[0] += MARK + b.id;
    return lines;
  }

  function stmtLines(b, ind) {
    const p = pad(ind);
    switch (b.type) {
      case "py_print": return [`${p}print(${raw(b, "VALUE", "")})`];
      case "py_set": return [`${p}${vname(b)} = ${raw(b, "VALUE")}`];
      case "py_change": return [`${p}${vname(b)} += ${raw(b, "VALUE", "1")}`];
      case "py_repeat": return [`${p}for _ in range(${raw(b, "TIMES", "0")}):`, ...body(b, "DO", ind)];
      case "py_for": return [`${p}for ${vname(b)} in ${raw(b, "ITER", "[]")}:`, ...body(b, "DO", ind)];
      case "py_while": return [`${p}while ${raw(b, "COND", "False")}:`, ...body(b, "DO", ind)];
      case "py_break": return [`${p}break`];
      case "py_if": return [`${p}if ${raw(b, "COND", "False")}:`, ...body(b, "DO", ind)];
      case "py_ifelse": {
        const lines = [`${p}if ${raw(b, "COND", "False")}:`, ...body(b, "DO", ind)];
        let e = b.getInputTargetBlock("ELSE");
        // Un « si » seul dans le « sinon » devient elif, comme en Python.
        while (e && !e.getNextBlock() && (e.type === "py_if" || e.type === "py_ifelse")) {
          lines.push(`${p}elif ${raw(e, "COND", "False")}:${MARK}${e.id}`, ...body(e, "DO", ind));
          e = e.type === "py_ifelse" ? e.getInputTargetBlock("ELSE") : null;
        }
        const rest = chainCode(e, ind + 1);
        if (rest.length) lines.push(`${p}else:`, ...rest);
        return lines;
      }
      case "py_append": return [`${p}${val(b, "LIST", "liste", 9)}.append(${raw(b, "ITEM", "")})`];
      case "py_return": return [`${p}return ${raw(b, "VALUE", "")}`.trimEnd()];
      case "py_call_stmt": return [`${p}${ident(b.getFieldValue("NAME"))}(${args(b)})`];
      case "py_def": return [`${p}def ${ident(b.getFieldValue("NAME"))}(${b.getFieldValue("PARAMS").trim()}):`, ...body(b, "DO", ind)];
      default: return [];
    }
  }

  // Les définitions de fonctions d'abord, puis le programme. Les blocs reliés à rien ne s'exécutent pas.
  function generateLines(ws) {
    const tops = ws.getTopBlocks(true);
    const lines = [];
    tops.filter((b) => b.type === "py_def").forEach((d) => lines.push(...stmtCode(d, 0), ""));
    const prog = tops.find((b) => b.type === "py_program");
    if (prog) lines.push(...chainCode(prog.getNextBlock(), 0));
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    return lines;
  }
  const generate = (ws) => generateLines(ws).map((l) => l.split(MARK)[0]).join("\n").trim() + "\n";
  const lineMap = (ws) => generateLines(ws).map((l) => l.split(MARK)[1] || null);
  const looseCount = (ws) => ws.getTopBlocks(false).filter((b) => b.type !== "py_program" && b.type !== "py_def").length;

  // ---------- Python -> blocs (sous-ensemble du cours) ----------
  const TOKEN = /\s+|#.*$|(\d+\.\d*|\d*\.\d+|\d+)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_À-ɏ][\wÀ-ɏ]*)|(\*\*|\/\/|==|!=|<=|>=|\+=|-=|[-+*/%<>=()[\],:.])/y;
  const KEYWORDS = new Set(["and", "or", "not", "in", "if", "elif", "else", "for", "while", "break", "def", "return", "None", "pass", "is", "import", "from", "class", "try", "except", "with", "lambda", "global", "continue"]);
  const unquote = (s) => s.slice(1, -1).replace(/\\(.)/g, (_, c) => ({ n: "\n", t: "\t" })[c] ?? c);

  function tokenize(line) {
    const toks = [];
    for (let i = 0; i < line.length;) {
      TOKEN.lastIndex = i;
      const m = TOKEN.exec(line);
      if (!m) throw new Error(`caractère inattendu « ${line[i]} »`);
      i = TOKEN.lastIndex;
      if (m[1]) toks.push({ k: "num", v: m[1] });
      else if (m[2]) toks.push({ k: "str", v: unquote(m[2]) });
      else if (m[3]) toks.push({ k: "name", v: m[3] });
      else if (m[4]) toks.push({ k: "op", v: m[4] });
    }
    return toks;
  }

  function parser(toks) {
    let p = 0;
    const isOp = (v) => toks[p]?.k === "op" && toks[p].v === v;
    const isKw = (v) => toks[p]?.k === "name" && toks[p].v === v;
    const eat = (v) => { if (!isOp(v) && !isKw(v)) throw new Error(`« ${v} » attendu`); p++; };
    const list = (end) => { const items = []; if (!isOp(end)) { do items.push(or()); while (isOp(",") && ++p); } eat(end); return items; };
    function or() { let a = and(); while (isKw("or")) { p++; a = { t: "logic", op: "or", a, b: and() }; } return a; }
    function and() { let a = not(); while (isKw("and")) { p++; a = { t: "logic", op: "and", a, b: not() }; } return a; }
    function not() { if (isKw("not")) { p++; return { t: "not", a: not() }; } return cmp(); }
    function cmp() {
      let a = add();
      for (;;) {
        const t = toks[p];
        if (t?.k === "op" && ["==", "!=", "<", ">", "<=", ">="].includes(t.v)) { p++; a = { t: "cmp", op: t.v, a, b: add() }; }
        else if (isKw("in")) { p++; a = { t: "in", a, b: add() }; }
        else return a;
      }
    }
    function add() { let a = mul(); while (isOp("+") || isOp("-")) { const op = toks[p++].v; a = { t: "bin", op, a, b: mul() }; } return a; }
    function mul() { let a = unary(); while (["*", "/", "//", "%"].some(isOp)) { const op = toks[p++].v; a = { t: "bin", op, a, b: unary() }; } return a; }
    function unary() {
      if (isOp("-")) { p++; const a = unary(); return a.t === "num" ? { t: "num", v: "-" + a.v } : { t: "bin", op: "-", a: { t: "num", v: "0" }, b: a }; }
      if (isOp("+")) { p++; return unary(); }
      const a = post();
      if (isOp("**")) { p++; return { t: "bin", op: "**", a, b: unary() }; }
      return a;
    }
    function post() {
      let a = atom();
      for (;;) {
        if (isOp("(")) { p++; a = { t: "call", f: a, args: list(")") }; }
        else if (isOp("[")) { p++; const i = or(); eat("]"); a = { t: "index", a, i }; }
        else if (isOp(".")) { p++; const t = toks[p++]; if (t?.k !== "name") throw new Error("nom attendu après « . »"); a = { t: "attr", a, name: t.v }; }
        else return a;
      }
    }
    function atom() {
      const t = toks[p++];
      if (!t) throw new Error("expression incomplète");
      if (t.k === "num") return { t: "num", v: t.v };
      if (t.k === "str") return { t: "str", v: t.v };
      if (t.k === "name") {
        if (t.v === "True" || t.v === "False") return { t: "bool", v: t.v };
        if (t.v === "___") return { t: "hole" };
        if (KEYWORDS.has(t.v)) throw new Error(`« ${t.v} » n'est pas pris en charge ici`);
        return { t: "name", v: t.v };
      }
      if (t.v === "(") { const e = or(); eat(")"); return e; }
      if (t.v === "[") return { t: "list", items: list("]") };
      throw new Error(`« ${t.v} » inattendu`);
    }
    return { or, eat, isOp, at: (i) => { p = i; }, done: () => { if (p < toks.length) throw new Error(`« ${toks[p].v} » inattendu`); } };
  }

  function parseLine(toks) {
    const P = parser(toks);
    const w = toks[0].k === "name" ? toks[0].v : "";
    const colon = () => { P.eat(":"); P.done(); };
    if (toks.length === 1 && ["pass", "break", "___"].includes(w)) return { t: w === "break" ? "break" : "pass" };
    if (w === "return") { P.at(1); const e = toks.length > 1 ? P.or() : null; P.done(); return { t: "return", e }; }
    if (w === "if" || w === "elif" || w === "while") { P.at(1); const cond = P.or(); colon(); return { t: w, cond, colon: true }; }
    if (w === "else") { P.at(1); colon(); return { t: "else", colon: true }; }
    if (w === "for") {
      if (toks[1]?.k !== "name" || toks[2]?.v !== "in") throw new Error("« for nom in … : » attendu");
      P.at(3); const iter = P.or(); colon();
      return { t: "for", v: toks[1].v, iter, colon: true };
    }
    if (w === "def") {
      if (toks[1]?.k !== "name" || toks[2]?.v !== "(") throw new Error("« def nom(…) : » attendu");
      let i = 3; const params = [];
      while (toks[i] && toks[i].v !== ")") { if (toks[i].k === "name") params.push(toks[i].v); i++; }
      P.at(i + 1); colon();
      return { t: "def", name: toks[1].v, params, colon: true };
    }
    if (toks[0].k === "name" && (toks[1]?.v === "=" || toks[1]?.v === "+=")) {
      P.at(2); const e = P.or(); P.done();
      return { t: toks[1].v === "=" ? "set" : "change", v: w, e };
    }
    P.at(0); const e = P.or(); P.done();
    if (e.t !== "call") throw new Error("instruction non prise en charge");
    return { t: "expr", e };
  }

  function parseProgram(code) {
    const lines = code.replace(/\t/g, "    ").split("\n").map((s, i) => ({ ind: s.match(/^ */)[0].length, no: i + 1, src: s }))
      .map((l) => { try { return { ...l, toks: tokenize(l.src) }; } catch (e) { throw new Error(`ligne ${l.no} : ${e.message}`); } })
      .filter((l) => l.toks.length);
    let i = 0;
    function block(ind) {
      const out = [];
      while (i < lines.length && lines[i].ind === ind) {
        const L = lines[i++];
        let s;
        try { s = parseLine(L.toks); } catch (e) { throw new Error(`ligne ${L.no} : ${e.message}`); }
        if (s.colon) {
          if (!(i < lines.length && lines[i].ind > ind)) throw new Error(`ligne ${L.no} : corps vide après « : »`);
          s.body = block(lines[i].ind);
        }
        if (s.t === "elif" || s.t === "else") {
          const prev = out[out.length - 1];
          if (prev?.t !== "if" || prev.closed) throw new Error(`ligne ${L.no} : « ${s.t} » sans « if »`);
          const tail = prev.tail || prev;
          if (s.t === "elif") { const n = { t: "if", cond: s.cond, body: s.body, orelse: null }; tail.orelse = [n]; prev.tail = n; }
          else { tail.orelse = s.body; prev.closed = true; }
        } else out.push(s);
      }
      if (i < lines.length && lines[i].ind > ind) throw new Error(`ligne ${lines[i].no} : indentation inattendue`);
      return out;
    }
    const prog = block(0);
    if (i < lines.length) throw new Error(`ligne ${lines[i].no} : indentation incohérente`);
    return prog;
  }

  // Arbre Python -> état JSON Blockly. Un trou « ___ » laisse l'emplacement vide (à compléter par l'élève).
  const inputs = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v).map(([k, v]) => [k, { block: v }]));
  const num = (v) => ({ type: "py_number", fields: { NUM: Number(v) } });

  function E(n) {
    switch (n.t) {
      case "hole": return null;
      case "num": return num(n.v);
      case "str": return { type: "py_text", fields: { TEXT: n.v } };
      case "bool": return { type: "py_bool", fields: { BOOL: n.v } };
      case "name": return { type: "py_get", fields: { VAR: { name: n.v } } };
      case "bin": return { type: "py_arith", fields: { OP: n.op }, inputs: inputs({ A: E(n.a), B: E(n.b) }) };
      case "cmp": return { type: "py_compare", fields: { OP: n.op }, inputs: inputs({ A: E(n.a), B: E(n.b) }) };
      case "logic": return { type: "py_logic", fields: { OP: n.op }, inputs: inputs({ A: E(n.a), B: E(n.b) }) };
      case "not": return { type: "py_not", inputs: inputs({ X: E(n.a) }) };
      case "in": return { type: "py_in", inputs: inputs({ A: E(n.a), B: E(n.b) }) };
      case "index": return { type: "py_index", inputs: inputs({ L: E(n.a), I: E(n.i) }) };
      case "list":
        if (n.items.length > 3) throw new Error("liste de plus de 3 éléments");
        return { type: "py_list", inputs: inputs(Object.fromEntries(n.items.map((x, k) => [`I${k}`, E(x)]))) };
      case "call": {
        if (n.f.t !== "name") throw new Error("méthode non prise en charge dans les blocs");
        const f = n.f.v; const a = n.args;
        if (f === "len" && a.length === 1) return { type: "py_len", inputs: inputs({ X: E(a[0]) }) };
        if (f === "input" && a.length <= 1) return { type: "py_input", inputs: inputs({ PROMPT: a[0] && E(a[0]) }) };
        if (f === "range" && a.length === 1) return { type: "py_range", inputs: inputs({ A: num(0), B: E(a[0]) }) };
        if (f === "range" && a.length === 2) return { type: "py_range", inputs: inputs({ A: E(a[0]), B: E(a[1]) }) };
        if (["int", "str", "float"].includes(f) && a.length === 1) return { type: "py_convert", fields: { F: f }, inputs: inputs({ X: E(a[0]) }) };
        if (a.length <= 2 && !["print", "range", "len", "input"].includes(f)) return { type: "py_call", fields: { NAME: f }, inputs: inputs({ A1: a[0] && E(a[0]), A2: a[1] && E(a[1]) }) };
        throw new Error(`appel ${f}(…) non pris en charge`);
      }
      default: throw new Error("expression non prise en charge dans les blocs");
    }
  }

  function S(n) {
    switch (n.t) {
      case "set": return { type: "py_set", fields: { VAR: { name: n.v } }, inputs: inputs({ VALUE: E(n.e) }) };
      case "change": return { type: "py_change", fields: { VAR: { name: n.v } }, inputs: inputs({ VALUE: E(n.e) }) };
      case "break": return { type: "py_break" };
      case "return": return { type: "py_return", inputs: inputs({ VALUE: n.e && E(n.e) }) };
      case "while": return { type: "py_while", inputs: inputs({ COND: E(n.cond), DO: chain(n.body) }) };
      case "if":
        return n.orelse
          ? { type: "py_ifelse", inputs: inputs({ COND: E(n.cond), DO: chain(n.body), ELSE: chain(n.orelse) }) }
          : { type: "py_if", inputs: inputs({ COND: E(n.cond), DO: chain(n.body) }) };
      case "for": {
        const it = n.iter;
        if (n.v === "_" && it.t === "call" && it.f.t === "name" && it.f.v === "range" && it.args.length === 1) {
          return { type: "py_repeat", inputs: inputs({ TIMES: E(it.args[0]), DO: chain(n.body) }) };
        }
        return { type: "py_for", fields: { VAR: { name: n.v } }, inputs: inputs({ ITER: E(it), DO: chain(n.body) }) };
      }
      case "def": return { type: "py_def", fields: { NAME: n.name, PARAMS: n.params.join(", ") }, inputs: inputs({ DO: chain(n.body) }) };
      case "expr": {
        const c = n.e;
        if (c.f.t === "attr" && c.f.name === "append" && c.args.length === 1) return { type: "py_append", inputs: inputs({ ITEM: E(c.args[0]), LIST: E(c.f.a) }) };
        if (c.f.t === "name" && c.f.v === "print") {
          if (c.args.length > 1) throw new Error("print avec plusieurs valeurs : utilise + pour les coller");
          return { type: "py_print", inputs: inputs({ VALUE: c.args[0] && E(c.args[0]) }) };
        }
        if (c.f.t === "name" && c.args.length <= 2) return { type: "py_call_stmt", fields: { NAME: c.f.v }, inputs: inputs({ A1: c.args[0] && E(c.args[0]), A2: c.args[1] && E(c.args[1]) }) };
        throw new Error("instruction non prise en charge dans les blocs");
      }
      default: throw new Error(`« ${n.t} » non pris en charge dans les blocs`);
    }
  }

  function chain(list) {
    const states = list.filter((n) => n.t !== "pass").map(S);
    for (let k = states.length - 2; k >= 0; k--) states[k].next = { block: states[k + 1] };
    return states[0] || null;
  }

  function toStates(code) {
    const ast = parseProgram(code || "");
    const prog = { type: "py_program" };
    const rest = chain(ast.filter((n) => n.t !== "def"));
    if (rest) prog.next = { block: rest };
    return [...ast.filter((n) => n.t === "def").map(S), prog];
  }

  // ---------- Palette ----------
  const CATS = [
    ["valeurs", "Valeurs", [{ type: "py_text" }, { type: "py_number", fields: { NUM: 3 } }, { type: "py_bool" }]],
    ["afficher", "Afficher", [{ type: "py_print", inputs: { VALUE: { shadow: { type: "py_text", fields: { TEXT: "Bonjour" } } } } }, { type: "py_input", inputs: { PROMPT: { shadow: { type: "py_text", fields: { TEXT: "Ton nom ?" } } } } }]],
    ["operations", "Opérations", [
      { type: "py_arith", inputs: { A: { shadow: { type: "py_number", fields: { NUM: 1 } } }, B: { shadow: { type: "py_number", fields: { NUM: 2 } } } } },
      { type: "py_len" }, { type: "py_convert", fields: { F: "int" } }]],
    ["variables", "Variables", "PY_VARS"],
    ["boucles", "Boucles", [
      { type: "py_repeat", inputs: { TIMES: { shadow: { type: "py_number", fields: { NUM: 3 } } } } },
      { type: "py_for" },
      { type: "py_range", inputs: { A: { shadow: { type: "py_number", fields: { NUM: 0 } } }, B: { shadow: { type: "py_number", fields: { NUM: 5 } } } } },
      { type: "py_while" }, { type: "py_break" }]],
    ["conditions", "Conditions", [
      { type: "py_if" }, { type: "py_ifelse" },
      { type: "py_compare", inputs: { B: { shadow: { type: "py_number", fields: { NUM: 0 } } } } },
      { type: "py_logic" }, { type: "py_not" }, { type: "py_in" }]],
    ["listes", "Listes", [{ type: "py_list" }, { type: "py_append" }, { type: "py_index", inputs: { I: { shadow: { type: "py_number", fields: { NUM: 0 } } } } }]],
    ["fonctions", "Fonctions", [{ type: "py_def" }, { type: "py_return" }, { type: "py_call" }, { type: "py_call_stmt" }]],
  ];
  const CAT_IDS = CATS.map((c) => c[0]);

  function toolboxDef(cats) {
    const keep = cats && cats.length ? cats.map((c) => String(c).toLowerCase()) : CAT_IDS;
    return {
      kind: "categoryToolbox",
      contents: CATS.filter(([id]) => keep.includes(id)).map(([id, name, blocks]) => (
        typeof blocks === "string"
          ? { kind: "category", name, colour: COLOR[id], custom: blocks }
          : { kind: "category", name, colour: COLOR[id], contents: blocks.map((b) => ({ kind: "block", ...b })) }
      )),
    };
  }

  const RESERVED = new Set(["False", "None", "True", "and", "as", "assert", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield", "print", "input", "len", "range", "int", "str", "float", "list"]);

  function newVariable(ws) {
    const asked = window.prompt("Nom de la nouvelle variable (les espaces deviennent _) :", "");
    if (asked === null) return;
    const name = asked.trim().replace(/\s+/g, "_");
    if (!name) return;
    if (/^\d/.test(name)) return alert("Un nom de variable ne peut pas commencer par un chiffre.");
    if (!/^[A-Za-z_À-ɏ][\wÀ-ɏ]*$/.test(name)) return alert("Seulement des lettres, des chiffres et _ (pas de tiret ni de signe).");
    if (RESERVED.has(name)) return alert(`« ${name} » est un mot réservé de Python : choisis un autre nom.`);
    if (ws.getVariable(name)) return alert("Cette variable existe déjà.");
    ws.createVariable(name);
  }

  // ---------- Zone de travail ----------
  let ws = null, loaded = "", solution = null, listeners = [];

  function mount(div) {
    ws = Blockly.inject(div, {
      toolbox: toolboxDef(), renderer: "zelos", trashcan: true, sounds: false,
      zoom: { controls: true, wheel: true, startScale: 0.75 }, move: { scrollbars: true, drag: true, wheel: false },
    });
    ws.registerButtonCallback("PY_NEW_VAR", () => newVariable(ws));
    ws.registerToolboxCategoryCallback("PY_VARS", (w) => {
      const items = [{ kind: "button", text: "+ Nouvelle variable", callbackKey: "PY_NEW_VAR" }];
      for (const v of w.getAllVariables()) {
        const f = { VAR: { id: v.getId() } };
        items.push(
          { kind: "block", type: "py_set", fields: f, inputs: { VALUE: { shadow: { type: "py_number", fields: { NUM: 0 } } } } },
          { kind: "block", type: "py_change", fields: f, inputs: { VALUE: { shadow: { type: "py_number", fields: { NUM: 1 } } } } },
          { kind: "block", type: "py_get", fields: f },
        );
      }
      return items;
    });
    ws.addChangeListener((e) => { if (!e.isUiEvent) listeners.forEach((fn) => fn()); });
    new ResizeObserver(() => Blockly.svgResize(ws)).observe(div);
    load("");
  }

  // Cadre les blocs dans la zone visible (à droite de la palette), sans trop zoomer un petit programme.
  function fit() {
    requestAnimationFrame(() => {
      Blockly.svgResize(ws);
      ws.zoomToFit();
      if (ws.scale > 0.8) ws.setScale(0.8);
      ws.scrollCenter();
    });
  }

  // cats vide : toute la palette, sauf si none (casse-tête sans blocs libres) : palette masquée.
  function setToolbox(cats, none = false) {
    const empty = none && !(cats && cats.length);
    ws.updateToolbox(empty ? toolboxDef(["valeurs"]) : toolboxDef(cats));
    ws.getToolbox()?.setVisible(!empty);
    Blockly.svgResize(ws);
  }

  function load(code) {
    const states = toStates(code); // lève une erreur avant de vider la zone si le code n'est pas traduisible
    ws.clear();
    solution = null;
    states.forEach((s) => Blockly.serialization.blocks.append(s, ws));
    ws.cleanUp();
    fit();
    loaded = generate(ws);
  }

  // Casse-tête (problème de Parsons) : les blocs de la solution, imposés (non supprimables), détachés et mélangés.
  function puzzle(code) {
    load(code);
    const ref = /\b___\b/.test(code) ? null : generate(ws);
    const pieces = ws.getAllBlocks(true).filter((b) => b.previousConnection && b.type !== "py_program");
    pieces.reverse().forEach((b) => b.unplug(true));
    ws.getAllBlocks(false).forEach((b) => b.setDeletable(false));
    const loose = ws.getTopBlocks(false).filter((b) => b.previousConnection).sort(() => Math.random() - 0.5);
    const prog = ws.getBlocksByType("py_program")[0];
    const x0 = prog.getRelativeToSurfaceXY().x + prog.getHeightWidth().width + 80;
    let y = 0;
    loose.forEach((b) => { b.moveTo(new Blockly.utils.Coordinate(x0, y)); y += b.getHeightWidth().height + 24; });
    fit();
    loaded = generate(ws);
    solution = ref;
  }

  window.Blocs = {
    mount, load, puzzle, setToolbox, fit,
    code: () => generate(ws),
    lineMap: () => lineMap(ws),
    highlight: (id) => { ws.highlightBlock(null); if (id && ws.getBlockById(id)) ws.highlightBlock(id); },
    loose: () => looseCount(ws),
    dirty: () => generate(ws) !== loaded,
    isPuzzle: () => solution !== null,
    solved: () => solution !== null && looseCount(ws) === 0 && generate(ws) === solution,
    translatable: (code) => { try { toStates(code); return ""; } catch (e) { return e.message; } },
    onChange: (fn) => listeners.push(fn),
    resize: () => ws && Blockly.svgResize(ws),
  };
})();
