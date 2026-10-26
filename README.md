# IA School et Algo Lab

Deux sites pour réviser en pratiquant :

- **IA School** (`app/`, `static/`) : un tuteur IA (FastAPI + Gemini) qui découpe un thème en notions et fait progresser par exercices, avec un éditeur Python/JavaScript (blocs, pas à pas, exercices sur papier). L'IA est protégée par un **code d'accès**.
- **Algo Lab** (`algo_lab/`) : site statique, sans IA, pour les structures de données (listes, piles, files, arbres) en pseudo-code, avec tests automatiques et exécution dessinée pas à pas.

Pas de compte : chaque site demande un prénom ou un pseudo. À chaque utilisation, un résumé (nom, date, temps actif, ce qui a été fait) est enregistré dans Supabase puis envoyé par e-mail.

## En local

```bash
pip install -r requirements.txt
export GEMINI_API_KEY=...        # clé gratuite sur https://aistudio.google.com/apikey
export ACCESS_CODE=choisis-un-code
uvicorn app.main:app --reload    # IA School sur http://localhost:8000
python -m http.server 8090 --directory algo_lab   # Algo Lab sur http://localhost:8090
```

Variables d'IA School : `GEMINI_API_KEY` (ou `GOOGLE_CLOUD_PROJECT` pour passer par Vertex AI), `ACCESS_CODE`, `GEMINI_MODEL` (défaut `gemini-2.5-flash`).

Tests d'Algo Lab : `node algo_lab/test/check.js` (chaque correction doit passer ses tests).

## Mise en ligne

- **Algo Lab** : publié automatiquement sur GitHub Pages à chaque push (`.github/workflows/pages.yml`).
- **IA School** : sur Render, *New + → Blueprint* puis choisir ce dépôt (`render.yaml`). Render demande `GEMINI_API_KEY` et `ACCESS_CODE`. L'offre gratuite met le site en veille après 15 min sans visite : le premier chargement suivant prend environ 1 minute.

## Suivi des utilisations

- `static/usage.js` et `algo_lab/js/usage.js` (même fichier) : prénom, temps actif (page visible et activité dans les 2 dernières minutes), résumé envoyé à la fonction Supabase.
- `supabase/functions/log-session` : enregistre les sessions dans la table `usage_sessions` et envoie l'e-mail 10 minutes après la dernière activité (cron, `supabase/migrations`).
- E-mails via [Resend](https://resend.com) : secret `RESEND_API_KEY` dans Supabase (*Edge Functions → Secrets*). Destinataire : secret `MAIL_TO`. Sans clé, les sessions sont gardées et envoyées dès qu'elle est ajoutée.
