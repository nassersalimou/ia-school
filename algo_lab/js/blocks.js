/* Blocs du pseudo-code du cours (Blockly, rendu « zelos »). Le texte des blocs est la syntaxe exacte du cours
   (si … alors … finsi, tant que … faire … fintantque, L->suivant, retourner …) pour la mémoriser.
   Blocs -> texte : generate ; texte -> blocs : à partir de l'arbre du parser (Algo.parse). */
(function (root) {
  "use strict";
  const COL = { struct: "#5b6ee1", decl: "#8f5bd9", ctrl: "#e0a020", val: "#4aa3c8", op: "#4cae4f", ptr: "#e8590c", sd: "#d6336c", io: "#c25bc2" };
  const stmt = { previousStatement: null, nextStatement: null };
  const TYPES = [["entier", "entier"], ["booleen", "booleen"], ["chaine", "chaine"], ["Liste", "Liste"], ["Arbre", "Arbre"], ["Pile", "Pile"], ["File", "File"], ["reel", "reel"]];
  const FIELDS = [["valeur", "valeur"], ["suivant", "suivant"], ["precedent", "precedent"], ["val", "val"], ["g", "g"], ["d", "d"], ["gauche", "gauche"], ["droit", "droit"]];

  Blockly.common.defineBlocksWithJsonArray([
    // Structure
    { type: "a_fn", message0: "fonction avec retour %1 %2 ( %3 ) %4 début %5 fin", args0: [{ type: "field_input", name: "TYPE", text: "entier" }, { type: "field_input", name: "NAME", text: "f" }, { type: "field_input", name: "PARAMS", text: "Liste L" }, { type: "input_dummy" }, { type: "input_statement", name: "BODY" }], colour: COL.struct, tooltip: "Fonction qui retourne une valeur. Paramètres : « Liste L, entier x » ou « var A : Arbre »." },
    { type: "a_proc", message0: "fonction sans retour %1 ( %2 ) %3 début %4 fin", args0: [{ type: "field_input", name: "NAME", text: "f" }, { type: "field_input", name: "PARAMS", text: "Liste L" }, { type: "input_dummy" }, { type: "input_statement", name: "BODY" }], colour: COL.struct, tooltip: "Fonction sans valeur de retour (procédure)." },
    { type: "a_main", message0: "début %1 %2 fin", args0: [{ type: "input_dummy" }, { type: "input_statement", name: "BODY" }], colour: COL.struct, tooltip: "Programme principal." },
    // Déclarations et affectation
    { type: "a_decl", message0: "%1 %2 ;", args0: [{ type: "field_dropdown", name: "TYPE", options: TYPES }, { type: "field_input", name: "NAMES", text: "x" }], ...stmt, colour: COL.decl, tooltip: "Déclaration : « entier n; » ou « Liste p, q; » (noms séparés par des virgules)." },
    { type: "a_assign", message0: "%1 ← %2 ;", args0: [{ type: "input_value", name: "TARGET" }, { type: "input_value", name: "VALUE" }], inputsInline: true, ...stmt, colour: COL.decl, tooltip: "Affectation : range la valeur de droite dans la variable ou le champ de gauche." },
    // Contrôle
    { type: "a_if", message0: "si %1 alors %2 %3 finsi", args0: [{ type: "input_value", name: "COND", check: "Boolean" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], inputsInline: true, ...stmt, colour: COL.ctrl, tooltip: "si (condition) alors … finsi" },
    { type: "a_ifelse", message0: "si %1 alors %2 %3 sinon %4 %5 finsi", args0: [{ type: "input_value", name: "COND", check: "Boolean" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }, { type: "input_dummy" }, { type: "input_statement", name: "ELSE" }], inputsInline: true, ...stmt, colour: COL.ctrl, tooltip: "si … alors … sinon … finsi" },
    { type: "a_while", message0: "tant que %1 faire %2 %3 fintantque", args0: [{ type: "input_value", name: "COND", check: "Boolean" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], inputsInline: true, ...stmt, colour: COL.ctrl, tooltip: "Répète tant que la condition est vraie." },
    { type: "a_for", message0: "pour %1 allant de %2 à %3 faire %4 %5 finpour", args0: [{ type: "field_input", name: "VAR", text: "i" }, { type: "input_value", name: "FROM" }, { type: "input_value", name: "TO" }, { type: "input_dummy" }, { type: "input_statement", name: "DO" }], inputsInline: true, ...stmt, colour: COL.ctrl, tooltip: "Boucle pour, de la valeur de départ à la valeur d'arrivée comprise." },
    { type: "a_return", message0: "retourner %1 ;", args0: [{ type: "input_value", name: "VALUE" }], inputsInline: true, previousStatement: null, colour: COL.ctrl, tooltip: "Termine la fonction et donne sa valeur." },
    { type: "a_write", message0: "écrire( %1 ) ;", args0: [{ type: "input_value", name: "VALUE" }], inputsInline: true, ...stmt, colour: COL.io, tooltip: "Affiche une valeur." },
    { type: "a_new", message0: "new( %1 ) ;", args0: [{ type: "input_value", name: "P" }], inputsInline: true, ...stmt, colour: COL.ptr, tooltip: "Crée une nouvelle cellule (ou un nouveau nœud) et la fait désigner par p." },
    { type: "a_cons", message0: "creerListe( %1 , %2 )", args0: [{ type: "input_value", name: "X" }, { type: "input_value", name: "L" }], inputsInline: true, output: null, colour: COL.ptr, tooltip: "Crée une cellule de valeur x placée devant la liste L, et la renvoie (L n'est pas modifiée)." },
    { type: "a_callst", message0: "%1 ( %2 %3 %4 ) ;", args0: [{ type: "field_input", name: "NAME", text: "empiler" }, { type: "input_value", name: "A1" }, { type: "input_value", name: "A2" }, { type: "input_value", name: "A3" }], inputsInline: true, ...stmt, colour: COL.sd, tooltip: "Appel de fonction utilisé comme instruction (empiler, enfiler, une fonction sans retour…)." },
    // Valeurs
    { type: "a_var", message0: "%1", args0: [{ type: "field_input", name: "NAME", text: "L" }], output: null, colour: COL.val, tooltip: "Une variable." },
    { type: "a_num", message0: "%1", args0: [{ type: "field_number", name: "NUM", value: 0 }], output: "Number", colour: COL.val, tooltip: "Un nombre." },
    { type: "a_str", message0: "' %1 '", args0: [{ type: "field_input", name: "TEXT", text: "(" }], output: "String", colour: COL.val, tooltip: "Un caractère ou une chaîne." },
    { type: "a_bool", message0: "%1", args0: [{ type: "field_dropdown", name: "BOOL", options: [["vrai", "vrai"], ["faux", "faux"]] }], output: "Boolean", colour: COL.val, tooltip: "vrai ou faux." },
    { type: "a_null", message0: "vide", output: null, colour: COL.ptr, tooltip: "Pointeur vide (liste vide, arbre vide)." },
    { type: "a_field", message0: "%1 -> %2", args0: [{ type: "input_value", name: "OBJ" }, { type: "field_dropdown", name: "FIELD", options: FIELDS }], inputsInline: true, output: null, colour: COL.ptr, tooltip: "Champ de la cellule ou du nœud désigné (p->valeur, p->suivant, A->g…)." },
    { type: "a_index", message0: "%1 [ %2 ]", args0: [{ type: "input_value", name: "OBJ" }, { type: "input_value", name: "I" }], inputsInline: true, output: null, colour: COL.val, tooltip: "Caractère i d'une chaîne (à partir de 0)." },
    { type: "a_arith", message0: "%1 %2 %3", args0: [{ type: "input_value", name: "A" }, { type: "field_dropdown", name: "OP", options: [["+", "+"], ["-", "-"], ["*", "*"], ["/", "/"], ["mod", "mod"], ["div", "div"]] }, { type: "input_value", name: "B" }], inputsInline: true, output: "Number", colour: COL.op, tooltip: "Calcul. mod = reste, div = quotient entier." },
    { type: "a_cmp", message0: "%1 %2 %3", args0: [{ type: "input_value", name: "A" }, { type: "field_dropdown", name: "OP", options: [["=", "="], ["≠", "≠"], ["<", "<"], [">", ">"], ["<=", "<="], [">=", ">="]] }, { type: "input_value", name: "B" }], inputsInline: true, output: "Boolean", colour: COL.op, tooltip: "Comparaison (= compare, ← affecte)." },
    { type: "a_logic", message0: "%1 %2 %3", args0: [{ type: "input_value", name: "A", check: "Boolean" }, { type: "field_dropdown", name: "OP", options: [["et", "et"], ["ou", "ou"]] }, { type: "input_value", name: "B", check: "Boolean" }], inputsInline: true, output: "Boolean", colour: COL.op, tooltip: "et / ou" },
    { type: "a_not", message0: "non %1", args0: [{ type: "input_value", name: "X", check: "Boolean" }], inputsInline: true, output: "Boolean", colour: COL.op, tooltip: "non (condition)" },
    { type: "a_call", message0: "%1 ( %2 %3 %4 )", args0: [{ type: "field_input", name: "NAME", text: "sommet" }, { type: "input_value", name: "A1" }, { type: "input_value", name: "A2" }, { type: "input_value", name: "A3" }], inputsInline: true, output: null, colour: COL.sd, tooltip: "Appel de fonction qui donne une valeur (sommet, tête, estvide, dépiler, ta fonction…)." },
    { type: "a_callb", message0: "%1 ( %2 )", args0: [{ type: "field_input", name: "NAME", text: "estvide" }, { type: "input_value", name: "A1" }], inputsInline: true, output: "Boolean", colour: COL.sd, tooltip: "Fonction qui donne vrai ou faux (estvide…)." },
  ]);

  // ---------------- Blocs -> pseudo-code ----------------
  const PREC = { ou: 1, et: 2, non: 3, "=": 4, "≠": 4, "<": 4, ">": 4, "<=": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, mod: 6, div: 6 };
  const prec = (b) => (b.type === "a_logic" || b.type === "a_cmp" || b.type === "a_arith" ? PREC[b.getFieldValue("OP")] : b.type === "a_not" ? 3 : 9);
  const pad = (n) => "    ".repeat(n);
  const MARK = "\u0000";
  const raw = (b, n, def = "?") => { const c = b.getInputTargetBlock(n); return c ? expr(c) : def; };
  const val = (b, n, min, def = "?") => { const c = b.getInputTargetBlock(n); if (!c) return def; const s = expr(c); return prec(c) < min ? `(${s})` : s; };
  const args = (b) => ["A1", "A2", "A3"].map((n) => b.getInputTargetBlock(n)).filter(Boolean).map(expr).join(", ");
  const cond = (b) => { const c = b.getInputTargetBlock("COND"); return c ? `(${expr(c)})` : "(?)"; };

  function expr(b) {
    switch (b.type) {
      case "a_var": return b.getFieldValue("NAME").trim() || "?";
      case "a_num": return String(b.getFieldValue("NUM"));
      case "a_str": { const t = b.getFieldValue("TEXT"); return t.length === 1 && t !== "'" ? `'${t}'` : JSON.stringify(t); }
      case "a_bool": return b.getFieldValue("BOOL");
      case "a_null": return "vide";
      case "a_field": return `${val(b, "OBJ", 9)}->${b.getFieldValue("FIELD")}`;
      case "a_index": return `${val(b, "OBJ", 9)}[${raw(b, "I", "0")}]`;
      case "a_arith": case "a_cmp": case "a_logic": {
        const p = prec(b);
        return `${val(b, "A", p)} ${b.getFieldValue("OP")} ${val(b, "B", p + (b.type === "a_logic" ? 0 : 1))}`;
      }
      case "a_not": return `non ${val(b, "X", 4)}`;
      case "a_call": case "a_callb": return `${b.getFieldValue("NAME").trim()}(${args(b)})`;
      case "a_cons": return `creerListe(${raw(b, "X", "0")}, ${raw(b, "L", "vide")})`;
    }
    return "?";
  }

  const chain = (b, ind) => { const out = []; for (; b; b = b.getNextBlock()) out.push(...stmtCode(b, ind)); return out; };
  const body = (b, n, ind) => chain(b.getInputTargetBlock(n), ind + 1);

  function stmtCode(b, ind) {
    const l = stmtLines(b, ind);
    if (l.length) l[0] += MARK + b.id;
    return l;
  }
  function stmtLines(b, ind) {
    const p = pad(ind);
    switch (b.type) {
      case "a_decl": return [`${p}${b.getFieldValue("TYPE")} ${b.getFieldValue("NAMES").trim() || "x"};`];
      case "a_assign": return [`${p}${raw(b, "TARGET")} ← ${raw(b, "VALUE")};`];
      case "a_if": return [`${p}si ${cond(b)} alors`, ...body(b, "DO", ind), `${p}finsi`];
      case "a_ifelse": return [`${p}si ${cond(b)} alors`, ...body(b, "DO", ind), `${p}sinon`, ...body(b, "ELSE", ind), `${p}finsi`];
      case "a_while": return [`${p}tant que ${cond(b)} faire`, ...body(b, "DO", ind), `${p}fintantque`];
      case "a_for": return [`${p}pour ${b.getFieldValue("VAR").trim() || "i"} allant de ${raw(b, "FROM", "0")} à ${raw(b, "TO", "0")} faire`, ...body(b, "DO", ind), `${p}finpour`];
      case "a_return": return [`${p}retourner ${raw(b, "VALUE", "")};`.replace(" ;", ";")];
      case "a_write": return [`${p}écrire(${raw(b, "VALUE", "")});`];
      case "a_new": return [`${p}new(${raw(b, "P")});`];
      case "a_callst": return [`${p}${b.getFieldValue("NAME").trim()}(${args(b)});`];
      case "a_fn": return [`fonction avec retour ${b.getFieldValue("TYPE").trim()} ${b.getFieldValue("NAME").trim()}(${b.getFieldValue("PARAMS").trim()})`, "début", ...body(b, "BODY", 0), "fin"];
      case "a_proc": return [`fonction sans retour ${b.getFieldValue("NAME").trim()}(${b.getFieldValue("PARAMS").trim()})`, "début", ...body(b, "BODY", 0), "fin"];
      case "a_main": return ["début", ...body(b, "BODY", 0), "fin"];
    }
    return [];
  }

  function generateLines(ws) {
    const tops = ws.getTopBlocks(true).filter((b) => ["a_fn", "a_proc", "a_main"].includes(b.type));
    tops.sort((a, b) => (a.type === "a_main") - (b.type === "a_main"));
    const lines = [];
    tops.forEach((t, i) => { if (i) lines.push(""); lines.push(...stmtCode(t, 0)); });
    return lines;
  }
  const generate = (ws) => generateLines(ws).map((l) => l.split(MARK)[0]).join("\n") + "\n";
  const lineMap = (ws) => generateLines(ws).map((l) => l.split(MARK)[1] || null);
  const loose = (ws) => ws.getTopBlocks(false).filter((b) => !["a_fn", "a_proc", "a_main"].includes(b.type)).length;

  // ---------------- Pseudo-code -> blocs ----------------
  const inputs = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v).map(([k, v]) => [k, { block: v }]));
  const FIELD_OK = new Set(FIELDS.map((f) => f[0]));

  function E(n) {
    switch (n.k) {
      case "num": return { type: "a_num", fields: { NUM: n.v } };
      case "str": return { type: "a_str", fields: { TEXT: n.v } };
      case "bool": return { type: "a_bool", fields: { BOOL: n.v ? "vrai" : "faux" } };
      case "null": return { type: "a_null" };
      case "var": return { type: "a_var", fields: { NAME: n.name } };
      case "field": {
        const f = FIELD_OK.has(n.field) ? n.field : Algo.fieldName(n.field);
        if (!FIELD_OK.has(f)) throw new Error(`champ ${n.field} non disponible en blocs`);
        return { type: "a_field", fields: { FIELD: f }, inputs: inputs({ OBJ: E(n.obj) }) };
      }
      case "index": return { type: "a_index", inputs: inputs({ OBJ: E(n.obj), I: E(n.idx) }) };
      case "bin":
        if (n.op === "et" || n.op === "ou") return { type: "a_logic", fields: { OP: n.op }, inputs: inputs({ A: E(n.a), B: E(n.b) }) };
        if (["=", "≠", "<", ">", "<=", ">="].includes(n.op)) return { type: "a_cmp", fields: { OP: n.op }, inputs: inputs({ A: E(n.a), B: E(n.b) }) };
        return { type: "a_arith", fields: { OP: n.op }, inputs: inputs({ A: E(n.a), B: E(n.b) }) };
      case "un":
        if (n.op === "non") return { type: "a_not", inputs: inputs({ X: E(n.a) }) };
        if (n.a.k === "num") return { type: "a_num", fields: { NUM: -n.a.v } };
        return { type: "a_arith", fields: { OP: "-" }, inputs: inputs({ A: { type: "a_num", fields: { NUM: 0 } }, B: E(n.a) }) };
      case "call": {
        if (n.args.length > 3) throw new Error("appel à plus de 3 paramètres");
        if (/^(creerliste|creercellule|cons)$/.test(Algo.norm(n.name).replace(/_/g, "")) && n.args.length === 2) return { type: "a_cons", inputs: inputs({ X: E(n.args[0]), L: E(n.args[1]) }) };
        const isBool = /^(est_?vide|vide|estchiffre)$/i.test(Algo.norm(n.name)) && n.args.length === 1;
        return { type: isBool ? "a_callb" : "a_call", fields: { NAME: n.name }, inputs: inputs(Object.fromEntries(n.args.map((a, i) => [`A${i + 1}`, E(a)]))) };
      }
    }
    throw new Error("expression non disponible en blocs");
  }

  function S(n) {
    switch (n.k) {
      case "decl":
        if (n.names.some((x) => x.size)) throw new Error("tableaux non disponibles en blocs");
        return { type: "a_decl", fields: { TYPE: matchType(n.type), NAMES: n.names.map((x) => x.name).join(", ") } };
      case "assign": return { type: "a_assign", inputs: inputs({ TARGET: E(n.target), VALUE: E(n.value) }) };
      case "if":
        return n.else ? { type: "a_ifelse", inputs: inputs({ COND: E(n.cond), DO: chainS(n.then), ELSE: chainS(n.else) }) }
          : { type: "a_if", inputs: inputs({ COND: E(n.cond), DO: chainS(n.then) }) };
      case "while": return { type: "a_while", inputs: inputs({ COND: E(n.cond), DO: chainS(n.body) }) };
      case "for":
        if (n.step) throw new Error("boucle pour avec pas non disponible en blocs");
        return { type: "a_for", fields: { VAR: n.v }, inputs: inputs({ FROM: E(n.from), TO: E(n.to), DO: chainS(n.body) }) };
      case "return": return { type: "a_return", inputs: inputs({ VALUE: n.value && E(n.value) }) };
      case "write":
        if (n.args.length > 1) throw new Error("écrire avec plusieurs valeurs : un bloc écrire par valeur");
        return { type: "a_write", inputs: inputs({ VALUE: n.args[0] && E(n.args[0]) }) };
      case "callstmt": {
        const c = n.call;
        if (/^(new|nouveau|allouer)$/.test(Algo.norm(c.name)) && c.args.length === 1) return { type: "a_new", inputs: inputs({ P: E(c.args[0]) }) };
        if (c.args.length > 3) throw new Error("appel à plus de 3 paramètres");
        return { type: "a_callst", fields: { NAME: c.name }, inputs: inputs(Object.fromEntries(c.args.map((a, i) => [`A${i + 1}`, E(a)]))) };
      }
    }
    throw new Error(`« ${n.k} » non disponible en blocs`);
  }
  const matchType = (t) => (TYPES.find(([x]) => Algo.norm(x) === Algo.norm(t)) || [t])[0];
  function chainS(list) {
    const st = list.map(S);
    for (let i = st.length - 2; i >= 0; i--) st[i].next = { block: st[i + 1] };
    return st[0] || null;
  }
  const paramText = (pm) => (pm.ref ? `var ${pm.name} : ${pm.type || "Element"}` : pm.type ? `${pm.type} ${pm.name}` : pm.name);

  function toStates(code) {
    const prog = Algo.parse(code);
    const states = Object.values(prog.functions).sort((a, b) => a.line - b.line).map((f) => (f.returns
      ? { type: "a_fn", fields: { TYPE: f.returns, NAME: f.name, PARAMS: f.params.map(paramText).join(", ") }, inputs: inputs({ BODY: chainS(f.body) }) }
      : { type: "a_proc", fields: { NAME: f.name, PARAMS: f.params.map(paramText).join(", ") }, inputs: inputs({ BODY: chainS(f.body) }) }));
    if (prog.main) states.push({ type: "a_main", inputs: inputs({ BODY: chainS(prog.main.body) }) });
    return states;
  }

  // ---------------- Palette ----------------
  const blk = (type, extra = {}) => ({ kind: "block", type, ...extra });
  const sh = (type, fields) => ({ shadow: { type, fields } });
  const v = (name) => ({ block: { type: "a_var", fields: { NAME: name } } });
  const TOOLBOX = {
    kind: "categoryToolbox",
    contents: [
      { kind: "category", name: "Fonctions", colour: COL.struct, contents: [blk("a_fn"), blk("a_proc"), blk("a_main"), blk("a_return"), blk("a_call", { fields: { NAME: "f" } }), blk("a_callst", { fields: { NAME: "f" } })] },
      { kind: "category", name: "Variables", colour: COL.decl, contents: [blk("a_decl"), blk("a_assign"), blk("a_var"), blk("a_num"), blk("a_str"), blk("a_bool")] },
      { kind: "category", name: "Contrôle", colour: COL.ctrl, contents: [blk("a_if"), blk("a_ifelse"), blk("a_while"), blk("a_for", { inputs: { FROM: sh("a_num", { NUM: 0 }), TO: sh("a_num", { NUM: 10 }) } })] },
      { kind: "category", name: "Opérations", colour: COL.op, contents: [blk("a_arith"), blk("a_cmp"), blk("a_cmp", { fields: { OP: "≠" }, inputs: { B: { block: { type: "a_null" } } } }), blk("a_logic"), blk("a_not")] },
      { kind: "category", name: "Pointeurs", colour: COL.ptr, contents: [blk("a_null"), blk("a_field", { inputs: { OBJ: v("L") } }), blk("a_field", { fields: { FIELD: "suivant" }, inputs: { OBJ: v("L") } }), blk("a_field", { fields: { FIELD: "g" }, inputs: { OBJ: v("A") } }), blk("a_field", { fields: { FIELD: "d" }, inputs: { OBJ: v("A") } }), blk("a_new", { inputs: { P: v("p") } }), blk("a_cons", { inputs: { X: v("x"), L: v("L") } })] },
      { kind: "category", name: "Piles et files", colour: COL.sd, contents: [
        blk("a_callst", { fields: { NAME: "empiler" }, inputs: { A1: v("P") } }), blk("a_call", { fields: { NAME: "dépiler" }, inputs: { A1: v("P") } }), blk("a_call", { fields: { NAME: "sommet" }, inputs: { A1: v("P") } }),
        blk("a_callst", { fields: { NAME: "enfiler" }, inputs: { A1: v("F") } }), blk("a_call", { fields: { NAME: "défiler" }, inputs: { A1: v("F") } }), blk("a_call", { fields: { NAME: "tête" }, inputs: { A1: v("F") } }),
        blk("a_callb", { fields: { NAME: "estvide" }, inputs: { A1: v("P") } }), blk("a_call", { fields: { NAME: "longueur" }, inputs: { A1: v("ch") } }), blk("a_index", { inputs: { OBJ: v("ch"), I: v("i") } })] },
      { kind: "category", name: "Affichage", colour: COL.io, contents: [blk("a_write")] },
    ],
  };

  // ---------------- Zone de travail ----------------
  let ws = null, loaded = "", solution = null, observer = null;
  let listeners = [];

  // Une seule zone de blocs à la fois : changer de page la recrée dans le nouveau conteneur.
  function mount(div) {
    if (ws) { ws.dispose(); observer?.disconnect(); }
    listeners = [];
    ws = Blockly.inject(div, { toolbox: TOOLBOX, renderer: "zelos", trashcan: true, sounds: false, zoom: { controls: true, wheel: true, startScale: 0.7 }, move: { scrollbars: true, drag: true, wheel: false } });
    ws.addChangeListener((e) => { if (!e.isUiEvent) listeners.forEach((f) => f()); });
    observer = new ResizeObserver(() => Blockly.svgResize(ws));
    observer.observe(div);
  }
  function fit() {
    requestAnimationFrame(() => { Blockly.svgResize(ws); ws.zoomToFit(); if (ws.scale > 0.75) ws.setScale(0.75); ws.scrollCenter(); });
  }
  function load(code) {
    const states = toStates(code);
    ws.clear();
    solution = null;
    ws.getToolbox()?.setVisible(true);
    states.forEach((s) => Blockly.serialization.blocks.append(s, ws));
    ws.cleanUp();
    fit();
    loaded = generate(ws);
  }
  // Casse-tête : les instructions de la correction, détachées et mélangées (on garde les en-têtes de fonctions).
  function puzzle(code) {
    load(code);
    solution = generate(ws);
    const pieces = ws.getAllBlocks(true).filter((b) => b.previousConnection);
    pieces.reverse().forEach((b) => b.unplug(true));
    ws.getAllBlocks(false).forEach((b) => b.setDeletable(false));
    const tops = ws.getTopBlocks(false).filter((b) => b.previousConnection).sort(() => Math.random() - 0.5);
    const heads = ws.getTopBlocks(false).filter((b) => !b.previousConnection);
    const right = Math.max(...heads.map((h) => h.getRelativeToSurfaceXY().x + h.getHeightWidth().width)) + 60;
    let y = 0;
    tops.forEach((b) => { b.moveTo(new Blockly.utils.Coordinate(right, y)); y += b.getHeightWidth().height + 18; });
    ws.getToolbox()?.setVisible(false);
    fit();
    loaded = generate(ws);
  }

  root.Blocs = {
    mount, load, puzzle, fit,
    code: () => generate(ws),
    lineMap: () => lineMap(ws),
    loose: () => loose(ws),
    dirty: () => generate(ws) !== loaded,
    isPuzzle: () => solution !== null,
    solved: () => solution !== null && loose(ws) === 0 && generate(ws) === solution,
    translatable: (code) => { try { toStates(code); return ""; } catch (e) { return e.message; } },
    highlight: (id) => { if (!ws) return; ws.highlightBlock(null); if (id && ws.getBlockById(id)) ws.highlightBlock(id); },
    onChange: (f) => listeners.push(f),
    resize: () => ws && Blockly.svgResize(ws),
  };
})(window);
