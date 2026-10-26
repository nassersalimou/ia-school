// Journal d'utilisation d'IA School et d'Algo Lab.
// POST {id, site, username, started_at, duration_s, summary} : crée ou met à jour la session (appelé régulièrement par les sites).
// POST {flush: true} (cron toutes les 10 min) : envoie par e-mail le résumé des sessions inactives depuis IDLE_MIN minutes.
// Pas de JWT : la table n'est accessible qu'ici (service role) et les entrées sont validées et bornées.
import { createClient } from "jsr:@supabase/supabase-js@2";

const MAIL_TO = Deno.env.get("MAIL_TO") ?? "coucou.sayen@gmail.com";
const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
const IDLE_MIN = 10;
const SITES: Record<string, string> = { ia_school: "IA School", algo_lab: "Algo Lab" };
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, apikey, authorization, x-client-info",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const esc = (s: unknown) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const fmtDuration = (s: number) => (s < 60 ? `${s} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} min`);
const fmtDate = (d: string) => new Date(d).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "full", timeStyle: "short" });

// summary = { titre?: string, points?: string[], sections?: { titre: string, points: string[] }[] }
function renderSummary(s: any): string {
  const list = (pts: unknown) => (Array.isArray(pts) && pts.length ? `<ul>${pts.slice(0, 60).map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : "");
  let html = s?.titre ? `<p><b>${esc(s.titre)}</b></p>` : "";
  html += list(s?.points);
  for (const sec of Array.isArray(s?.sections) ? s.sections.slice(0, 20) : []) html += `<h3 style="margin:14px 0 4px">${esc(sec.titre)}</h3>${list(sec.points)}`;
  return html || "<p>(rien à signaler)</p>";
}

async function sendMail(row: any): Promise<boolean> {
  if (!RESEND_KEY) return false; // pas encore configuré : la session sera envoyée plus tard
  const site = SITES[row.site] ?? row.site;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:640px">
    <h2 style="margin:0 0 6px">${esc(site)} · ${esc(row.username)}</h2>
    <p style="color:#555;margin:0 0 12px">${esc(fmtDate(row.started_at))} · temps actif : <b>${esc(fmtDuration(row.duration_s))}</b></p>
    ${renderSummary(row.summary)}
  </div>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: `${site} <onboarding@resend.dev>`, to: [MAIL_TO], subject: `${site} : ${row.username}, ${fmtDuration(row.duration_s)}`, html }),
  });
  if (!r.ok) console.error("resend", r.status, await r.text());
  return r.ok;
}

async function flush() {
  const before = new Date(Date.now() - IDLE_MIN * 60_000).toISOString();
  const { data, error } = await db.from("usage_sessions").select("*").eq("emailed", false).lt("last_seen", before).order("last_seen").limit(20);
  if (error) throw error;
  let sent = 0;
  for (const row of data ?? []) {
    // Visites trop courtes (moins de 30 s) : enregistrées mais pas envoyées.
    if (row.duration_s < 30 || (await sendMail(row))) {
      await db.from("usage_sessions").update({ emailed: true }).eq("id", row.id);
      if (row.duration_s >= 30) sent++;
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST attendu" }, 405);
  let b: any;
  try { b = await req.json(); } catch { return json({ error: "JSON invalide" }, 400); }
  try {
    if (b?.flush) return json({ sent: await flush() });
    const username = String(b?.username ?? "").trim().slice(0, 60);
    const started = new Date(b?.started_at);
    if (!UUID.test(String(b?.id)) || !SITES[b?.site] || !username || isNaN(started.getTime())) return json({ error: "champs invalides" }, 400);
    const summary = b?.summary && typeof b.summary === "object" ? b.summary : {};
    if (JSON.stringify(summary).length > 30_000) return json({ error: "résumé trop long" }, 413);
    const duration_s = Math.max(0, Math.min(86_400, Math.round(Number(b?.duration_s) || 0)));
    // Une session déjà envoyée par e-mail n'est plus modifiée (le site en ouvre une nouvelle).
    const { data: old } = await db.from("usage_sessions").select("emailed").eq("id", b.id).maybeSingle();
    if (old?.emailed) return json({ ok: true, closed: true });
    const { error } = await db.from("usage_sessions").upsert({ id: b.id, site: b.site, username, started_at: started.toISOString(), last_seen: new Date().toISOString(), duration_s, summary });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: "erreur serveur" }, 500);
  }
});
