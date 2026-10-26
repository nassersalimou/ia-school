const $ = (id) => document.getElementById(id);
let history = [];
let profile = null;
let startedAt = Date.now();
let tick = null;

function startTimer() {
  clearInterval(tick);
  const total = Number($("minutes").value) || 0;
  $("timer").hidden = !total;
  if (!total) return;
  const render = () => {
    const left = Math.max(0, total * 60 - (Date.now() - startedAt) / 1000);
    $("timer").textContent = `⏱ ${Math.floor(left / 60)}:${String(Math.floor(left % 60)).padStart(2, "0")} restant`;
  };
  render();
  tick = setInterval(render, 1000);
}

const headers = () => ({ "Content-Type": "application/json", "X-Access-Code": $("code").value });
const pkey = () => `profile:${$("subject").value.trim().toLowerCase()}:${$("theme").value.trim().toLowerCase()}:${$("level").value}`;

try { $("code").value = localStorage.getItem("code") || ""; } catch (e) {}

function showProfile() {
  const p = profile;
  $("prof").innerHTML = "";
  if (!p) return;
  const chip = (t, c = "") => { const s = document.createElement("span"); s.className = `chip ${c}`; s.textContent = t; $("prof").appendChild(s); };
  chip(p.calibrated ? `Difficulté des exercices : ${p.difficulty}/5` : "On cerne ton niveau…");
  (p.gaps || []).forEach((g) => chip(g.skill, g.status));
  // Plan du cours : notions acquises, en cours (réussites / 3), à venir.
  $("plan").innerHTML = "";
  (p.plan || []).forEach((n, i) => {
    const s = document.createElement("li");
    s.className = n.status;
    s.textContent = n.status === "current" ? `${n.name} · ${n.successes}/3` : n.name;
    s.title = (p.plan_details || [])[i] || "";
    $("plan").appendChild(s);
  });
}

// Blocs ```code``` et `code` en ligne, construits en DOM (pas d'innerHTML) ; KaTeX ignore pre/code.
function fill(d, text) {
  text.split(/```[\w-]*\n?([\s\S]*?)```/).forEach((part, i) => {
    if (i % 2) {
      const pre = document.createElement("pre");
      pre.appendChild(document.createElement("code")).textContent = part.replace(/\n$/, "");
      d.appendChild(pre);
      return;
    }
    part.split(/`([^`\n]+)`/).forEach((t, j) => {
      if (j % 2) { d.appendChild(document.createElement("code")).textContent = t; return; }
      // **gras** et *italique* du tuteur ; les titres « ### » perdent leurs dièses.
      t.split(/(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*)/).forEach((u) => {
        if (/^\*\*.+\*\*$/.test(u)) d.appendChild(document.createElement("strong")).textContent = u.slice(2, -2);
        else if (/^\*.+\*$/.test(u)) d.appendChild(document.createElement("em")).textContent = u.slice(1, -1);
        else if (u) d.appendChild(document.createTextNode(u.replace(/^#{1,4} /gm, "")));
      });
    });
  });
}

function add(role, text, cls = "") {
  const d = document.createElement("div");
  d.className = `msg ${role} ${cls}`;
  fill(d, text);
  $("log").appendChild(d);
  if (window.renderMathInElement && !cls) {
    renderMathInElement(d, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "$", right: "$", display: false }] });
  }
  d.scrollIntoView({ block: "end" });
  return d;
}

// --- Journal d'utilisation (usage.js) : une entrée par matière + thème travaillés dans la session.
const seance = () => {
  const d = Usage.data;
  d.seances = d.seances || {};
  const k = pkey();
  return (d.seances[k] = d.seances[k] || { matiere: $("subject").value.trim(), theme: $("theme").value.trim(), niveau: $("level").value, messages: 0, codes: 0, rapides: {} });
};
const QUICK_LABEL = { up: "Trop facile", skip: "Passer", probleme: "Problème", dictee: "Dictée", discu: "Discussion", fin: "Finir la séance" };
function summarize(d) {
  const list = Object.values(d.seances || {});
  const en = Object.values(d.anglais || {});
  const icon = { mastered: "✅", current: "▶", todo: "○" };
  const titles = [...list.map((x) => `${x.matiere} · ${x.theme}`), ...en.map((x) => `Anglais · ${x.mode}`)];
  return {
    titre: titles.length ? titles.join(" ; ") : "Aucune séance commencée",
    sections: [...en.map((x) => ({
      titre: `Anglais · ${x.mode} · sujet : ${x.sujet}`,
      points: [
        `${x.echanges} échange${x.echanges > 1 ? "s" : ""}, niveau estimé ${x.niveau || "?"}`,
        Object.keys(x.erreurs || {}).length ? `Erreurs : ${Object.entries(x.erreurs).map(([k, n]) => `${k} ×${n}`).join(", ")}` : "Aucune erreur relevée",
        x.bilan ? `Bilan : ${x.bilan}` : "",
      ].filter(Boolean),
    })), ...list.map((x) => ({
      titre: `${x.matiere} · ${x.theme} (${x.niveau})`,
      points: [
        `${x.messages} message${x.messages > 1 ? "s" : ""} au tuteur, dont ${x.codes} code${x.codes > 1 ? "s" : ""} envoyé${x.codes > 1 ? "s" : ""}`,
        x.difficulte ? `Difficulté atteinte : ${x.difficulte}/5` : "",
        x.plan && x.plan.length ? `Notions : ${x.plan.map((n) => `${icon[n.status] || ""} ${n.name}${n.status === "current" ? ` (${n.successes}/3)` : ""}`).join(" · ")}` : "",
        x.lacunes && x.lacunes.length ? `Lacunes encore ouvertes : ${x.lacunes.join(", ")}` : "",
        Object.keys(x.rapides).length ? `Boutons utilisés : ${Object.entries(x.rapides).map(([q, n]) => `${QUICK_LABEL[q] || q} ×${n}`).join(", ")}` : "",
      ].filter(Boolean),
    }))],
  };
}
Usage.start("ia_school", summarize);

async function send(text) {
  if (text) {
    history.push({ role: "user", content: text }); add("user", text);
    const se = seance(); se.messages++; if (/\[(CODE|CASSE)/.test(text)) se.codes++; Usage.save();
  }
  const first = !history.some((m) => m.role === "model");
  const wait = add("model", first ? "⏳ Le tuteur lit ton sujet et prépare le plan des notions… (environ 20 secondes)" : "⏳ Le tuteur réfléchit…", "wait");
  try {
    const r = await fetch("/api/chat", {
      method: "POST", headers: headers(),
      body: JSON.stringify({ subject: $("subject").value.trim(), theme: $("theme").value.trim(), level: $("level").value, messages: history, profile, course: $("course").value, minutes: Number($("minutes").value) || null, elapsed: (Date.now() - startedAt) / 60000 }),
    });
    const j = await r.json();
    wait.remove();
    if (!r.ok) {
      if (r.status === 401) { back(); $("err").textContent = "Code d'accès invalide."; return; }
      add("model", j.detail || "Erreur"); return;
    }
    // Le code proposé reste dans l'historique pour que le tuteur sache ce qu'il a donné.
    const modeNote = j.mode ? `\n[MODE ${j.mode}${j.blocks?.length ? ` · palette : ${j.blocks.join(", ")}` : ""}]` : "";
    const fb = j.feedback && j.feedback.question && j.feedback.options?.length ? j.feedback : null;
    const fbNote = fb ? `\n[PANNEAU DE RETOUR] ${fb.question} (${fb.options.join(" / ")})` : "";
    history.push({ role: "model", content: (j.code ? `${j.reply}\n[CODE PROPOSÉ POUR L'ÉDITEUR]\n\`\`\`\n${j.code}\n\`\`\`` : j.reply) + modeNote + fbNote });
    const done = (p) => (p?.plan || []).filter((n) => n.status === "mastered").map((n) => n.name);
    const before = done(profile);
    const fresh = done(j.profile).filter((n) => !before.includes(n));
    profile = j.profile;
    const se = seance();
    se.plan = (profile.plan || []).map((n) => ({ name: n.name, status: n.status, successes: n.successes }));
    se.lacunes = (profile.gaps || []).filter((g) => g.status === "open").map((g) => g.skill);
    se.difficulte = profile.difficulty;
    Usage.save();
    if (fresh.length) add("model", `🎉 Notion acquise : ${fresh.join(", ")}`, "event");
    try { localStorage.setItem(pkey(), JSON.stringify(profile)); } catch (e) {}
    showProfile();
    const d = add("model", j.reply);
    if (fb) feedbackPanel(d, fb);
    if (isCode()) applyTutor(j, d);
  } catch (e) { wait.remove(); add("model", "Erreur réseau."); }
}

// Question de retour du tuteur : réponses à cliquer (une ou plusieurs), envoyées en « [RETOUR] ».
function feedbackPanel(msg, fb) {
  const box = document.createElement("div");
  box.className = "feedback";
  const q = document.createElement("b");
  q.textContent = `💬 ${fb.question}`;
  const opts = document.createElement("div");
  opts.className = "fb-opts";
  const picked = new Set();
  const ok = document.createElement("button");
  ok.type = "button"; ok.className = "fb-send"; ok.textContent = "Envoyer ma réponse"; ok.disabled = true;
  const done = (answers) => {
    box.querySelectorAll("button").forEach((b) => { b.disabled = true; });
    box.classList.add("answered");
    send(`[RETOUR] ${fb.question} → ${answers.join(" ; ")}`);
  };
  fb.options.forEach((o) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "fb-opt"; b.textContent = o;
    b.onclick = () => {
      if (!fb.multiple) { b.classList.add("on"); done([o]); return; }
      picked.has(o) ? picked.delete(o) : picked.add(o);
      b.classList.toggle("on", picked.has(o));
      ok.disabled = !picked.size;
    };
    opts.appendChild(b);
  });
  ok.onclick = () => done([...picked]);
  const hint = document.createElement("small");
  hint.textContent = fb.multiple ? "Plusieurs réponses possibles. Tu peux aussi répondre en écrivant." : "Tu peux aussi répondre en écrivant.";
  box.append(q, opts, ...(fb.multiple ? [ok] : []), hint);
  msg.appendChild(box);
  if (window.renderMathInElement) renderMathInElement(box, { delimiters: [{ left: "$", right: "$", display: false }] });
  box.scrollIntoView({ block: "end" });
}

const toBase64 = (buf) => {
  let s = ""; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
  return btoa(s);
};

// Réduit les photos (max 1800px, JPEG) pour un envoi rapide.
async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  const blob = await new Promise((r) => c.toBlob(r, "image/jpeg", 0.85));
  return { mime: "image/jpeg", data: toBase64(await blob.arrayBuffer()) };
}

$("files").onchange = async () => {
  const list = [...$("files").files];
  if (!list.length) return;
  $("err").textContent = ""; $("start").disabled = true;
  $("fstatus").textContent = `Lecture de ${list.length} fichier(s)…`;
  try {
    const files = [];
    for (const f of list) {
      if (f.type === "application/pdf") {
        if (f.size > 12e6) throw new Error(`${f.name} dépasse 12 Mo`);
        files.push({ mime: f.type, data: toBase64(await f.arrayBuffer()) });
      } else if (f.type.startsWith("image/")) {
        files.push(await shrink(f));
      }
    }
    const r = await fetch("/api/extract", { method: "POST", headers: headers(), body: JSON.stringify({ files }) });
    const j = await r.json();
    if (!r.ok) throw new Error(r.status === 401 ? "Code d'accès invalide." : j.detail || "Erreur");
    $("course").value = ($("course").value ? $("course").value + "\n\n" : "") + j.text;
    $("fstatus").textContent = `✅ ${list.length} fichier(s) lu(s) : le cours est ajouté ci-dessous.`;
    $("files").value = "";
  } catch (e) {
    $("fstatus").textContent = "";
    $("err").textContent = "Lecture impossible : " + e.message;
  }
  $("start").disabled = false;
};

function back() { $("chat").hidden = true; $("english").hidden = true; window.English && English.stop(); $("setup").hidden = false; $("reset").hidden = true; document.body.classList.remove("coding"); }

// --- Éditeur de code : même détection que is_coding() côté serveur (app/subjects.py).
const isCode = () => /\b(nsi|snt)\b|num[ée]rique|informatique|python|programm|javascript/i.test($("subject").value + " " + $("theme").value);
let worker = null, killTimer = null, ranCode = null, loadedCode = "", runDone = null, running = null;
// Modes d'exercice : texte (clavier), blocs (libre), puzzle (blocs imposés mélangés), papier (écrit à la main, photographié).
let mode = "texte", paperCode = "";
const V = "27"; // version des fichiers statiques (cache)

const script = (src) => new Promise((ok, ko) => {
  const s = document.createElement("script");
  s.src = src; s.onload = ok; s.onerror = () => ko(new Error("chargement impossible (connexion ?)"));
  document.head.appendChild(s);
});
// Blockly (≈ 1 Mo) n'est chargé que la première fois qu'on passe en blocs.
let blocklyReady = null;
function loadBlockly() {
  blocklyReady ??= (async () => {
    await script("https://cdn.jsdelivr.net/npm/blockly@11.2.1/blockly_compressed.js");
    await script("https://cdn.jsdelivr.net/npm/blockly@11.2.1/msg/fr.js");
    await script(`blocks.js?v=${V}`);
    $("blocks-area").hidden = false;
    Blocs.mount($("blockly"));
    Blocs.onChange(updateBlocksInfo);
  })().catch((e) => { blocklyReady = null; throw e; });
  return blocklyReady;
}

function updateBlocksInfo() {
  $("py-preview").querySelector("pre").textContent = Blocs.code();
  const loose = Blocs.loose();
  const notes = [];
  if (mode === "puzzle") notes.push("🧩 Casse-tête : emboîte les blocs sous ▶ Programme, dans le bon ordre. Les blocs donnés sont imposés (impossible de les supprimer).");
  if (loose) notes.push(`⚠️ ${loose} bloc(s) ne sont reliés à rien : ils ne s'exécuteront pas.`);
  $("blocks-note").textContent = notes.join(" ");
}

// Mode imposé par l'exercice en cours (choisi par le tuteur) : l'élève ne peut pas passer à l'autre.
let imposed = "";
const MODE_NAME = { texte: "en code", blocs: "en blocs", puzzle: "en casse-tête", papier: "sur papier" };
function lockMode(m) {
  imposed = m;
  document.querySelectorAll(".modes button").forEach((b) => {
    const ok = !m || b.dataset.mode === (m === "puzzle" ? "blocs" : m);
    b.disabled = !ok;
    b.title = ok ? "" : `Cet exercice se fait ${MODE_NAME[m]}`;
  });
  setMode(mode);
}

function setMode(m) {
  mode = m;
  hideTrace();
  const blocks = m === "blocs" || m === "puzzle";
  $("code-editor").hidden = m !== "texte";
  $("blocks-area").hidden = !blocks;
  $("paper").hidden = m !== "papier";
  $("lang").hidden = m !== "texte";
  if (m !== "texte") $("lang").value = "python";
  document.querySelectorAll(".modes button").forEach((b) => b.classList.toggle("on", b.dataset.mode === (blocks ? "blocs" : m)));
  $("mode-tag").hidden = !(m === "puzzle" || m === "papier" || imposed);
  $("mode-tag").textContent = m === "puzzle" ? "🧩 Casse-tête" : m === "papier" ? "✍️ Sur papier" : `🔒 Exercice ${MODE_NAME[imposed] || ""}`;
  if (blocks && window.Blocs) { Blocs.resize(); updateBlocksInfo(); }
}

const currentCode = () => (mode === "texte" ? $("code-editor").value : mode === "papier" ? paperCode : window.Blocs ? Blocs.code() : "");

function out(text, kind = "out") {
  const s = document.createElement("span");
  if (kind !== "out") s.className = kind;
  s.textContent = text;
  $("output").appendChild(s);
  $("output").scrollTop = $("output").scrollHeight;
}

function stopRun(msg) {
  clearTimeout(killTimer);
  if (msg) { worker?.terminate(); worker = null; out(msg, "err"); }
  $("run").disabled = false; $("run").textContent = "▶ Exécuter";
  if (mode === "puzzle" && Blocs.isPuzzle()) {
    out(Blocs.solved() ? "✅ Casse-tête résolu ! Envoie-le au tuteur.\n" : "🧩 Ce n'est pas encore l'ordre attendu : regarde la sortie et réessaie.\n", "info");
  }
  if (!msg) showTrace();
  runDone?.(); runDone = null;
}

// --- Pas à pas : runner.js enregistre l'exécution (ligne, sortie, variables à chaque étape), on la rejoue ici.
let trace = null, step = 0, fullOutput = [];
const TYPE = { str: "\"T\"", int: "12", float: "1,5", bool: "✓✗", list: "[ ]", dict: "{ }", tuple: "( )" };

function hideTrace() {
  trace = null;
  $("debug").hidden = true;
  window.Blocs?.highlight(null);
}

function showTrace() {
  if (!trace?.steps?.length) { hideTrace(); return; }
  fullOutput = [...$("output").childNodes].map((n) => n.cloneNode(true));
  step = trace.steps.length - 1;
  $("debug").hidden = false;
  renderStep();
}

function varRows(tbody, vars, before, title) {
  const names = Object.keys(vars);
  if (!names.length) return;
  if (title) { const tr = tbody.insertRow(); tr.className = "frame"; const td = tr.insertCell(); td.colSpan = 2; td.textContent = title; }
  for (const k of names) {
    const [value, type] = vars[k];
    const tr = tbody.insertRow();
    if (before && before[k]?.[0] !== value) tr.className = "chg";
    tr.insertCell().textContent = k;
    const td = tr.insertCell();
    const ty = document.createElement("span");
    ty.className = "ty"; ty.textContent = TYPE[type] || type; ty.title = type;
    td.append(ty, value);
  }
}

function renderStep() {
  const [line, outLen, glob, local, err] = trace.steps[step];
  const prev = trace.steps[step - 1];
  const last = step === trace.steps.length - 1;
  $("dbg-pos").textContent = `Étape ${step + 1} / ${trace.steps.length}${trace.truncated ? " (tronqué)" : ""}`;
  const src = trace.code.split("\n");
  $("dbg-line").className = err ? "err" : "";
  $("dbg-line").textContent = err ? `💥 Ligne ${line} : ${err}`
    : line ? `➜ Ligne ${line}, la prochaine à s'exécuter :  ${src[line - 1]?.trim() ?? ""}`
    : "✔ Programme terminé : valeurs finales des variables.";
  if (trace.map) Blocs.highlight(line ? trace.map[line - 1] : null);
  const tbody = $("dbg-vars").tBodies[0];
  tbody.innerHTML = "";
  varRows(tbody, glob, prev?.[2], local ? "Programme" : "");
  if (local) varRows(tbody, local[1], prev?.[3]?.[0] === local[0] ? prev[3][1] : null, `Dans ${local[0]}()`);
  if (!tbody.rows.length) { const td = tbody.insertRow().insertCell(); td.colSpan = 2; td.textContent = "(aucune variable pour l'instant)"; }
  // La sortie montrée est celle produite jusqu'à cette étape.
  if (last) $("output").replaceChildren(...fullOutput.map((n) => n.cloneNode(true)));
  else {
    $("output").textContent = trace.stdout.slice(0, outLen);
    out("— sortie produite jusqu'à cette étape —\n", "info");
  }
}

document.querySelectorAll("#debug [data-step]").forEach((b) => {
  b.onclick = () => {
    if (!trace) return;
    const n = trace.steps.length - 1;
    step = { first: 0, prev: Math.max(0, step - 1), next: Math.min(n, step + 1), last: n }[b.dataset.step];
    renderStep();
  };
});

function runCode() {
  if ($("run").disabled) return running || Promise.resolve();
  hideTrace();
  $("output").textContent = "";
  ranCode = currentCode();
  if (!ranCode.trim()) { out(mode === "papier" ? "Prends d'abord ta feuille en photo.\n" : "Rien à exécuter.\n", "info"); return Promise.resolve(); }
  if ((mode === "blocs" || mode === "puzzle") && Blocs.loose()) out(`⚠️ ${Blocs.loose()} bloc(s) reliés à rien sont ignorés.\n`, "info");
  $("run").disabled = true; $("run").textContent = "⏳ Exécution…";
  worker ??= new Worker(`runner.js?v=${V}`);
  worker.onmessage = ({ data }) => {
    if (data.kind === "start") killTimer = setTimeout(() => stopRun("⛔ Arrêt : le programme tourne depuis plus de 10 s (boucle infinie ?)\n"), 10000);
    else if (data.kind === "done") stopRun();
    else if (data.kind === "trace") {
      trace = JSON.parse(data.text);
      trace.code = ranCode;
      trace.map = mode === "blocs" || mode === "puzzle" ? Blocs.lineMap() : null;
    } else out(data.text, data.kind);
  };
  worker.onerror = (e) => stopRun(`Erreur de l'exécuteur : ${e.message}\n`);
  worker.postMessage({ lang: mode === "texte" ? $("lang").value : "python", code: ranCode, stdin: $("stdin").value });
  running = new Promise((r) => { runDone = r; }).finally(() => { running = null; });
  return running;
}

function loadCode(code) {
  hideTrace();
  loadedCode = $("code-editor").value = code.replace(/\n$/, "");
  $("output").textContent = "";
  ranCode = null;
}

// Charge le code du tuteur, sauf si l'élève a modifié l'éditeur : on ne lui écrase pas son travail, on propose un bouton.
function offerCode(msg, code) {
  const ed = $("code-editor").value;
  const norm = (c) => c.replace(/\s+$/gm, "").trim();
  if (norm(ed) === norm(code)) return;
  if (!ed.trim() || ed === loadedCode) { loadCode(code); return; }
  const b = document.createElement("button");
  b.type = "button"; b.className = "load-code"; b.textContent = "📥 Charger ce code dans l'éditeur (remplace le tien)";
  b.onclick = () => { loadCode(code); b.remove(); };
  msg.appendChild(b);
}

// Blocs du tuteur : même règle que pour le texte, on n'écrase pas le travail de l'élève sans lui demander.
function offerBlocks(msg, code) {
  if (!Blocs.dirty()) { Blocs.load(code); return; }
  const b = document.createElement("button");
  b.type = "button"; b.className = "load-code"; b.textContent = "📥 Charger les blocs du tuteur (remplace les tiens)";
  b.onclick = () => { setMode("blocs"); Blocs.load(code); b.remove(); };
  msg.appendChild(b);
}

// Applique le mode et le code choisis par le tuteur pour l'exercice.
async function applyTutor(j, msg) {
  const m = ["texte", "blocs", "puzzle", "papier"].includes(j.mode) ? j.mode : "";
  const code = j.code || "";
  try { await applyMode(m, code, msg, j.blocks || []); } finally { if (m) lockMode(mode); }
}
async function applyMode(m, code, msg, palette) {
  try {
    if (m === "papier") {
      setMode("papier");
      paperCode = ""; $("paper-code").hidden = true; $("paper-status").textContent = ""; $("output").textContent = "";
      return;
    }
    if (m === "blocs" || m === "puzzle" || (!m && code && (mode === "blocs" || mode === "puzzle"))) {
      await loadBlockly();
      const err = Blocs.translatable(code);
      if (err) {
        // Code hors du sous-ensemble des blocs : on bascule en texte (jamais pour un casse-tête, ce serait donner la solution).
        setMode("texte");
        if (m === "puzzle") out("Ce casse-tête n'a pas pu être construit en blocs : demande au tuteur un autre exercice.\n", "err");
        else if (code) offerCode(msg, code);
        return;
      }
      if (m) Blocs.setToolbox(palette, m === "puzzle");
      if (m === "puzzle") { setMode("puzzle"); Blocs.puzzle(code); }
      else if (m === "blocs" && mode !== "blocs") { setMode("blocs"); Blocs.load(code); }
      else offerBlocks(msg, code);
      setMode(mode);
      $("output").textContent = ""; ranCode = null;
      return;
    }
    if (m === "texte" && mode !== "texte") { setMode("texte"); loadCode(code); return; }
    if (code) offerCode(msg, code);
  } catch (e) {
    out(`Mode ${m || mode} indisponible : ${e.message}\n`, "err");
    setMode("texte");
    if (code && m !== "puzzle") offerCode(msg, code);
  }
}

document.querySelectorAll(".modes button").forEach((b) => {
  b.onclick = async () => {
    const target = b.dataset.mode;
    if (b.disabled) return;
    if (target === mode || (target === "blocs" && mode === "puzzle")) return;
    try {
      if (target === "blocs") {
        const code = mode === "texte" ? $("code-editor").value : "";
        await loadBlockly();
        const err = Blocs.translatable(code);
        if (err) { out(`Ce code ne se traduit pas en blocs (${err}). Tu restes en mode code.\n`, "err"); return; }
        setMode("blocs"); Blocs.setToolbox([]); Blocs.load(code);
      } else {
        const code = mode === "blocs" || mode === "puzzle" ? Blocs.code().trim() : "";
        setMode("texte");
        if (code) loadCode(code);
      }
    } catch (e) { out(`Blocs indisponibles : ${e.message}\n`, "err"); }
  };
});

$("paper-file").onchange = async () => {
  const f = $("paper-file").files[0];
  if (!f) return;
  $("paper-status").textContent = "Lecture de ta feuille…"; $("paper-code").hidden = true; $("output").textContent = "";
  try {
    const r = await fetch("/api/extract", { method: "POST", headers: headers(), body: JSON.stringify({ files: [await shrink(f)], kind: "code" }) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.detail || "Erreur");
    paperCode = j.text.replace(/^```\w*\n?/, "").replace(/\n?```\s*$/, "").replace(/\s+$/, "");
    $("paper-code").textContent = paperCode; $("paper-code").hidden = false;
    $("paper-status").textContent = "Voici ce qui a été lu sur ta feuille (erreurs comprises). Il est exécuté ci-dessous : envoie-le ensuite au tuteur.";
    await runCode();
  } catch (e) { $("paper-status").textContent = "Lecture impossible : " + e.message; }
  $("paper-file").value = "";
};

$("run").onclick = runCode;
// Le code de l'éditeur et sa sortie, au format lu par le tuteur. Exécute d'abord si besoin.
let lastSentCode = null;
async function codeMessage() {
  const code = currentCode().trim();
  if (!code) return "";
  // Attend l'exécution en cours (Python met quelques secondes à charger la première fois) et exécute si besoin.
  if (running) await running;
  if (ranCode !== currentCode() && mode !== "papier") await runCode();
  const lang = mode === "texte" ? $("lang").value : "python";
  const res = [...$("output").children].filter((s) => !s.classList.contains("info")).map((s) => s.textContent).join("").trim();
  const sortie = ranCode !== currentCode() ? "(code pas encore exécuté dans cette version)" : res || "(aucune sortie)";
  const tag = {
    texte: `[CODE ${lang}]`,
    blocs: "[CODE python, construit en blocs]",
    puzzle: `[CASSE-TÊTE python${window.Blocs?.isPuzzle() ? (Blocs.solved() ? ", résolu : identique à la solution" : ", pas identique à la solution attendue") : ""}]`,
    papier: "[CODE MANUSCRIT python, transcrit depuis la photo de sa feuille]",
  }[mode];
  lastSentCode = currentCode();
  return `${tag}\n\`\`\`${lang}\n${code}\n\`\`\`\n[SORTIE]\n\`\`\`\n${sortie}\n\`\`\``;
}
$("submit-code").onclick = async () => {
  const m = await codeMessage();
  if (m) send(m);
};
// Un message tapé dans le chat emporte aussi le code s'il a changé : le tuteur voit toujours ce que l'élève a fait.
const codeChanged = () => isCode() && currentCode().trim() && currentCode() !== lastSentCode && !(mode === "texte" && currentCode() === loadedCode);
// Tab = 4 espaces, Entrée garde l'indentation (+4 après « : » ou « { »), Ctrl+Entrée exécute.
$("code-editor").onkeydown = (e) => {
  const ed = e.target;
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); runCode(); return; }
  if (e.key === "Tab" && !e.shiftKey) { e.preventDefault(); document.execCommand("insertText", false, "    "); return; }
  if (e.key === "Enter") {
    const line = ed.value.slice(0, ed.selectionStart).split("\n").pop();
    const indent = line.match(/^\s*/)[0] + (/[:{]\s*$/.test(line) ? "    " : "");
    e.preventDefault();
    document.execCommand("insertText", false, "\n" + indent);
  }
};

// Anglais : trois modes imposés (english.js) à la place du chat.
const isEnglish = () => /\b(anglais|english)\b/i.test($("subject").value);
const enMode = () => document.querySelector('input[name="en-mode"]:checked').value;
function syncSetup() {
  const en = isEnglish();
  $("en-options").hidden = !en;
  $("en-words-l").hidden = enMode() !== "ecrit";
  for (const id of ["theme", "files", "minutes"]) $(id).closest("label").hidden = en;
  $("course-l").hidden = en;
  $("fstatus").hidden = en;
}
$("subject").addEventListener("input", syncSetup);
document.querySelectorAll('input[name="en-mode"]').forEach((r) => r.addEventListener("change", syncSetup));
syncSetup();

$("start").onclick = () => {
  $("err").textContent = "";
  if (isEnglish()) {
    try { localStorage.setItem("code", $("code").value); } catch (e) {}
    $("setup").hidden = true; $("chat").hidden = true; $("english").hidden = false; $("reset").hidden = false;
    English.start({ mode: enMode(), topic: $("en-topic").value.trim(), words: Number($("en-words").value), school: $("level").value, headers });
    return;
  }
  if (!$("subject").value.trim() || !$("theme").value.trim()) { $("err").textContent = "Indique une matière et une thématique."; return; }
  try { localStorage.setItem("code", $("code").value); } catch (e) {}
  history = [];
  startedAt = Date.now();
  startTimer();
  $("q3").textContent = isLang() ? "✍️ Dictée" : "📝 Problème";
  try { profile = JSON.parse(localStorage.getItem(pkey())); } catch (e) { profile = null; }
  showProfile();
  $("log").innerHTML = "";
  $("setup").hidden = true; $("chat").hidden = false; $("reset").hidden = false;
  document.body.classList.toggle("coding", isCode());
  $("ide").hidden = !isCode();
  $("q-fin").hidden = !isCode();
  if (isCode()) {
    setMode("texte");
    $("lang").value = /javascript|\bjs\b/i.test($("subject").value + " " + $("theme").value) ? "javascript" : "python";
    loadCode("");
    lockMode("");
  }
  send("");
};
$("reset").onclick = back;
const QUICK = {
  up: "[TROP FACILE] Je maîtrise ça, passe au niveau supérieur avec un exercice nettement plus dur, sans QCM.",
  skip: "[PASSER] Je passe cette question, donne-m'en une autre.",
  probleme: "Donne-moi un vrai problème complet à résoudre (énoncé rédigé, plusieurs étapes), adapté à mon niveau ou un peu au-dessus, sans QCM. Corrige ma démarche étape par étape ensuite.",
  dictee: "Je voudrais une dictée : donne-moi un texte à écrire avec des pièges d'orthographe/de règles adaptés à mon niveau, puis corrige-moi et explique comment ne plus faire ces erreurs.",
  discu: "Discutons librement : pose-moi des questions ouvertes, repère mes erreurs et dis-moi comment ne plus les faire.",
  fin: "[FIN DE SÉANCE] Je veux terminer : donne-moi 1 ou 2 exercices à écrire à la main sur papier (mode papier), puis fais le bilan.",
};
const isLang = () => /fran|angl|espag|allem|italien|latin|lang|ortho|conjug|gramm|vocab|dict/i.test($("subject").value + " " + $("theme").value);
document.querySelectorAll("#quick button").forEach((b) => {
  b.onclick = () => {
    if (b.id === "q3") b.dataset.q = isLang() ? "dictee" : "probleme";
    seance().rapides[b.dataset.q] = (seance().rapides[b.dataset.q] || 0) + 1; Usage.save();
    if (b.dataset.q === "up" && profile) profile.difficulty = Math.min(5, (profile.difficulty || 2) + 1);
    send(QUICK[b.dataset.q]);
  };
});
$("form").onsubmit = async (e) => {
  e.preventDefault();
  const t = $("input").value.trim();
  if (!t) return;
  $("input").value = "";
  send(codeChanged() ? `${t}

${await codeMessage()}` : t);
};
