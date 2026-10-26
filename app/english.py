"""Anglais : trois modes imposés (expression écrite, conversation orale, compréhension orale).
Le professeur s'aligne sur le niveau réel de l'élève (CECRL) et reste légèrement au-dessus ; chaque erreur est relevée à part."""
import json

from google.genai import types
from pydantic import BaseModel, Field

from .tutor import MODEL, _client

MODES = ("ecrit", "oral", "ecoute")
CEFR = ("A1", "A2", "B1", "B2", "C1", "C2")
START_CEFR = {"Primaire": "A1", "Collège": "A2", "Lycée": "B1", "Supérieur": "B2"}


class Correction(BaseModel):
    original: str = Field(description="Passage fautif recopié EXACTEMENT depuis le dernier message de l'élève")
    corrected: str = Field(description="Version correcte")
    explication: str = Field(description="Règle en français, une phrase courte")
    categorie: str = Field(description="grammaire, conjugaison, vocabulaire, orthographe, prépositions, ordre des mots, style ou compréhension")


class EnglishTurn(BaseModel):
    reply: str = Field(description="Ce que tu dis ou écris à l'élève (voir le mode)")
    corrections: list[Correction] = Field(description="Erreurs du DERNIER message de l'élève, vide s'il n'y en a pas ou s'il n'a encore rien écrit")
    score: str = Field(description="Écrit : « 14/20 — commentaire » quand tu corriges une copie ; écoute : « 4/5 » quand tu corriges des réponses ; vide sinon")
    passage: str = Field(description="Compréhension orale UNIQUEMENT : texte à lire à voix haute pour un nouvel exercice ; vide sinon")
    level: str = Field(description="Niveau CECRL réel estimé de l'élève : A1, A2, B1, B2, C1 ou C2")
    summary: str = Field(description="Uniquement à la FIN DE SÉANCE : bilan en français ; vide sinon")


BASE = """Tu es un professeur d'anglais natif, chaleureux et exigeant, pour un élève francophone. En français, tutoie-le.
Niveau scolaire déclaré : {school}. Niveau CECRL estimé jusqu'ici : {cefr}. Sujet souhaité : {topic}.

ADAPTATION (essentiel) :
- Évalue son niveau réel à chaque message et mets `level` à jour (A1…C2). Ne te fie pas qu'au niveau déclaré.
- Parle et écris TOUJOURS un cran au-dessus de son niveau réel (i+1) : vocabulaire et structures un peu plus riches que les siens, mais compréhensibles. S'il réussit facilement, monte encore ; s'il est perdu, simplifie.
CORRECTIONS (champ `corrections`) :
- Relève chaque vraie erreur du DERNIER message de l'élève (au plus 25) : `original` recopié mot pour mot, `corrected`, règle courte en français. N'invente pas de faute ; une tournure correcte mais peu naturelle peut être relevée en « style ».
- Ne mets pas les corrections dans `reply` : l'application les affiche à part.
{mode}
FIN DE SÉANCE (message « [FIN DE SÉANCE] ») : `summary` = bilan en français, en 5 parties courtes avec des tirets : niveau estimé (CECRL) et progression pendant la séance ; points forts ; erreurs récurrentes avec la règle à retenir ; mots et expressions utiles vus ; 3 conseils concrets pour la prochaine fois. `reply` = un au revoir court en anglais. Pas de nouvel exercice."""

MODE_PROMPTS = {
    "ecrit": """MODE EXPRESSION ÉCRITE (longueur visée : environ {words} mots) :
- Sans copie de l'élève (début, ou « [NOUVEAU SUJET] ») : `reply` = un sujet de rédaction EN ANGLAIS sur le thème souhaité (ou un thème varié et concret si aucun), adapté à son niveau + 1, avec la longueur visée et 2 ou 3 points à traiter. Courte phrase d'aide en français si le niveau est A1-A2.
- Quand l'élève rend sa copie : `corrections` exhaustives ; `score` = note sur 20 et commentaire d'une ligne (respect du sujet et de la longueur, richesse, correction de la langue) ; `reply` en français : 2 points forts, 2 axes de progrès, puis 1 ou 2 phrases de sa copie réécrites plus naturellement (en anglais). Termine en proposant de réécrire sa copie ou de demander un nouveau sujet.
- Si c'est une réécriture, dis ce qui s'est amélioré.""",
    "oral": """MODE CONVERSATION ORALE (ses messages viennent de la reconnaissance vocale) :
- `reply` = ta réplique PARLÉE, en anglais uniquement, naturelle et vivante : 1 à 3 phrases, souvent terminée par une question ouverte pour relancer. Pas de listes, pas de mise en forme, pas d'émojis (le texte est lu à voix haute).
- Premier tour : salue-le et lance le sujet souhaité (ou propose-en un concret et adapté).
- Ne relève PAS les défauts dus à la transcription vocale (majuscules, ponctuation, mots d'hésitation) ; relève la grammaire, le vocabulaire et les tournures.
- S'il parle français ou cherche un mot, aide-le en anglais simple et donne-lui le mot. S'il veut changer de sujet (« [SUJET] … »), enchaîne naturellement.
- Fais-le parler plus que toi.""",
    "ecoute": """MODE COMPRÉHENSION ORALE :
- Nouvel exercice (début, ou après une correction) : `passage` = un texte à écouter EN ANGLAIS (dialogue ou court récit vivant sur le thème souhaité, environ {passage_words} mots, niveau + 1) ; `reply` = 3 à 5 questions numérotées en anglais (questions ouvertes ou « true or false, justify »), sans jamais recopier le texte. L'élève ne voit pas le texte, il l'écoute.
- Quand l'élève répond : `score` = « x/N » (bonnes réponses, sens compris) ; `corrections` = ses erreurs de langue ; `reply` en français : pour chaque question, juste ou non avec la bonne réponse et la phrase du texte qui la justifie. Puis annonce le prochain exercice : un peu plus difficile s'il a presque tout juste, même niveau sinon (il le demandera avec « [SUIVANT] »).""",
}

PASSAGE_WORDS = {"A1": 50, "A2": 80, "B1": 120, "B2": 160, "C1": 200, "C2": 230}


def reply(mode: str, school: str, cefr: str, topic: str, words: int, messages: list[dict]) -> dict:
    mode = mode if mode in MODES else "oral"
    cefr = cefr if cefr in CEFR else START_CEFR.get(school, "B1")
    system = BASE.format(
        school=school, cefr=cefr, topic=topic.strip() or "au choix du professeur, varié et concret",
        mode=MODE_PROMPTS[mode].format(words=max(30, min(600, words)), passage_words=PASSAGE_WORDS[cefr]),
    )
    contents = [
        types.Content(role="user" if m["role"] == "user" else "model", parts=[types.Part.from_text(text=m["content"])])
        for m in messages
    ] or [types.Content(role="user", parts=[types.Part.from_text(text="[DÉBUT DE SÉANCE]")])]
    resp = _client().models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system, temperature=0.7,
            response_mime_type="application/json", response_schema=EnglishTurn,
        ),
    )
    turn = (resp.parsed or EnglishTurn.model_validate_json(resp.text)).model_dump()
    if turn["level"] not in CEFR:
        turn["level"] = cefr
    if mode != "ecoute":
        turn["passage"] = ""
    # Une correction doit citer le texte de l'élève : on écarte celles qui n'y figurent pas (inventées ou reformulées).
    last = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
    turn["corrections"] = [c for c in turn["corrections"] if c["original"].strip() and c["original"].strip().lower() in last.lower()]
    return turn
