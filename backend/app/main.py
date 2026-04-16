from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.api.v1 import documents, roadmap, chapters, exam, progress, projects, sources
import logging

logger = logging.getLogger(__name__)

app = FastAPI(
    title="PassExamAI Backend",
    description="AI-powered exam preparation platform — GCD4F 2026",
    version="1.0.0",
)

# ── CORS ────────────────────────────────────────────────────
# On liste explicitement toutes les origines possibles en dev.
# En prod, remplacer par l'URL Vercel exacte.
_allowed_origins = [
    settings.frontend_url,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global exception handler ────────────────────────────────
# Transforme toutes les exceptions non catchées en JSON 500 propre.
# Sans ça, FastAPI laisse les erreurs remonter comme HTML ou
# comme un crash ASGI invisible pour le frontend.
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception on %s %s : %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"},
    )

# ── Routers ─────────────────────────────────────────────────
app.include_router(projects.router,  prefix="/api/v1/projects",  tags=["Projects"])
app.include_router(documents.router, prefix="/api/v1/documents", tags=["Documents"])
app.include_router(roadmap.router,   prefix="/api/v1/roadmap",   tags=["Roadmap"])
app.include_router(chapters.router,  prefix="/api/v1/chapters",  tags=["Chapters"])
app.include_router(exam.router,      prefix="/api/v1/exam",      tags=["Exam"])
app.include_router(progress.router,  prefix="/api/v1/progress",  tags=["Progress"])
app.include_router(sources.router,   prefix="/api/v1/sources",   tags=["Sources"])


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "PassExamAI Backend"}