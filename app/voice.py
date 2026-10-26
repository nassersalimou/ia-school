"""Voix naturelles pour l'anglais : Google Cloud Text-to-Speech, voix Chirp 3 HD (rapides et très naturelles,
elles lisent les hésitations « um », « uh », « … » comme une vraie personne)."""
import base64
import os
import re
import threading
import time
from collections import OrderedDict

import google.auth
import google.auth.transport.requests
import requests

URL = "https://texttospeech.googleapis.com/v1/text:synthesize"
# Voix proposées à l'élève : (nom, libellé, genre). La première est la voix par défaut.
VOICES = [
    ("en-US-Chirp3-HD-Aoede", "🇺🇸 Aoede · femme, détendue", "F"),
    ("en-US-Chirp3-HD-Puck", "🇺🇸 Puck · homme, enjoué", "M"),
    ("en-GB-Chirp3-HD-Kore", "🇬🇧 Kore · femme, posée", "F"),
    ("en-GB-Chirp3-HD-Charon", "🇬🇧 Charon · homme, grave", "M"),
    ("en-US-Chirp3-HD-Leda", "🇺🇸 Leda · femme, jeune", "F"),
    ("en-GB-Chirp3-HD-Fenrir", "🇬🇧 Fenrir · homme, dynamique", "M"),
    ("en-US-Chirp3-HD-Sulafat", "🇺🇸 Sulafat · femme, chaleureuse", "F"),
    ("en-GB-Chirp3-HD-Orus", "🇬🇧 Orus · homme, narrateur", "M"),
]
VOICE_RE = re.compile(r"^en-(US|GB|AU|IN)-Chirp3-HD-[A-Za-z]+$")

_creds = None
_lock = threading.Lock()
_cache: "OrderedDict[tuple[str, str], bytes]" = OrderedDict()


def _token() -> str:
    # Verrou : plusieurs phrases sont demandées en même temps, une seule requête doit rafraîchir les identifiants.
    global _creds
    with _lock:
        if _creds is None:
            _creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/cloud-platform"])
        if not _creds.valid:
            _creds.refresh(google.auth.transport.requests.Request())
        return _creds.token


def synthesize(text: str, voice: str) -> bytes:
    """MP3 de `text` lu par `voice`. Les petites phrases reviennent souvent (réécoute) : on garde un cache."""
    if not VOICE_RE.match(voice):
        voice = VOICES[0][0]
    text = text.strip()[:1500]
    key = (voice, text)
    if key in _cache:
        _cache.move_to_end(key)
        return _cache[key]
    headers = {"Authorization": f"Bearer {_token()}", "Content-Type": "application/json"}
    if os.getenv("GOOGLE_CLOUD_PROJECT"):
        headers["x-goog-user-project"] = os.environ["GOOGLE_CLOUD_PROJECT"]  # nécessaire avec des identifiants utilisateur (local)
    body = {"input": {"text": text}, "voice": {"languageCode": voice[:5], "name": voice}, "audioConfig": {"audioEncoding": "MP3"}}
    for attempt in range(3):  # quota par seconde ou erreur passagère : on réessaie
        r = requests.post(URL, json=body, headers=headers, timeout=30)
        if r.status_code not in (429, 500, 502, 503) or attempt == 2:
            break
        time.sleep(0.5 * (attempt + 1))
    r.raise_for_status()
    audio = base64.b64decode(r.json()["audioContent"])
    _cache[key] = audio
    if len(_cache) > 300:
        _cache.popitem(last=False)
    return audio
