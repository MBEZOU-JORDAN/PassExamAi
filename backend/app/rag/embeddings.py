import logging
import asyncio
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from app.core.config import settings
from app.schemas.documents import DocumentChunk

logger = logging.getLogger(__name__)

EMBEDDING_MODEL = "jina-embeddings-v3"
EMBEDDING_DIMENSIONS = 768      # Matryoshka → zéro migration SQL
EMBEDDING_BATCH_SIZE = 50
JINA_URL = "https://api.jina.ai/v1/embeddings"


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10),
)
async def _embed_batch(texts: list[str], task: str = "retrieval.passage") -> list[list[float]]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            JINA_URL,
            headers={
                "Authorization": f"Bearer {settings.jina_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": EMBEDDING_MODEL,
                "input": texts,
                "dimensions": EMBEDDING_DIMENSIONS,
                "task": task,
            },
        )
        response.raise_for_status()
        data = response.json()
        items = sorted(data["data"], key=lambda x: x["index"])
        return [item["embedding"] for item in items]


async def get_embeddings(texts: list[str]) -> list[list[float]]:
    """Stockage RAG — task: retrieval.passage"""
    if not texts:
        return []
    all_embeddings: list[list[float]] = []
    for i in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[i : i + EMBEDDING_BATCH_SIZE]
        logger.info("Embedding batch %d (%d textes) via Jina v3...",
                    i // EMBEDDING_BATCH_SIZE + 1, len(batch))
        embeddings = await _embed_batch(batch, task="retrieval.passage")
        all_embeddings.extend(embeddings)
    logger.info("✅ %d embeddings générés (dim=%d)", len(all_embeddings), EMBEDDING_DIMENSIONS)
    return all_embeddings


async def get_query_embedding(query: str) -> list[float]:
    """Requête de recherche — task: retrieval.query (meilleure précision)"""
    result = await _embed_batch([query], task="retrieval.query")
    return result[0]


async def embed_chunks(chunks: list[DocumentChunk]) -> list[DocumentChunk]:
    if not chunks:
        return []
    texts = [chunk.content for chunk in chunks]
    embeddings = await get_embeddings(texts)
    for chunk, embedding in zip(chunks, embeddings):
        chunk.embedding = embedding
    return chunks