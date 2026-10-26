-- Journal d'utilisation (projet Supabase « ia-school »). Déjà appliqué ; gardé ici pour recréer la base.
create table public.usage_sessions (
  id uuid primary key,
  site text not null check (site in ('ia_school', 'algo_lab')),
  username text not null check (char_length(username) between 1 and 60),
  started_at timestamptz not null,
  last_seen timestamptz not null default now(),
  duration_s integer not null default 0 check (duration_s >= 0),
  summary jsonb not null default '{}'::jsonb,
  emailed boolean not null default false,
  created_at timestamptz not null default now()
);
create index usage_sessions_pending on public.usage_sessions (last_seen) where not emailed;
-- RLS sans aucune politique : seule la fonction log-session (service role) lit et écrit.
alter table public.usage_sessions enable row level security;

-- Envoi des résumés : toutes les 10 min, la fonction envoie les sessions inactives depuis 10 min.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule(
  'envoi-resumes-utilisation',
  '*/10 * * * *',
  $$select net.http_post(
      url := 'https://rqhtwepssrubdyzqgetn.supabase.co/functions/v1/log-session',
      body := '{"flush": true}'::jsonb,
      headers := '{"Content-Type": "application/json"}'::jsonb
  )$$
);
