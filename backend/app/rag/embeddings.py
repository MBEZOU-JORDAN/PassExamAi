import logging
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log
from app.core.config import settings
from app.schemas.documents import DocumentChunk

logger = logging.getLogger(__name__)

# ── Init client (nouveau SDK) ────────────────────────────────
from google import genai
from google.genai import types as genai_types

_client = genai.Client(api_key=settings.gemini_api_key)

EMBEDDING_BATCH_SIZE = 50         # Limite safe Gemini API
EMBEDDING_MODEL = "models/text-embedding-004"   # 768 dim, stable — préfixe models/ requis


# ── Core batch embed ────────────────────────────────────────

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
    before_sleep=before_sleep_log(logger, logging.WARNING),
    reraise=True,
)
async def _embed_batch(texts: list[str], task_type: str = "RETRIEVAL_DOCUMENT") -> list[list[float]]:
    """
    Appelle l'API Gemini Embeddings pour un batch.
    Exécuté dans un thread (SDK sync) pour ne pas bloquer l'event loop.
    """
    def _sync():
        result = _client.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=texts,
            config=genai_types.EmbedContentConfig(task_type=task_type),
        )
        # result.embeddings est une liste d'objets ContentEmbedding
        return [e.values for e in result.embeddings]

    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _sync)


# ── Public API ──────────────────────────────────────────────

async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Génère des embeddings Gemini pour une liste de textes (stockage RAG).
    Retourne une liste de vecteurs 768 dimensions.
    """
    if not texts:
        return []

    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[i : i + EMBEDDING_BATCH_SIZE]
        logger.info(
            "Embedding batch %d (%d textes) via Gemini...",
            i // EMBEDDING_BATCH_SIZE + 1,
            len(batch),
        )
        embeddings = await _embed_batch(batch, task_type="RETRIEVAL_DOCUMENT")
        all_embeddings.extend(embeddings)

    logger.info("✅ %d embeddings générés (dim=768)", len(all_embeddings))
    return all_embeddings


async def get_query_embedding(query: str) -> list[float]:
    """
    Embedding pour une requête de recherche.
    task_type RETRIEVAL_QUERY améliore la précision vs RETRIEVAL_DOCUMENT.
    """
    result = await _embed_batch([query], task_type="RETRIEVAL_QUERY")
    return result[0]


async def embed_chunks(chunks: list[DocumentChunk]) -> list[DocumentChunk]:
    """Génère les embeddings pour tous les chunks et les attache."""
    if not chunks:
        return []

    texts = [chunk.content for chunk in chunks]
    embeddings = await get_embeddings(texts)

    for chunk, embedding in zip(chunks, embeddings):
        chunk.embedding = embedding

    return chunks