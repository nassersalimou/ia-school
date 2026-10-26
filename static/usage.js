/* Journal d'utilisation (même fichier dans static/usage.js pour IA School) : demande un prénom ou pseudo
   (pas de compte), mesure le temps actif et envoie un résumé de la session à Supabase. Le résumé est envoyé
   par e-mail 10 minutes après la dernière activité (fonction log-session + cron).
   Usage.start(site, summarize) ; Usage.data : objet libre de la session ; Usage.save() après l'avoir modifié. */
(function (root) {
  "use strict";
  const ENDPOINT = "https://rqhtwepssrubdyzqgetn.supabase.co/functions/v1/log-session";
  const IDLE_NEW_SESSION = 10 * 60 * 1000; // même délai que l'envoi de l'e-mail : au-delà, nouvelle session
  const TICK = 5000, AWAY = 2 * 60 * 1000, BEAT = 60 * 1000;

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)));

  let site = "", summarize = () => ({}), sess = null, lastInput = Date.now(), dirty = false;
  const key = () => `usage:${site}:session`;

  function fresh() { return { id: uuid(), started_at: new Date().toISOString(), active: 0, seen: Date.now(), data: {} }; }
  function load() {
    const s = store.get(key(), null);
    return s && Date.now() - s.seen < IDLE_NEW_SESSION ? s : fresh();
  }
  function save() { if (sess) { sess.seen = Date.now(); store.set(key(), sess); dirty = true; } }

  function send(final) {
    const name = store.get("usage:name", "");
    if (!sess || !name || (!dirty && !final)) return;
    dirty = false;
    let summary = {};
    try { summary = summarize(sess.data) || {}; } catch (e) { summary = { titre: "résumé indisponible" }; }
    const body = JSON.stringify({ id: sess.id, site, username: name, started_at: sess.started_at, duration_s: Math.round(sess.active / 1000), summary });
    fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true })
      .then((r) => r.json())
      .then((j) => { if (j && j.closed) { sess = fresh(); save(); } }) // déjà envoyée par e-mail : on repart sur une nouvelle session
      .catch(() => {});
  }

  // Demande le prénom une seule fois (gardé dans ce navigateur).
  function askName(force) {
    return new Promise((resolve) => {
      const current = store.get("usage:name", "");
      if (current && !force) return resolve(current);
      const wrap = document.createElement("div");
      wrap.className = "usage-modal";
      wrap.innerHTML = `<form class="usage-card"><b>Bienvenue !</b><label>Ton prénom ou un pseudo<input name="n" maxlength="40" autocomplete="nickname" required></label><small>Pas de compte : ce nom sert seulement au suivi de tes séances.</small><button>C'est parti</button></form>`;
      const input = wrap.querySelector("input");
      input.value = current;
      wrap.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault();
        const n = input.value.trim().slice(0, 40);
        if (!n) return;
        store.set("usage:name", n);
        wrap.remove();
        renderBadge();
        resolve(n);
      });
      document.body.appendChild(wrap);
      setTimeout(() => input.focus(), 0);
    });
  }

  // Petit badge « 👤 Nom » pour changer de nom.
  function renderBadge() {
    let b = document.getElementById("usage-badge");
    if (!b) {
      b = document.createElement("button");
      b.id = "usage-badge"; b.type = "button"; b.title = "Changer de nom";
      b.addEventListener("click", () => askName(true).then(() => { dirty = true; send(); }));
      document.body.appendChild(b);
    }
    b.textContent = `👤 ${store.get("usage:name", "")}`;
  }

  function start(siteName, summarizer) {
    site = siteName; summarize = summarizer || summarize;
    sess = load(); save();
    const css = document.createElement("style");
    css.textContent = `.usage-modal{position:fixed;inset:0;background:rgba(10,12,30,.55);display:grid;place-items:center;z-index:9999;padding:16px}
.usage-card{background:var(--card,#fff);color:var(--fg,#1d2030);border-radius:14px;padding:20px;display:grid;gap:10px;width:min(360px,100%);box-shadow:0 10px 40px rgba(0,0,0,.25);font:16px/1.4 system-ui,sans-serif}
.usage-card label{display:grid;gap:4px}.usage-card input{padding:10px;border-radius:8px;border:1px solid #ccd;font:inherit}
.usage-card small{opacity:.7}.usage-card button{padding:10px;border:0;border-radius:8px;background:var(--accent,#4c5fd5);color:#fff;font:inherit;cursor:pointer}
#usage-badge{position:fixed;right:12px;bottom:12px;z-index:50;border:1px solid rgba(128,128,160,.35);background:var(--card,#fff);color:var(--fg,#1d2030);border-radius:999px;padding:6px 12px;font:13px system-ui,sans-serif;cursor:pointer;opacity:.85}`;
    document.head.appendChild(css);
    askName(false).then(() => { renderBadge(); send(); });
    ["pointerdown", "keydown", "scroll", "touchstart"].forEach((ev) => addEventListener(ev, () => { lastInput = Date.now(); }, { passive: true, capture: true }));
    // Temps actif : page visible et activité dans les 2 dernières minutes.
    setInterval(() => {
      if (document.visibilityState !== "visible" || Date.now() - lastInput > AWAY) return;
      if (Date.now() - sess.seen > IDLE_NEW_SESSION) { send(true); sess = fresh(); }
      sess.active += TICK; save();
    }, TICK);
    setInterval(() => send(), BEAT);
    addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") send(true); });
    addEventListener("pagehide", () => send(true));
  }

  root.Usage = {
    start,
    get data() { return sess ? sess.data : {}; },
    save,
    // Ajoute 1 au compteur data[k] (ou data[k][sub]).
    inc(k, sub) { if (!sess) return; const d = sess.data; if (sub === undefined) d[k] = (d[k] || 0) + 1; else { d[k] = d[k] || {}; d[k][sub] = (d[k][sub] || 0) + 1; } save(); },
  };
})(window);
