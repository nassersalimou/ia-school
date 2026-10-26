// Exécute le code de l'élève dans un worker : une boucle infinie ne bloque pas la page (app.js coupe au bout de 10 s).
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.26.4/full/";
let py = null;

const send = (kind, text = "") => self.postMessage({ kind, text });

// Retire les lignes internes de Pyodide pour ne garder que le traceback du code de l'élève.
function cleanTraceback(msg) {
  const lines = msg.split("\n");
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    if (/^ {2}File "\/lib\//.test(lines[i])) {
      while (i + 1 < lines.length && /^ {4}/.test(lines[i + 1])) i++;
      continue;
    }
    kept.push(lines[i].replace(/File "<(?:exec|eleve)>", line (\d+)(?:, in (\S+))?/, (_, n, f) => `Ligne ${n}` + (!f || f === "<module>" ? "" : ` (fonction ${f})`)));
  }
  const text = kept.join("\n").trim();
  const tip = explain(text);
  return text + "\n" + (tip ? `💡 ${tip}\n` : "");
}

// Explication en français des erreurs Python les plus fréquentes chez un débutant.
const TIPS = [
  [/expected ':'/, "Il manque les deux-points « : » à la fin de la ligne (après for, while, if, else, def)."],
  [/IndentationError: expected an indented block/, "La ligne après « : » doit être décalée vers la droite (4 espaces ou Tab)."],
  [/IndentationError: unexpected indent/, "Cette ligne est décalée alors qu'elle ne devrait pas l'être : enlève les espaces au début."],
  [/IndentationError|TabError/, "Problème de décalage : les lignes d'un même bloc doivent commencer exactement au même niveau."],
  [/NameError: name '(\w+)' is not defined/, (m) => `Python ne connaît pas « ${m[1]} » : faute de frappe, variable pas encore créée, ou guillemets oubliés autour d'un texte ?`],
  [/unterminated string literal|EOL while scanning/, "Un texte n'est pas refermé : il manque un guillemet."],
  [/'\(' was never closed|unexpected EOF/, "Une parenthèse ouverte n'est jamais refermée."],
  [/unmatched '\)'/, "Il y a une parenthèse fermante en trop."],
  [/Maybe you meant '==' or ':='/, "Pour comparer, on écrit « == » (deux signes égal) ; « = » sert à ranger une valeur."],
  [/can only concatenate str/, "Tu additionnes un texte et un nombre. Si le texte vient de input(), convertis-le : int(input()) ; si tu veux coller un nombre dans un texte, écris str(nombre)."],
  [/unsupported operand type\(s\).*'str'/, "Tu calcules avec un texte : input() donne toujours du texte, convertis-le avec int(…) ou float(…)."],
  [/invalid literal for int\(\)/, "int(…) a reçu quelque chose qui n'est pas un nombre entier."],
  [/IndexError/, "Tu demandes une case qui n'existe pas : les indices vont de 0 à len(liste) - 1."],
  [/ZeroDivisionError/, "Division par zéro."],
  [/KeyError/, "Cette clé n'existe pas dans le dictionnaire."],
  [/RecursionError/, "La fonction s'appelle elle-même sans jamais s'arrêter : vérifie le cas d'arrêt."],
  [/invalid syntax/, "Python ne comprend pas cette ligne : vérifie les deux-points, les parenthèses et les guillemets."],
];
function explain(text) {
  for (const [re, tip] of TIPS) {
    const m = re.exec(text);
    if (m) return typeof tip === "function" ? tip(m) : tip;
  }
  return "";
}

// Exécution enregistrée (pas à pas rejoué ensuite par app.js) : avant chaque ligne, on note son numéro,
// la longueur de la sortie et la valeur des variables. Au-delà de MAX étapes on arrête d'enregistrer, le programme continue.
const TRACER = String.raw`
import sys, json, traceback, builtins

_MAX = 1500
_steps = []
_truncated = False

class _Out:
    def __init__(s, w): s.w, s.buf = w, ""
    def write(s, t): s.buf += t; return s.w.write(t)
    def flush(s): return s.w.flush()
    def __getattr__(s, k): return getattr(s.w, k)

def _snap(d):
    out = {}
    for k, v in list(d.items()):
        if k.startswith("_") or callable(v) or type(v).__name__ == "module":
            continue
        r = repr(v)
        out[k] = [r if len(r) <= 80 else r[:77] + "...", type(v).__name__]
    return out

def _tr(frame, event, arg):
    global _truncated
    if frame.f_code.co_filename != "<eleve>":
        return None
    if event == "line":
        if len(_steps) >= _MAX:
            _truncated = True
            sys.settrace(None)
            return None
        local = None if frame.f_globals is frame.f_locals else [frame.f_code.co_name, _snap(frame.f_locals)]
        _steps.append([frame.f_lineno, len(sys.stdout.buf), _snap(frame.f_globals), local])
    return _tr

def _run(src):
    global _steps, _truncated
    _steps, _truncated = [], False
    g = {"__name__": "__main__"}
    out = _Out(sys.stdout)
    sys.stdout = out
    def _input(prompt=""):
        v = builtins.input(prompt)
        out.buf += v + "\n"
        return v
    g["input"] = _input
    try:
        code = compile(src, "<eleve>", "exec")
        sys.settrace(_tr)
        try:
            exec(code, g)
        finally:
            sys.settrace(None)
        _steps.append([None, len(out.buf), _snap(g), None])
    except BaseException as e:
        lines = src.split("\n")
        frames = [f for f in traceback.extract_tb(e.__traceback__) if f.filename == "<eleve>"]
        msg = "Traceback (most recent call last):\n" if frames else ""
        for f in frames:
            msg += f"  Ligne {f.lineno}" + ("" if f.name == "<module>" else f" (fonction {f.name})") + "\n"
            if 0 < f.lineno <= len(lines):
                msg += "    " + lines[f.lineno - 1].strip() + "\n"
        msg += "".join(traceback.format_exception_only(type(e), e)).replace('File "<eleve>", line', "Ligne")
        sys.stderr.write(msg)
        if _steps:
            _steps.append([_steps[-1][0], len(out.buf), _steps[-1][2], _steps[-1][3], type(e).__name__ + ": " + str(e)])
    finally:
        sys.stdout = out.w
    return json.dumps({"steps": _steps, "stdout": out.buf, "truncated": _truncated})
`;

async function runPython(code, nextInput) {
  if (!py) {
    send("info", "Chargement de Python (la première fois prend quelques secondes)…\n");
    importScripts(PYODIDE + "pyodide.js");
    py = await loadPyodide({ indexURL: PYODIDE });
    await py.runPythonAsync(TRACER);
  }
  // Écriture brute (non bufferisée) pour que la question d'un input() s'affiche avant la valeur saisie.
  const raw = (kind) => { const dec = new TextDecoder(); return { write: (buf) => { send(kind, dec.decode(buf, { stream: true })); return buf.length; } }; };
  py.setStdout(raw("out"));
  // Erreurs écrites par le traceur Python : on les garde pour ajouter l'explication en français à la fin.
  let errText = "";
  const errOut = raw("err");
  py.setStderr({ write: (buf) => { errText += new TextDecoder().decode(buf); return errOut.write(buf); } });
  py.setStdin({ stdin: () => { const v = nextInput(); if (v !== undefined) send("in", v + "\n"); return v; }, isatty: false });
  send("start");
  try {
    send("trace", py.globals.get("_run")(code));
    const tip = errText && explain(errText);
    if (tip) send("err", `💡 ${tip}\n`);
  } catch (e) {
    send("err", cleanTraceback(String(e.message || e)));
  }
}

async function runJs(code, nextInput) {
  const show = (v) => (typeof v === "string" ? v : JSON.stringify(v));
  const log = (kind) => (...a) => send(kind, a.map(show).join(" ") + "\n");
  const console = { log: log("out"), info: log("out"), warn: log("err"), error: log("err") };
  const prompt = () => nextInput() ?? null;
  send("start");
  try {
    await new Function("console", "prompt", `"use strict"; return (async () => {\n${code}\n})();`)(console, prompt);
  } catch (e) {
    const line = /<anonymous>:(\d+)/.exec(e.stack || "");
    send("err", `${e.name}: ${e.message}${line ? ` (ligne ${line[1] - 3})` : ""}\n`);
  }
}

self.onmessage = async ({ data: { lang, code, stdin } }) => {
  const inputs = stdin ? stdin.split("\n") : [];
  let i = 0;
  const nextInput = () => (i < inputs.length ? inputs[i++] : undefined);
  try {
    await (lang === "javascript" ? runJs : runPython)(code, nextInput);
  } catch (e) {
    send("err", `Erreur de l'exécuteur : ${e.message || e}\n`);
  }
  send("done");
};
