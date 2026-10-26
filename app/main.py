import base64
import os
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import tutor
from .subjects import LEVELS, SUBJECTS

app = FastAPI(title="IA School")

ACCESS_CODE = os.getenv("ACCESS_CODE", "")


def check_access(x_access_code: str = Header(default="")):
    if ACCESS_CODE and x_access_code != ACCESS_CODE:
        raise HTTPException(status_code=401, detail="Code d'accès invalide")


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    subject: str
    theme: str
    level: str = "Collège"
    messages: list[Message] = []
    profile: dict | None = None
    course: str = ""
    minutes: int | None = None  # durée souhaitée (facultatif)
    elapsed: float = 0  # minutes écoulées depuis le début


@app.get("/api/subjects", dependencies=[Depends(check_access)])
def subjects():
    return {"subjects": SUBJECTS, "levels": LEVELS}


class FileIn(BaseModel):
    mime: str
    data: str  # base64


class ExtractRequest(BaseModel):
    files: list[FileIn]
    kind: str = "course"  # "code" : code Python écrit à la main


ALLOWED_MIME = {"application/pdf", "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


@app.post("/api/extract", dependencies=[Depends(check_access)])
def extract(req: ExtractRequest):
    if not req.files or len(req.files) > 10:
        raise HTTPException(status_code=400, detail="1 à 10 fichiers")
    files = []
    for f in req.files:
        if f.mime not in ALLOWED_MIME:
            raise HTTPException(status_code=400, detail=f"Type non supporté : {f.mime}")
        try:
            files.append({"mime": f.mime, "data": base64.b64decode(f.data)})
        except Exception:
            raise HTTPException(status_code=400, detail="Fichier illisible")
    try:
        return {"text": tutor.extract_course(files, req.kind)}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erreur IA : {e}")


@app.post("/api/chat", dependencies=[Depends(check_access)])
def chat(req: ChatRequest):
    if not req.subject.strip() or not req.theme.strip():
        raise HTTPException(status_code=400, detail="Matière et thématique requises")
    try:
        return tutor.reply(
            req.subject, req.theme, req.level, [m.model_dump() for m in req.messages], req.profile, req.course,
            req.minutes, req.elapsed,
        )
    except Exception as e:  # erreur Vertex / config
        raise HTTPException(status_code=502, detail=f"Erreur IA : {e}")


app.mount("/", StaticFiles(directory=Path(__file__).parent.parent / "static", html=True), name="static")
