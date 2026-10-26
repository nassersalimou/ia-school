/* Anglais : trois modes imposés, choisis au départ (expression écrite, conversation orale, compréhension orale).
   Le serveur (/api/english) renvoie la réplique, les corrections du dernier message, le niveau CECRL estimé et,
   en fin de séance, un bilan. Voix : voix naturelles générées par le serveur (/api/tts), micro par la reconnaissance vocale du navigateur. */
(function (root) {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const TITLES = { ecrit: "✍️ Expression écrite", oral: "🗣️ Conversation orale", ecoute: "🎧 Compréhension orale" };

  let S = null; // séance : { mode, topic, words, school, headers, cefr, history, busy, passage, plays, errors, startedAt }

  // ---------------- Échanges avec le serveur ----------------
  async function turn(userText, opts = {}) {
    if (S.busy) return;
    S.busy = true; setBusy(true);
    if (userText) S.history.push({ role: "user", content: userText });
    const wait = add("tutor wait", opts.waitText || "⏳ …");
    try {
      const r = await fetch("/api/english", {
        method: "POST", headers: S.headers(),
        body: JSON.stringify({ mode: S.mode, level: S.school, cefr: S.cefr, topic: S.topic, words: S.words, messages: S.history }),
      });
      const j = await r.json();
      wait.remove();
      if (!r.ok) { add("tutor", r.status === 401 ? "Code d'accès invalide." : j.detail || "Erreur"); if (userText) S.history.pop(); return null; }
      S.history.push({ role: "model", content: j.reply + (j.passage ? `\n[TEXTE ÉCOUTÉ PAR L'ÉLÈVE]\n${j.passage}` : "") });
      if (j.level) { S.cefr = j.level; store.set("en:cefr", j.level); $("en-level").textContent = `Niveau estimé : ${j.level}`; }
      log();
      return j;
    } catch (e) {
      wait.remove(); add("tutor", "Erreur réseau."); if (userText) S.history.pop(); return null;
    } finally { S.busy = false; setBusy(false); }
  }
  function setBusy(on) {
    document.querySelectorAll("#english .en-panel button, #en-end").forEach((b) => { b.disabled = on; });
    if (!on) updateMic();
  }

  // ---------------- Affichage ----------------
  function add(cls, text) {
    const d = el("div", `en-msg ${cls}`);
    d.textContent = text;
    $("en-log").appendChild(d);
    d.scrollIntoView({ block: "end" });
    return d;
  }
  // Message de l'élève, avec ses erreurs dessous (et surlignées dans le texte).
  function studentMsg(text, corrections) {
    const d = el("div", "en-msg me");
    d.appendChild(highlight(text, corrections));
    if (corrections.length) d.appendChild(correctionList(corrections));
    else d.appendChild(el("div", "en-ok", "✓ Aucune erreur relevée"));
    $("en-log").appendChild(d);
    return d;
  }
  function highlight(text, corrections) {
    const box = el("div", "en-text");
    const spans = [];
    const low = text.toLowerCase();
    for (const c of corrections) {
      const i = low.indexOf(c.original.toLowerCase());
      if (i >= 0 && !spans.some((s) => i < s.end && i + c.original.length > s.start)) spans.push({ start: i, end: i + c.original.length, c });
    }
    spans.sort((a, b) => a.start - b.start);
    let at = 0;
    for (const s of spans) {
      box.append(text.slice(at, s.start));
      const m = el("mark", "", text.slice(s.start, s.end));
      m.title = `${s.c.corrected} : ${s.c.explication}`;
      box.append(m);
      at = s.end;
    }
    box.append(text.slice(at));
    return box;
  }
  function correctionList(corrections) {
    const ul = el("ul", "en-corr");
    corrections.forEach((c) => {
      const li = el("li");
      li.append(el("del", "", c.original), " → ", el("ins", "", c.corrected), el("span", "en-why", ` ${c.explication}`), el("span", "en-cat", c.categorie));
      ul.appendChild(li);
    });
    return ul;
  }
  // Texte du professeur avec le **gras** et l'*italique* rendus, et les « * » de liste remplacés par des puces.
  function rich(text) {
    const box = el("div", "en-text");
    text.replace(/^\s*\*\s+/gm, "• ").split(/(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|`[^`\n]+`)/).forEach((u) => {
      if (/^`.+`$/.test(u)) box.appendChild(el("code", "", u.slice(1, -1)));
      else if (/^\*\*.+\*\*$/.test(u)) box.appendChild(el("strong", "", u.slice(2, -2)));
      else if (/^\*.+\*$/.test(u)) box.appendChild(el("em", "", u.slice(1, -1)));
      else if (u) box.append(u);
    });
    return box;
  }
  function tutorMsg(j, opts = {}) {
    const d = el("div", "en-msg tutor");
    if (j.score) d.appendChild(el("div", "en-score", `📝 ${j.score}`));
    const t = rich(j.reply);
    if (opts.hidden) t.classList.add("masked");
    d.appendChild(t);
    if (opts.speak) {
      const b = el("button", "en-replay", "🔊");
      b.type = "button"; b.title = "Réécouter";
      b.onclick = () => speak(j.reply);
      d.prepend(b);
    }
    $("en-log").appendChild(d);
    d.scrollIntoView({ block: "end" });
    return d;
  }
  function errorsOf(j) { (j.corrections || []).forEach((c) => { S.errors[c.categorie] = (S.errors[c.categorie] || 0) + 1; }); log(); }

  // ---------------- Voix ----------------
  // Voix naturelles générées par le serveur (Chirp 3 HD, /api/tts) ; la voix du navigateur ne sert qu'en secours.
  const synth = root.speechSynthesis;
  let VOICES = [];
  async function loadVoices() {
    if (VOICES.length) return;
    try { VOICES = (await (await fetch("/api/voices", { headers: S.headers() })).json()).voices || []; } catch (e) { VOICES = []; }
    const sel = $("en-voice");
    sel.innerHTML = "";
    VOICES.forEach((v) => { const o = el("option", "", v.label); o.value = v.name; sel.appendChild(o); });
    const keep = store.get("en:voice2", "");
    if (VOICES.some((v) => v.name === keep)) sel.value = keep;
    sel.hidden = !VOICES.length;
  }
  const myVoice = () => $("en-voice").value || (VOICES[0] && VOICES[0].name) || "";

  // Phrases regroupées par morceaux d'environ 220 caractères : le premier morceau arrive vite, la suite se prépare pendant la lecture.
  function chunks(text) {
    const out = [];
    for (const s of text.replace(/\s+/g, " ").match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) || []) {
      if (out.length && (out[out.length - 1] + s).length < 220) out[out.length - 1] += s; else out.push(s);
    }
    return out.map((t) => t.trim()).filter(Boolean);
  }
  const audioCache = new Map();
  function fetchAudio(text, voice) {
    const k = `${voice}|${text}`;
    if (!audioCache.has(k)) {
      audioCache.set(k, fetch("/api/tts", { method: "POST", headers: S.headers(), body: JSON.stringify({ text, voice }) })
        .then((r) => { if (!r.ok) throw new Error("voix indisponible"); return r.blob(); })
        .then((b) => URL.createObjectURL(b))
        .catch((e) => { audioCache.delete(k); throw e; }));
    }
    return audioCache.get(k);
  }
  // Prépare à l'avance l'audio d'une liste de morceaux [{text, voice}].
  function prefetch(parts) {
    // Une phrase après l'autre : la lecture d'un morceau dure plus longtemps que la préparation du suivant.
    parts.reduce((chain, p) => chain.then(() => fetchAudio(p.text, p.voice).catch(() => {})), Promise.resolve());
  }

  let current = null; // lecture en cours : { audio, stopped }
  function stopAudio() {
    if (current) { current.stopped = true; current.audio && current.audio.pause(); current = null; }
    synth && synth.cancel();
  }
  async function playParts(parts, rate) {
    stopAudio();
    const me = (current = { audio: null, stopped: false });
    S.speaking = true; updateMic();
    try {
      for (let i = 0; i < parts.length && !me.stopped; i++) {
        if (parts[i + 1]) fetchAudio(parts[i + 1].text, parts[i + 1].voice).catch(() => {});
        let url;
        try { url = await fetchAudio(parts[i].text, parts[i].voice); } catch (e) { await browserSpeak(parts[i].text, rate); continue; }
        if (me.stopped) break;
        const a = (me.audio = new Audio(url));
        a.playbackRate = rate; a.preservesPitch = true;
        await new Promise((res) => { a.onended = a.onerror = res; a.play().catch(res); });
        // Petite respiration quand la personne qui parle change.
        if (parts[i + 1] && parts[i + 1].voice !== parts[i].voice) await new Promise((r) => setTimeout(r, 250));
      }
    } finally {
      if (current === me) current = null;
      S.speaking = false; updateMic();
    }
  }
  function browserSpeak(text, rate) {
    if (!synth) return Promise.resolve();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB"; u.rate = rate;
      u.onend = u.onerror = resolve;
      synth.speak(u);
    });
  }
  const rateOf = () => Number($("en-rate").value) || 1;
  function speak(text) { return playParts(chunks(text).map((t) => ({ text: t, voice: myVoice() })), rateOf()); }

  // Passage d'écoute : « Prénom: réplique » sur chaque ligne = dialogue, une voix par personne (femmes et hommes alternés).
  function passageParts(passage) {
    const lines = passage.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const said = lines.map((l) => /^([A-Z][A-Za-z .'-]{0,24}):\s*(.+)$/.exec(l));
    const dialogue = said.filter(Boolean).length >= 2;
    const fem = VOICES.filter((v) => v.gender === "F").map((v) => v.name), men = VOICES.filter((v) => v.gender === "M").map((v) => v.name);
    const pool = [fem[0], men[0], fem[1], men[1], fem[2], men[2]].filter(Boolean);
    // Genre donné par le professeur pour chaque personne : une voix de femme ou d'homme différente pour chacune.
    const genderOf = new Map((S.speakers || []).map((s) => [s.name.trim().toLowerCase(), s.gender]));
    const used = { F: 0, M: 0 };
    const who = new Map();
    const voiceFor = (name) => {
      if (!who.has(name)) {
        const g = genderOf.get(name.toLowerCase());
        const list = g === "F" ? fem : g === "M" ? men : null;
        who.set(name, (list && list[used[g]++ % list.length]) || pool[who.size % pool.length] || myVoice());
      }
      return who.get(name);
    };
    const narrator = men.find((n) => /Orus/.test(n)) || myVoice();
    const parts = [];
    lines.forEach((l, i) => {
      const m = dialogue && said[i];
      const voice = m ? voiceFor(m[1].trim()) : narrator;
      chunks(m ? m[2] : l).forEach((t) => parts.push({ text: t, voice }));
    });
    return parts;
  }

  // ---------------- Conversation orale ----------------
  const SR = root.SpeechRecognition || root.webkitSpeechRecognition;
  let rec = null, heard = "";
  function updateMic() {
    const b = $("en-mic");
    if (!b || !S) return;
    b.disabled = !SR || S.busy;
    b.classList.toggle("on", !!rec);
    b.textContent = rec ? "⏹ J'ai fini de parler" : S.speaking ? "🎤 Parler (coupe l'IA)" : "🎤 Appuie pour parler";
  }
  function startMic() {
    if (!SR || S.busy) return;
    stopAudio();
    heard = "";
    rec = new SR();
    rec.lang = "en-US"; rec.interimResults = true; rec.continuous = true;
    rec.onresult = (e) => {
      let fin = "", tmp = "";
      for (const r of e.results) (r.isFinal ? (fin += r[0].transcript) : (tmp += r[0].transcript));
      heard = fin;
      $("en-live").textContent = (fin + " " + tmp).trim() || "…";
    };
    rec.onerror = (e) => { $("en-live").textContent = e.error === "not-allowed" ? "Micro refusé : autorise-le dans la barre d'adresse." : e.error === "no-speech" ? "Je n'ai rien entendu, réessaie." : `Micro : ${e.error}`; };
    rec.onend = () => { const said = heard.trim(); rec = null; updateMic(); if (said) say(said); };
    rec.start();
    $("en-live").textContent = "J'écoute… parle en anglais.";
    updateMic();
  }
  function stopMic() { if (rec) rec.stop(); }
  async function say(text) {
    $("en-live").textContent = "";
    const mine = studentMsg(text, []);
    const j = await turn(text, { waitText: "⏳ …" });
    if (!j) return;
    mine.replaceWith(studentMsg(text, j.corrections || []));
    errorsOf(j);
    tutorMsg(j, { speak: true, hidden: !$("en-showtext").checked });
    speak(j.reply);
  }

  // ---------------- Expression écrite ----------------
  const words = (t) => (t.trim().match(/[A-Za-z'’-]+/g) || []).length;
  function updateCount() {
    const n = words($("en-text").value);
    const goal = S.words;
    $("en-count").textContent = `${n} / ~${goal} mots`;
    $("en-count").className = n < goal * 0.7 ? "short" : n > goal * 1.4 ? "long" : "okay";
  }
  async function submitWriting() {
    const text = $("en-text").value.trim();
    if (words(text) < 5) { $("en-count").textContent = "Écris d'abord ta rédaction en anglais."; return; }
    const mine = studentMsg(text, []);
    const j = await turn(`[COPIE] (${words(text)} mots, environ ${S.words} demandés)\n${text}`, { waitText: "⏳ Le professeur corrige ta copie…" });
    if (!j) return;
    mine.replaceWith(studentMsg(text, j.corrections || []));
    errorsOf(j);
    tutorMsg(j);
  }

  // ---------------- Compréhension orale ----------------
  async function newPassage(first) {
    const j = await turn(first ? "" : "[SUIVANT]", { waitText: "⏳ Le professeur prépare un texte…" });
    if (!j) return;
    S.passage = j.passage || ""; S.plays = 0; S.answered = false;
    S.speakers = j.speakers || [];
    S.parts = passageParts(S.passage);
    prefetch(S.parts); // l'audio se prépare pendant que l'élève lit les questions
    $("en-passage").hidden = true; $("en-passage").textContent = S.passage;
    $("en-reveal").hidden = true; $("en-plays").textContent = ""; $("en-answers").value = "";
    tutorMsg(j);
    if (!S.passage) add("tutor", "Pas de texte reçu : clique sur « Exercice suivant ».");
  }
  async function playPassage() {
    if (!S.passage) return;
    S.plays++;
    $("en-plays").textContent = `écouté ${S.plays} fois`;
    await playParts(S.parts, $("en-slow").checked ? 0.8 : 1);
  }
  async function sendAnswers() {
    const text = $("en-answers").value.trim();
    if (!text) return;
    const mine = studentMsg(text, []);
    const j = await turn(`[RÉPONSES] (texte écouté ${S.plays} fois)\n${text}`, { waitText: "⏳ Correction…" });
    if (!j) return;
    mine.replaceWith(studentMsg(text, j.corrections || []));
    errorsOf(j);
    tutorMsg(j);
    S.answered = true; $("en-reveal").hidden = false;
  }

  // ---------------- Fin de séance ----------------
  async function end() {
    stopMic(); stopAudio();
    const j = await turn("[FIN DE SÉANCE]", { waitText: "⏳ Le professeur prépare ton bilan…" });
    if (!j) return;
    const box = el("div", "en-msg en-summary");
    box.append(el("b", "", "📋 Bilan de la séance"), rich(j.summary || j.reply));
    $("en-log").appendChild(box);
    box.scrollIntoView({ block: "end" });
    log(j.summary);
  }

  // Journal d'utilisation (usage.js) : une entrée par séance d'anglais.
  function log(summary) {
    if (!root.Usage) return;
    const d = Usage.data;
    d.anglais = d.anglais || {};
    const e = (d.anglais[S.id] = d.anglais[S.id] || { mode: TITLES[S.mode], sujet: S.topic || "au choix de l'IA" });
    e.echanges = S.history.filter((m) => m.role === "user").length;
    e.niveau = S.cefr;
    e.erreurs = { ...S.errors };
    if (summary) e.bilan = summary;
    Usage.save();
  }

  // ---------------- Démarrage ----------------
  let wired = false;
  function wire() {
    if (wired) return;
    wired = true;
    $("en-end").onclick = end;
    $("en-text").addEventListener("input", updateCount);
    $("en-words2").onchange = () => { S.words = Number($("en-words2").value); updateCount(); };
    $("en-submit").onclick = submitWriting;
    $("en-newtopic").onclick = async () => { const j = await turn("[NOUVEAU SUJET]", { waitText: "⏳ Nouveau sujet…" }); if (j) { tutorMsg(j); $("en-text").value = ""; updateCount(); } };
    $("en-mic").onclick = () => (rec ? stopMic() : startMic());
    $("en-form").onsubmit = (e) => { e.preventDefault(); const t = $("en-input").value.trim(); if (t && !S.busy) { $("en-input").value = ""; say(t); } };
    $("en-voice").onchange = () => { store.set("en:voice2", $("en-voice").value); speak("Hi! This is how I sound. Shall we keep talking?"); };
    $("en-showtext").onchange = () => document.querySelectorAll("#en-log .tutor .en-text").forEach((t) => t.classList.toggle("masked", !$("en-showtext").checked));
    $("en-play").onclick = playPassage;
    $("en-reveal").onclick = () => { $("en-passage").hidden = !$("en-passage").hidden; };
    $("en-send-answers").onclick = sendAnswers;
    $("en-next").onclick = () => newPassage(false);
  }

  async function start(opts) {
    wire();
    stopMic(); stopAudio();
    S = { ...opts, id: Date.now().toString(36), cefr: store.get("en:cefr", ""), history: [], busy: false, speaking: false, passage: "", plays: 0, errors: {} };
    $("en-log").innerHTML = "";
    $("en-title").textContent = TITLES[S.mode];
    $("en-level").textContent = S.cefr ? `Niveau estimé : ${S.cefr}` : "Niveau : à évaluer";
    $("en-write").hidden = S.mode !== "ecrit";
    $("en-talk").hidden = S.mode !== "oral";
    $("en-listen").hidden = S.mode !== "ecoute";
    $("en-mic-note").hidden = !!SR;
    $("en-words2").value = String(S.words);
    $("en-text").value = "";
    updateCount(); updateMic();
    await loadVoices();
    if (S.mode === "ecoute") return newPassage(true);
    const j = await turn("", { waitText: S.mode === "ecrit" ? "⏳ Le professeur prépare ton sujet…" : "⏳ Le professeur arrive…" });
    if (!j) return;
    tutorMsg(j, { speak: S.mode === "oral", hidden: S.mode === "oral" && !$("en-showtext").checked });
    if (S.mode === "oral") speak(j.reply);
  }
  function stop() { stopMic(); stopAudio(); }

  root.English = { start, stop };
})(window);
