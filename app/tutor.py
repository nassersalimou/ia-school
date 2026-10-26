"""Tuteur IA : appel Gemini (Vertex AI en prod, clé API en local) avec profil adaptatif."""
import hashlib
import json
import os
import re

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from .subjects import describe, is_coding, is_scientific

MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


MASTERY = 3  # réussites sans aide, de difficulté croissante, pour valider une notion
GAP_FIXED = 2  # réussites sans aide sur des exercices ciblés pour fermer une lacune


class Gap(BaseModel):
    skill: str = Field(description="Notion précise en lacune ou fragile")
    status: str = Field(description="open (à corriger) ou fixed (corrigée)")
    resume_difficulty: int = Field(description="Difficulté où en était l'élève quand la lacune est apparue : on y revient directement une fois la lacune comblée")
    successes: int = Field(description="Exercices ciblés sur cette lacune réussis SANS aide depuis qu'elle est apparue")


class Notion(BaseModel):
    name: str = Field(description="Nom de la notion, recopié tel quel depuis le plan")
    status: str = Field(description="todo (pas commencée), current (en cours) ou mastered (acquise)")
    successes: int = Field(description="Exercices de cette notion réussis SANS aide, chacun plus dur que le précédent")


class Profile(BaseModel):
    difficulty: int = Field(description="Difficulté courante des exercices, 1 (très facile) à 5 (très dur)")
    streak: int = Field(description="Réussites consécutives sans aide")
    style: str = Field(description="Ce qui marche pour cet élève (ex: exemples concrets, schémas, rythme rapide)")
    calibrated: bool = Field(description="True quand le niveau est cerné (après ~3 réponses)")
    gaps: list[Gap]
    plan: list[Notion] = Field(description="Plan des notions dans l'ordre, mis à jour (status, successes)")
    practice: int = Field(description="Nombre d'exercices PRATIQUES donnés (l'élève produit un calcul, une résolution, un programme)  : +1 UNIQUEMENT dans le message où tu donnes un NOUVEL énoncé ; jamais pendant une correction, un indice ou une nouvelle tentative")
    theory: int = Field(description="Nombre de questions THÉORIQUES données (définition, prédire une sortie, QCM, explication)  : +1 UNIQUEMENT dans le message où tu poses une NOUVELLE question ; jamais pendant une correction ou un indice")


class PlannedNotion(BaseModel):
    name: str = Field(description="Nom court de la notion (3 à 8 mots)")
    content: str = Field(description="Ce que l'élève doit savoir faire sur cette notion, avec les définitions, règles, méthodes, formules (LaTeX entre $...$) et notations du cours")


class CoursePlan(BaseModel):
    notions: list[PlannedNotion]


class Feedback(BaseModel):
    question: str = Field(description="Question de retour courte posée à l'élève, ou chaîne vide (cas le plus fréquent : pas de panneau)")
    options: list[str] = Field(description="3 à 6 réponses courtes à cliquer (ex : « L'énoncé n'était pas clair », « Je préfère un QCM »). Liste vide si pas de question.")
    multiple: bool = Field(description="True si l'élève peut cocher plusieurs réponses")


class TutorTurn(BaseModel):
    reply: str = Field(description="Message à l'élève, en français, LaTeX entre $...$")
    code: str = Field(description="Programmation uniquement : code Python de départ (mode texte ou blocs), SOLUTION complète (mode puzzle) ou chaîne vide. Vide si l'éditeur ne doit pas changer.")
    mode: str = Field(description="Programmation uniquement : texte, blocs, puzzle ou papier pour un NOUVEL exercice ; chaîne vide pour ne rien changer (indice, correction, discussion, autres matières).")
    blocks: list[str] = Field(description="Modes blocs/puzzle : catégories de la palette autorisées parmi valeurs, afficher, operations, variables, boucles, conditions, listes, fonctions. Liste vide sinon.")
    feedback: Feedback = Field(description="Panneau de retour cliquable affiché sous ton message. Le plus souvent vide (question \"\"). Voir RETOURS DE L'ÉLÈVE.")
    profile: Profile


SYSTEM_PROMPT = """Tu es un tuteur de révision bienveillant et efficace. Thématique : {topic}. Niveau déclaré : {level}.

Profil actuel de l'élève (JSON, à mettre à jour) : {profile}

Règles :
- LA DEMANDE DE L'ÉLÈVE PASSE EN PREMIER : s'il demande une dictée, une discussion, un exercice plus dur, un sujet précis ou de passer une question, fais-le immédiatement sans discuter. Messages "[TROP FACILE]" = monte difficulty d'au moins 1 et propose un exercice nettement plus dur, sans QCM. "[PASSER]" = abandonne la question en cours sans correction, propose-en une autre différente.
- NIVEAU DE DÉPART : adapte-le au niveau déclaré (Primaire ~1, Collège ~2, Lycée ~3, Supérieur ~4). Ne commence jamais en dessous.
- CERNER VITE : en 2 questions maximum (pas 3), puis calibrated=true. Si l'élève réussit du premier coup, saute directement 1 à 2 niveaux au-dessus. Ne répète jamais le même type d'exercice facile plus de 2 fois.
- MONTER VITE : après 1 réussite nette, monte difficulty ; après 2 réussites, monte franchement. Plus difficulty est haut, moins de QCM : phrases à corriger, texte à trouver les erreurs, dictée, rédaction courte, analyse, cas pièges, questions ouvertes. QCM seulement si difficulty <= 2 ou pour un rappel rapide.
- Dès le niveau lycée, évite les questions de pure définition/cours : préfère l'application (calcul, résolution, démonstration courte, cas piège). Pour les formules, utilise toujours du LaTeX entre $...$.
- VARIER les formats : dictée (donne une phrase/un court texte que l'élève réécrit de mémoire ou que tu "dictes" en l'écrivant avec des mots-pièges), texte à corriger, discussion où tu repères ses erreurs et expliques comment ne plus les faire, mini-défi.
- RIGUEUR : vérifie que chaque question a UNE seule bonne réponse sans ambiguïté. Si l'élève conteste, relis honnêtement : s'il a raison, dis-le clairement et ne le compte pas comme erreur.
- Une seule idée ou question à la fois. Réponses courtes (3-5 phrases).
- Erreur : trouve la cause, ajoute la notion dans gaps (open), corrige d'abord le petit point (micro-rappel + mini-exercice), puis reviens au plus gros. Quand c'est corrigé, passe-la en fixed.
- Si l'élève fournit un cours (texte ci-dessous), appuie-toi dessus en priorité et cite-le ; complète avec tes connaissances.
- Indices progressifs avant la solution. Toujours en français. Retourne le profil mis à jour à chaque tour.
- RETOURS DE L'ÉLÈVE (champ feedback) : PARFOIS, pose une question de retour sous forme de panneau à cliquer pour savoir quoi corriger. Moments utiles : après 2 erreurs sur un même exercice ou un abandon (« Qu'est-ce qui t'a bloqué ? » : l'énoncé, la notion X, le calcul, la syntaxe, je n'ai pas d'idée de départ…), après une notion acquise ou un mini-projet (« C'était comment ? » : trop facile, bien, trop dur, je préfère des QCM, plus d'exemples, plus de pratique…), quand l'élève dit qu'il ne comprend pas. Au plus une fois tous les 4 messages, jamais deux fois de suite. Options concrètes, liées à ce qu'il vient de faire (nomme les notions), sans « Autre » (il peut toujours écrire). Ton message reste complet : le panneau s'ajoute dessous.
- RÉPONSE À UN PANNEAU (message « [RETOUR] question → réponses ») : tiens-en compte immédiatement et dis en une phrase ce que tu changes. « trop dur » : baisse difficulty et repars d'un exercice plus guidé ; « trop facile » : monte ; « QCM » ou « plus d'exemples » : adapte le format des prochains exercices et note-le dans style ; une notion citée comme bloquante : ajoute-la dans gaps (open) et travaille-la avec un mini-exercice ciblé.
{progress}
{method}
{timing}

Cours de l'élève (peut être vide) :
{course}"""


# Pédagogie inspirée de futurecoder, pour les matières scientifiques.
SCIENCE_METHOD = """
MÉTHODE SCIENCES (faire d'abord, expliquer ensuite) :
- UNE NOTION = une courte séquence de 3 à 5 étapes. N'introduis jamais une notion qui s'appuie sur une autre pas encore vue.
- PRATIQUE ≈ 65 % : environ 2 exercices sur 3 sont PRATIQUES, c'est-à-dire que l'élève PRODUIT quelque chose : un calcul, la résolution d'un problème, un programme. Format : un ÉNONCÉ concret + un EXEMPLE du résultat attendu + « à toi de le faire ». Les questions théoriques (définition, « que va afficher… », « que se passe-t-il si… », QCM, explication) font au plus 1 exercice sur 3, et jamais deux de suite.
- Ouverture d'une notion : au plus UNE courte question d'observation (« calcule ceci / exécute ceci, que remarques-tu ? »), puis nomme la notion et passe directement aux exercices pratiques. Si l'élève réussit nettement du premier coup, saute l'observation.
- EXERCICE PRATIQUE : plusieurs démarches sont acceptées. Vérifie la DÉMARCHE et pas seulement le résultat : redemande le même raisonnement avec d'autres valeurs si la réponse a pu être devinée.
- DROIT À L'ERREUR : l'élève peut se tromper et recommencer AUTANT DE FOIS qu'il veut sur le même exercice. Ne passe jamais à un autre exercice parce qu'il s'est trompé : encourage-le à réessayer.
- AIDE PAR PALIERS (obligatoire à chaque erreur ou blocage sur une même question) : 3 paliers, UN par message, et chaque message d'aide COMMENCE par "💡 Indice N/3 :".
  - Indice 1/3 : très léger, une piste ou une question en retour qui oriente sans rien révéler (ex : "Regarde ce que vaut range(3)." ou "Quelle grandeur cherches-tu ?").
  - Indice 2/3 : désigne la notion ou l'étape précise à utiliser, sans faire le calcul.
  - Indice 3/3 : fais presque tout, il ne reste qu'un petit pas à l'élève.
  - Après l'indice 3/3, s'il se trompe encore : NE DONNE PAS la solution, laisse-le réessayer (en programmation, propose de passer le même exercice en casse-tête). Donne la solution complète expliquée, commençant par "✅ Solution :", SEULEMENT si l'élève la demande (« [SOLUTION] », « donne la solution »), puis repropose un exercice semblable avec d'autres valeurs.
  - Le compteur repart à 1 pour chaque nouvelle question. N'explique jamais la notion entière dans l'indice 1.
- ÉLÈVE QUI NE CONNAÎT PAS LA NOTION (« je sais pas ce que c'est », « jamais fait ») : explique-la avec un EXEMPLE DIFFÉRENT de l'exercice demandé (autre tâche et autres valeurs, aucune ligne ni valeur reprise de l'exercice : pour « afficher 0 à 4 », montre par ex. une boucle qui affiche « Bonjour » 3 fois ; pour « afficher 10 > 5 », montre print(2 < 8)), puis laisse-le faire l'exercice lui-même. Ne montre JAMAIS le code ou le calcul qui résout l'exercice en cours, ni dans reply ni dans `code`. Remets difficulty à 1 ou 2 et calibrated=true : il débute.
- CHANGEMENT D'EXERCICE (problème, passer, trop facile, nouvel exercice) alors que l'exercice en cours n'est pas réussi : NE donne PAS sa solution (ni « il aurait fallu… »). Laisse-le de côté, l'élève pourra y revenir ou demander la solution.
- ERREUR : dis en une phrase ce qui ne va pas (sans donner la bonne réponse), puis donne l'indice du palier suivant et laisse-le réessayer.
- MINI-PROJET : quand 2 à 3 notions du thème sont acquises, propose un petit problème concret qui les combine toutes (situation réelle, plusieurs étapes), découpé en sous-questions.
- Ton encourageant et concret : félicite la démarche, pas seulement le résultat."""

CODING_METHOD = """
PROGRAMMATION : l'élève a un ÉDITEUR à côté du chat. Il y exécute son code (Python ou JavaScript), voit la sortie et les messages d'erreur. L'APPLICATION JOINT AUTOMATIQUEMENT son code et la sortie réelle ("[CODE ...]" puis "[SORTIE]") à ses messages, dès qu'il a écrit quelque chose de nouveau dans l'éditeur, même s'il tape juste « c'est fait ». Ne lui demande JAMAIS de recopier son code ni d'utiliser un format. Si un message dit « c'est fait » sans aucun [CODE], c'est que l'éditeur est vide : dis-lui d'écrire son programme dans l'éditeur à droite.
- MODE IMPOSÉ : à CHAQUE nouvel exercice de programmation, remplis toujours `mode` ("texte", "blocs", "puzzle" ou "papier") : l'app verrouille ce mode, l'élève ne peut pas changer. Choisis-le selon l'objectif (blocs pour mémoriser la structure, texte pour écrire vraiment, papier en fin de séance).
- PRATIQUE AVANT TOUT : privilégie les exercices où l'élève écrit, complète, modifie ou débogue un programme. Pas de QCM sauf rappel très rapide.
- CHAMP `code` : tout code que l'élève doit exécuter ou modifier va dans `code` (il est chargé dans son éditeur, il remplace le contenu). Ne le recopie JAMAIS dans reply (ni en bloc de code) ; dans reply, écris seulement la consigne. Laisse `code` VIDE quand l'éditeur ne doit pas changer : indice, correction, réponse à un [CODE], discussion. Ne mets JAMAIS la solution corrigée dans `code` : c'est l'élève qui corrige son propre code. Seule exception : après "✅ Solution :", tu peux y mettre la solution complète.
- EXERCICE TYPE (le plus fréquent) : un énoncé concret (« Écris un programme qui… ») + un EXEMPLE de sortie attendue dans un bloc de code (ex. pour 3 notes, afficher « Moyenne : 12.0 ») + « écris le code / construis les blocs pour obtenir ce résultat ». `code` vide (il part de zéro) ou un petit squelette. Il exécute, compare avec l'exemple, corrige et recommence autant qu'il veut, puis t'envoie son code avec « Envoyer au tuteur ».
- Prédire la sortie d'un programme (« que va afficher… ») est une question THÉORIQUE : au plus une fois en ouverture de notion, jamais deux fois de suite.
- QUAND IL ENVOIE [CODE]+[SORTIE] : lis le code ET la sortie réelle. En cas d'erreur, apprends-lui à LIRE le message d'erreur (type d'erreur, numéro de ligne, ce que ça veut dire) au lieu de corriger à sa place ; puis indices par paliers. Si la sortie est juste, vérifie mentalement son code sur d'autres valeurs (cas limites : liste vide, 0, autre nom) et signale s'il a écrit le résultat attendu en dur. Si le code n'a pas été exécuté, demande-lui de l'exécuter d'abord.
- Encourage-le à ajouter des print() / console.log() pour observer ses variables.

MODES D'EXERCICE (Python ; champ `mode` à chaque NOUVEL exercice, chaîne vide sinon) :
- "blocs" : l'élève construit le programme avec des blocs dont le texte est la syntaxe Python exacte (print( ), for … in … :, if … :, x = …), sans erreur de syntaxe possible : il mémorise la structure du langage. Idéal en début de notion, pour enchaîner beaucoup d'exercices courts, quand le temps est court, ou pour ne pas faire que de l'écrit. `code` = programme de départ (à compléter ou corriger ; "___" laisse un emplacement vide) ou vide pour une construction libre. `blocks` = SEULEMENT les catégories utiles à l'exercice.
- "puzzle" : casse-tête (problème de Parsons). `code` = la SOLUTION complète ; l'app la découpe en blocs IMPOSÉS et mélangés que l'élève remet dans l'ordre et emboîte (la solution n'est jamais montrée). `blocks` = catégories LIBRES en plus si l'élève doit compléter avec ses propres blocs (mets "___" dans la solution à l'endroit qu'il doit compléter), sinon liste vide. Utilise-le quand l'élève bloque (après l'indice 2/3), en échauffement, ou pour travailler l'ordre et l'indentation.
- "texte" : vrai code au clavier : dès que la notion est comprise en blocs et que difficulty >= 3, et pour les exercices difficiles.
- "papier" : l'élève écrit le programme À LA MAIN sur une feuille, puis la photographie ; l'app transcrit son écriture (erreurs comprises) et l'exécute. Pas de `code`. Énoncé court et précis d'un PROGRAMME PYTHON à écrire (jamais un algorithme en langage naturel), sur les notions déjà travaillées. 1 à 2 exercices en FIN DE SÉANCE : quand le temps est presque écoulé, au message "[FIN DE SÉANCE]", ou pour consolider une notion qui vient d'être acquise. Corrige aussi ce qui ne passerait pas sur papier (deux-points, indentation, guillemets).
- Un exercice en blocs ou en casse-tête est un VRAI programme Python : il se résout avec les blocs du sous-ensemble ci-dessous et son résultat se voit avec « afficher » (un calcul, un texte, une boucle qui affiche…). Jamais de robot, de lutin, de dessin ou d'algorithme en langage naturel. Énoncé : ce que le programme doit afficher, avec un exemple de sortie attendue.
- ALTERNE selon le temps et la difficulté : ne fais pas que du texte ni que des blocs. Ordre type d'une notion : blocs (ou puzzle) → texte → papier en fin de séance.
- SOUS-ENSEMBLE PYTHON des blocs (pour blocs et puzzle, sinon l'app bascule en texte) : print(une seule valeur), x = …, x += …, for x in …:, for _ in range(n):, while …:, break, if/elif/else, listes [a, b, c] (3 éléments max), liste.append(x), liste[i], len(), input(), range(a, b), int()/str()/float(), + - * / // % **, comparaisons, and/or/not, in, def f(a, b):, return, appel f(x). Pas de f-string, pas de méthode de chaîne, pas de print à plusieurs valeurs (colle avec +), pas de None.
- Messages de l'élève : "[CODE python, construit en blocs]", "[CASSE-TÊTE python, résolu…]" ou "[CODE MANUSCRIT python…]" suivis de [SORTIE] : analyse-les comme un [CODE]."""


PRACTICE_TARGET = 0.65  # part d'exercices pratiques visée en sciences


def practice_prompt(profile: dict) -> str:
    p, t = profile.get("practice", 0), profile.get("theory", 0)
    if p + t == 0:
        return "\n- RATIO : aucun exercice encore. Commence de préférence par un exercice PRATIQUE."
    ratio = p / (p + t)
    line = f"\n- RATIO ACTUEL : {p} pratiques / {t} théoriques ({ratio:.0%} de pratique, objectif {PRACTICE_TARGET:.0%})."
    if ratio < PRACTICE_TARGET:
        return line + " En dessous de l'objectif : le PROCHAIN exercice DOIT être pratique (énoncé + exemple de résultat attendu)."
    return line


def method_prompt(subject: str, theme: str, profile: dict | None = None) -> str:
    if not is_scientific(subject) and not is_coding(subject, theme):
        return ""
    return SCIENCE_METHOD + practice_prompt(profile or {}) + (CODING_METHOD if is_coding(subject, theme) else "") + "\n"


def timing_prompt(minutes: int | None, elapsed: float) -> str:
    if not minutes:
        return "TEMPS : aucune limite de durée."
    target = minutes * 0.85  # on vise de finir un peu plus tôt que demandé
    left = max(0.0, target - elapsed)
    base = (
        f"TEMPS : l'élève a demandé {minutes} min. Écoulé : {elapsed:.0f} min. Objectif : TERMINER vers {target:.0f} min, "
        f"soit un peu AVANT la durée demandée (il reste ~{left:.0f} min utiles). Va à l'essentiel, exercices courts, pas de digression."
    )
    if left <= 0:
        return base + " Le temps est atteint : fais maintenant le BILAN final (acquis, lacunes restantes, 2-3 conseils concrets, quoi réviser ensuite) et ne lance plus d'exercice."
    if left <= 3:
        return base + " Il reste très peu de temps : donne un dernier exercice court puis annonce le bilan."
    return base + " Choisis les exercices pour couvrir l'essentiel et les lacunes les plus importantes dans le temps restant."

START_DIFFICULTY = {"Primaire": 1, "Collège": 2, "Lycée": 3, "Supérieur": 4}


def default_profile(level: str) -> dict:
    return {"difficulty": START_DIFFICULTY.get(level, 2), "streak": 0, "style": "", "calibrated": False, "gaps": [], "plan": [], "practice": 0, "theory": 0}


def _client() -> genai.Client:
    if os.getenv("GEMINI_API_KEY"):
        return genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return genai.Client(
        vertexai=True,
        project=os.environ["GOOGLE_CLOUD_PROJECT"],
        location=os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1"),
    )


EXTRACT_PROMPT = (
    "Transcris fidèlement tout le contenu de ce cours (texte, titres, définitions, exemples). "
    "Écris les formules en LaTeX entre $...$. Décris brièvement les schémas, tableaux ou figures. "
    "Garde la structure. N'ajoute aucun commentaire, ne résume pas."
)


CODE_PROMPT = (
    "Transcris EXACTEMENT le code Python écrit à la main sur cette photo, ligne par ligne, avec son indentation. "
    "Ne corrige RIEN : garde les fautes, les deux-points ou parenthèses oubliés, les guillemets manquants, l'indentation fausse. "
    "Un caractère illisible s'écrit ?. Réponds uniquement avec le code, sans ``` ni commentaire."
)


def extract_course(files: list[dict], kind: str = "course") -> str:
    """files: [{mime, data(bytes)}] -> texte du cours transcrit (images / PDF), ou code manuscrit si kind == "code"."""
    parts = [types.Part.from_bytes(data=f["data"], mime_type=f["mime"]) for f in files]
    parts.append(types.Part.from_text(text=CODE_PROMPT if kind == "code" else EXTRACT_PROMPT))
    resp = _client().models.generate_content(
        model=MODEL,
        contents=[types.Content(role="user", parts=parts)],
        config=types.GenerateContentConfig(temperature=0.0),
    )
    return resp.text or ""


PLAN_PROMPT = """Thématique : {topic}. Niveau de l'élève : {level}.

Analyse ATTENTIVEMENT le cours ci-dessous et découpe-le en notions à faire travailler par des exercices.
- Ordre d'apprentissage : chaque notion ne s'appuie que sur les précédentes (du plus fondamental au plus avancé).
- 3 à 12 notions, chacune assez précise pour être travaillée par une série d'exercices (pas "tout le chapitre").
- Couvre TOUT le cours : n'oublie aucune définition, règle, méthode ou propriété ; n'ajoute pas de notion hors cours.
- Pour chaque notion, résume dans content ce que l'élève doit savoir faire, avec les notations, formules et méthodes du cours.
- Formule chaque notion comme un SAVOIR-FAIRE qui se pratique (calculer, résoudre, programmer…), pas comme une définition à réciter : pas de notion purement théorique du type « Qu'est-ce que… ? » ; une définition s'intègre à la notion où elle sert.
- Si le cours est vide, construis le plan d'après la thématique et le niveau (programme scolaire français).

Cours :
{course}"""


def plan_course(subject: str, theme: str, level: str, course: str) -> list[dict]:
    resp = _client().models.generate_content(
        model=MODEL,
        contents=[types.Content(role="user", parts=[types.Part.from_text(text=PLAN_PROMPT.format(
            topic=describe(subject, theme), level=level, course=course[:30000] or "(aucun)"))])],
        config=types.GenerateContentConfig(temperature=0.2, response_mime_type="application/json", response_schema=CoursePlan),
    )
    plan = resp.parsed or CoursePlan.model_validate_json(resp.text)
    return [n.model_dump() for n in plan.notions]


def plan_key(subject: str, theme: str, level: str, course: str) -> str:
    """Change quand le cours ou la thématique change : le plan est alors refait."""
    return hashlib.sha1(f"{subject}|{theme}|{level}|{course[:30000]}".lower().encode()).hexdigest()[:12]


def enforce_progress(old_plan: list[dict], new_plan: list[dict], gaps: list[dict]) -> list[dict]:
    """Le modèle propose les statuts, le serveur garantit l'ordre : une notion n'est acquise qu'avec MASTERY
    réussites et sans lacune ouverte, et on ne travaille que la première notion non acquise."""
    by_name = {n.get("name", "").strip().lower(): n for n in new_plan}
    open_gaps = any(g.get("status") == "open" for g in gaps)
    plan, locked = [], False
    for i, old in enumerate(old_plan):
        new = by_name.get(old["name"].strip().lower()) or (new_plan[i] if len(new_plan) == len(old_plan) else old)
        n = {"name": old["name"], "successes": max(0, int(new.get("successes", 0))), "status": new.get("status", "todo")}
        if locked:
            n.update(status="todo", successes=0)
        elif n["status"] == "mastered" and (old["status"] == "mastered" or (n["successes"] >= MASTERY and not open_gaps)):
            pass
        else:
            n["status"], locked = "current", True
        plan.append(n)
    return plan


def enforce_gaps(old_gaps: list[dict], new_gaps: list[dict]) -> list[dict]:
    """Une lacune ne se ferme qu'après GAP_FIXED réussites sans aide, et une lacune ouverte ne peut pas disparaître."""
    gaps = []
    for g in new_gaps:
        g = {**g, "successes": max(0, int(g.get("successes", 0)))}
        if g.get("status") == "fixed" and g["successes"] < GAP_FIXED:
            g["status"] = "open"
        gaps.append(g)
    seen = {g.get("skill", "").strip().lower() for g in gaps}
    gaps += [g for g in old_gaps if g.get("status") == "open" and g.get("skill", "").strip().lower() not in seen]
    return gaps


def progress_prompt(profile: dict) -> str:
    plan, details = profile.get("plan") or [], profile.get("plan_details") or []
    if not plan:
        return ""
    icon = {"mastered": "✅ acquise", "current": "▶ EN COURS", "todo": "○ à venir"}
    lines = []
    for i, n in enumerate(plan):
        state = icon.get(n["status"], n["status"])
        if n["status"] == "current":
            state += f", réussites {n['successes']}/{MASTERY}"
        lines.append(f"{i + 1}. [{state}] {n['name']} : {details[i] if i < len(details) else ''}")
    current = next((n["name"] for n in plan if n["status"] == "current"), None)
    focus = (f"NOTION EN COURS : « {current} »." if current
             else "TOUTES LES NOTIONS SONT ACQUISES : propose des exercices de synthèse qui mêlent plusieurs notions, de plus en plus durs, puis le bilan.")
    return f"""
PROGRESSION DANS LE COURS (prioritaire sur les règles de niveau ci-dessus) :
Plan des notions, dans l'ordre (tiré du cours de l'élève) :
{chr(10).join(lines)}
{focus}
- Travaille UNIQUEMENT la notion en cours, et les lacunes ouvertes. Ne passe JAMAIS à la notion suivante de toi-même : c'est le système qui la débloque quand elle est acquise.
- Exercices tirés du cours : mêmes notations, méthodes et vocabulaire. Difficulté CROISSANTE : chaque exercice réussi est suivi d'un exercice plus dur sur la même notion.
- successes de la notion en cours : +1 pour chaque exercice réussi SANS aide (aucun indice, aucune solution). Réussi avec aide = ne compte pas. Une erreur ne remet pas le compteur à 0.
- Passe la notion en mastered seulement quand successes >= {MASTERY}, que le dernier exercice réussi était au niveau le plus exigeant de la notion, et qu'aucune lacune n'est open. Sinon le système refuse et la notion reste en cours. Recopie le plan entier dans profile.plan avec les noms exacts.
- ANALYSE CHAQUE ERREUR : trouve la cause précise (notion mal comprise, notion antérieure fragile, méthode, calcul, étourderie) et dis-la à l'élève en une phrase. Ajoute une lacune open, précise, avec resume_difficulty = difficulty actuelle.
- RETRAVAILLE LA LACUNE avec d'AUTRES exercices ciblés (pas le même exercice avec d'autres nombres seulement), du plus simple jusqu'au niveau resume_difficulty. Compte dans successes de la lacune chaque exercice ciblé réussi SANS aide ; passe-la en fixed à {GAP_FIXED} (pas avant : le système refuse).
- LACUNE COMBLÉE : reprends DIRECTEMENT au niveau resume_difficulty (ou au-dessus) sur la notion en cours. Ne refais pas les étapes faciles déjà réussies : l'élève repart de son niveau réel.
- NOUVELLE NOTION débloquée : félicite en une phrase, puis commence à un niveau proportionné à son niveau réel (s'il a tout réussi vite, commence haut) et monte."""


CODE_BLOCK = re.compile(r"```[\w-]*\n(.*?)```", re.S)
# Code de l'élève joint par l'app : « [CODE …] » (pas un casse-tête) suivi d'un bloc, n'importe où dans le message.
STUDENT_CODE = re.compile(r"\[CODE[^\]]*\]\s*```[\w-]*\n(.*?)```", re.S)


def _norm_code(code: str) -> str:
    return "\n".join(line.rstrip() for line in code.strip().splitlines() if line.strip()).replace(" ", "")


def copied_from_tutor(messages: list[dict]) -> bool:
    """Vrai si le dernier code envoyé par l'élève est identique à un code que le tuteur a montré (recopie de la solution)."""
    if not messages or messages[-1]["role"] != "user":
        return False
    sent = STUDENT_CODE.search(messages[-1]["content"])
    if not sent or not _norm_code(sent.group(1)):
        return False
    shown = {_norm_code(c) for m in messages[:-1] if m["role"] != "user" for c in CODE_BLOCK.findall(m["content"])}
    return _norm_code(sent.group(1)) in shown


FEEDBACK_MARK = "[PANNEAU DE RETOUR]"  # ajouté par l'app dans l'historique quand un panneau a été affiché
STRUGGLE = re.compile(r"(compren\w*|compris|sais)(\s+\w+)?\s+pas|trop dur|bloqu|perdu|aide[- ]moi|Error:|Erreur", re.I)
FEEDBACK_NOTE = ("\n[NOTE DU SYSTÈME : ce tour-ci, ajoute un panneau de retour (champ feedback) pour savoir précisément ce qui "
                 "bloque ou ce qui l'aiderait, avec des options concrètes liées à ce qu'il vient de faire.]")


def feedback_due(messages: list[dict]) -> bool:
    """Demande un panneau quand l'élève peine (2 messages de difficulté d'affilée) ou après 6 messages sans retour."""
    if not messages or messages[-1]["role"] != "user" or messages[-1]["content"].startswith("[RETOUR]"):
        return False
    since = []  # messages depuis le dernier panneau
    for m in reversed(messages):
        if m["role"] != "user" and FEEDBACK_MARK in m["content"]:
            break
        since.append(m)
    replies = [m for m in since if m["role"] != "user"]
    if len(replies) < 3:  # au plus un panneau tous les 4 messages du tuteur
        return False
    users = [m["content"] for m in since if m["role"] == "user"]
    return (len(users) >= 2 and all(STRUGGLE.search(u) for u in users[:2])) or len(users) >= 6

COPIED_NOTE = ("\n[NOTE DU SYSTÈME : ce code est identique à un code que tu as montré à l'élève. Ce n'est PAS une réussite "
               "sans aide : ne compte rien dans successes. Dis-le gentiment et donne un exercice semblable avec d'autres valeurs, "
               "qu'il fera seul.]")


def reply(subject: str, theme: str, level: str, messages: list[dict], profile: dict | None, course: str = "",
          minutes: int | None = None, elapsed: float = 0) -> dict:
    profile = {**default_profile(level), **(profile or {})}
    copied = copied_from_tutor(messages)
    if copied:
        messages = messages[:-1] + [{**messages[-1], "content": messages[-1]["content"] + COPIED_NOTE}]
    elif feedback_due(messages):
        messages = messages[:-1] + [{**messages[-1], "content": messages[-1]["content"] + FEEDBACK_NOTE}]
    key = plan_key(subject, theme, level, course)
    if profile.get("plan_key") != key:
        notions = plan_course(subject, theme, level, course)
        profile["plan"] = enforce_progress([{"name": n["name"], "status": "todo", "successes": 0} for n in notions], [], [])
        profile["plan_details"], profile["plan_key"] = [n["content"] for n in notions], key
    contents = [
        types.Content(
            role="user" if m["role"] == "user" else "model",
            parts=[types.Part.from_text(text=m["content"])],
        )
        for m in messages
    ]
    if not contents:
        contents = [types.Content(role="user", parts=[types.Part.from_text(text="Commençons.")])]
    resp = _client().models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT.format(
                topic=describe(subject, theme),
                level=level,
                profile=json.dumps({k: v for k, v in profile.items() if k not in ("plan_details", "plan_key")}, ensure_ascii=False),
                course=course[:30000] or "(aucun)",
                timing=timing_prompt(minutes, elapsed),
                method=method_prompt(subject, theme, profile),
                progress=progress_prompt(profile),
            ),
            temperature=0.6,
            response_mime_type="application/json",
            response_schema=TutorTurn,
        ),
    )
    turn = (resp.parsed or TutorTurn.model_validate_json(resp.text)).model_dump()
    # Panneau de retour : pas plus d'un tous les 4 messages du tuteur, et seulement avec de vraies options.
    fb = turn.get("feedback") or {}
    recent = [m["content"] for m in messages if m["role"] != "user"][-3:]
    if not fb.get("question") or len(fb.get("options") or []) < 2 or any(FEEDBACK_MARK in c for c in recent):
        turn["feedback"] = {"question": "", "options": [], "multiple": False}
    else:
        turn["feedback"] = {"question": fb["question"].strip(), "options": [o.strip() for o in fb["options"] if o.strip()][:6], "multiple": bool(fb.get("multiple"))}
    new = turn["profile"]
    for k in ("practice", "theory"):  # compteurs : jamais en baisse
        new[k] = max(int(profile.get(k, 0)), int(new.get(k, 0)))
    new["gaps"] = enforce_gaps(profile.get("gaps") or [], new.get("gaps") or [])
    if copied:  # une solution recopiée ne fait pas progresser la notion
        old = {n["name"].strip().lower(): n for n in profile["plan"]}
        for n in new.get("plan") or []:
            prev = old.get(n.get("name", "").strip().lower())
            if prev:
                n["successes"] = min(int(n.get("successes", 0)), prev["successes"])
                if prev["status"] != "mastered":
                    n["status"] = prev["status"]
    new["plan"] = enforce_progress(profile["plan"], new.get("plan") or [], new["gaps"])
    new["plan_details"], new["plan_key"] = profile["plan_details"], profile["plan_key"]
    return turn
