"""Catalogue matières / thématiques. Seul le contexte de la thématique choisie est chargé."""
import re

SUBJECTS = {
    "maths": {
        "label": "Mathématiques",
        "themes": ["Fractions", "Équations", "Proportionnalité", "Géométrie", "Fonctions", "Probabilités"],
        "scientific": True,
    },
    "physique": {
        "label": "Physique-Chimie",
        "themes": ["Mouvement et vitesse", "Forces", "Énergie", "Électricité", "Optique", "Matière et réactions chimiques"],
        "scientific": True,
    },
    "numerique": {
        "label": "Numérique",
        "themes": ["Variables et types", "Conditions", "Boucles", "Listes", "Fonctions", "Algorithmes", "Données et binaire"],
        "scientific": True,
    },
    "francais": {
        "label": "Français",
        "themes": ["Conjugaison", "Accords", "Grammaire", "Orthographe", "Vocabulaire", "Analyse de texte"],
    },
}

LEVELS = ["Primaire", "Collège", "Lycée", "Supérieur"]

# La matière est saisie librement ("Maths", "Physique-Chimie", "NSI"…) : on reconnaît les sciences par mots-clés.
def is_scientific(subject: str) -> bool:
    s = subject.lower().strip()
    if s in SUBJECTS:
        return SUBJECTS[s].get("scientific", False)
    return bool(re.search(r"\b(nsi|snt)\b|math|physique|chimie|num[ée]rique|informatique|python|programm|javascript", s))


def is_coding(subject: str, theme: str) -> bool:
    s = f"{subject} {theme}".lower()
    return bool(re.search(r"\b(nsi|snt)\b|num[ée]rique|informatique|python|programm|javascript", s))


def describe(subject: str, theme: str) -> str:
    s = SUBJECTS.get(subject.lower())
    label = s["label"] if s else subject
    return f"{label} - {theme}"
