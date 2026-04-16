import logging
from typing import Optional
import fitz  # PyMuPDF

from app.core.config import settings
from app.db.supabase_client import supabase
from app.rag.chunking import chunk_text
from app.rag.embeddings import embed_chunks
from app.schemas.documents import DocumentChunk

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────
# 1. Parsing PDF
# ─────────────────────────────────────────────

async def _download_pdf_bytes_from_supabase(storage_url: str) -> bytes:
    """
    Télécharge les bytes du PDF directement via le client Supabase service-role.
    
    On extrait le storage_path depuis l'URL signée :
    https://<project>.supabase.co/storage/v1/object/sign/documents/<user_id>/...
    → storage_path = "<user_id>/..."
    
    Le client service-role bypasse le RLS et le bucket privé sans URL externe.
    """
    import re

    # Extrait le path après "/documents/"
    match = re.search(r"/documents/(.+?)(?:\?|$)", storage_url)
    if not match:
        raise ValueError(f"Impossible d'extraire le storage_path depuis : {storage_url}")

    storage_path = match.group(1)
    logger.info(f"Téléchargement Supabase storage: documents/{storage_path}")

    response = supabase.storage.from_("documents").download(storage_path)

    if not response:
        raise ValueError(f"Fichier vide ou introuvable: {storage_path}")

    logger.info(f"✅ PDF téléchargé depuis Supabase: {len(response)} bytes")
    return response


async def parse_pdf_llamaparse(storage_url: str) -> str:
    """
    Parse le PDF via LlamaParse (meilleure qualité : OCR, tableaux, formules).
    Utilisé en première priorité si LlamaParse est accessible.
    """
    from llama_parse import LlamaParse

    parser = LlamaParse(
        api_key=settings.llama_parse_api_key,
        result_type="markdown",
        verbose=False,
        language="en",
        system_prompt=(
            "Extract all text content. "
            "Preserve section titles and structure. "
            "Convert tables to markdown format. "
            "Keep mathematical formulas."
        ),
    )

    documents = await parser.aload_data(storage_url)

    if not documents:
        raise ValueError("LlamaParse n'a retourné aucun contenu")

    full_text = "\n\n".join(doc.text for doc in documents if doc.text)
    logger.info(f"LlamaParse OK — {len(full_text)} caractères extraits")
    return full_text


def parse_pdf_pymupdf(pdf_bytes: bytes) -> str:
    """
    Extraction texte via PyMuPDF.
    Fiable, rapide, fonctionne offline — aucune dépendance réseau externe.
    """
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts = []

    for page_num, page in enumerate(doc):
        text = page.get_text("text")
        if text.strip():
            text_parts.append(f"## Page {page_num + 1}\n\n{text}")

    full_text = "\n\n".join(text_parts)
    logger.info(f"PyMuPDF — {len(full_text)} caractères extraits ({len(doc)} pages)")
    return full_text


async def parse_pdf(storage_url: str) -> str:
    """
    Stratégie de parsing avec fallback automatique :
    1. Tente LlamaParse (meilleure qualité)
    2. Si échec → télécharge via Supabase service-role + PyMuPDF (toujours dispo)
    """
    # Tentative LlamaParse
    try:
        return await parse_pdf_llamaparse(storage_url)
    except Exception as e:
        logger.warning(
            f"LlamaParse indisponible ({type(e).__name__}: {e}) "
            f"→ Fallback PyMuPDF via Supabase storage"
        )

    # Fallback robuste : download via Supabase service-role
    try:
        pdf_bytes = await _download_pdf_bytes_from_supabase(storage_url)
        return parse_pdf_pymupdf(pdf_bytes)
    except Exception as e:
        logger.error(f"Fallback PyMuPDF aussi en échec: {e}")
        raise RuntimeError(
            f"Impossible de parser le PDF (LlamaParse + PyMuPDF ont échoué): {e}"
        )


# ─────────────────────────────────────────────
# 2. Stockage des chunks dans pgvector
# ─────────────────────────────────────────────

async def store_chunks_in_pgvector(
    chunks: list[DocumentChunk],
    document_id: str,
) -> int:
    if not chunks:
        return 0

    rows = []
    for chunk in chunks:
        if chunk.embedding is None:
            logger.warning(f"Chunk {chunk.metadata.chunk_index} sans embedding — ignoré")
            continue
        rows.append({
            "document_id": document_id,
            "chunk_index": chunk.metadata.chunk_index,
            "content": chunk.content,
            "embedding": chunk.embedding,
            "metadata": chunk.metadata.model_dump(),
        })

    if not rows:
        return 0

    batch_size = 50
    total_inserted = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        response = supabase.table("document_chunks").insert(batch).execute()
        total_inserted += len(response.data)

    logger.info(f"✅ {total_inserted} chunks stockés dans pgvector")
    return total_inserted


# ─────────────────────────────────────────────
# 3. Mise à jour du statut document
# ─────────────────────────────────────────────

def update_document_status(
    document_id: str,
    status: str,
    chunks_count: int = 0,
    error_message: Optional[str] = None,
) -> None:
    payload: dict = {"status": status}

    if chunks_count > 0:
        payload["chunks_count"] = chunks_count
    if error_message:
        # Tronque à 500 chars pour éviter les dépassements DB
        payload["error_message"] = error_message[:500]

    supabase.table("uploaded_documents").update(payload).eq(
        "id", document_id
    ).execute()

    logger.info(f"Document {document_id} → status: {status}")


# ─────────────────────────────────────────────
# 4. Pipeline COMPLET
# ─────────────────────────────────────────────

async def run_ingestion_pipeline(
    document_id: str,
    storage_url: str,
    project_id: str,
    source_type: str,
    filename: str,
) -> None:
    """
    Pipeline : storage_url → parse → chunk → embed → pgvector.
    Lancé en BackgroundTask — non bloquant.

    Statuts possibles :
     - parsing / chunking / embedding (en cours)
     - text_extracted  : texte OK, embeddings en attente ou échoués
     - ready           : pipeline complet (texte + embeddings)
     - failed          : parsing échoué, aucun texte extrait
    """
    logger.info(f"🚀 Ingestion démarrée: document_id={document_id}, file={filename}")

    # ══════════════════════════════════════════════════════════
    # PHASE 1 : Extraction du texte (critique — permet la roadmap)
    # ══════════════════════════════════════════════════════════
    try:
        update_document_status(document_id, "parsing")
        extracted_text = await parse_pdf(storage_url)

        if not extracted_text.strip():
            raise ValueError("Aucun texte extrait du document")

        # Sauvegarde du texte extrait (requis pour la génération roadmap)
        supabase.table("uploaded_documents").update({
            "extracted_text": extracted_text[:50000],
        }).eq("id", document_id).execute()

        # ✅ Texte extrait — la roadmap peut déjà être générée
        update_document_status(document_id, "text_extracted")
        logger.info(
            f"✅ Texte extrait pour {document_id} ({len(extracted_text)} chars) "
            f"— roadmap possible dès maintenant"
        )

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Extraction échouée pour {document_id}: {error_msg}")
        update_document_status(document_id, "failed", error_message=error_msg)
        return  # Arrêt total — pas de texte = rien à faire

    # ══════════════════════════════════════════════════════════
    # PHASE 2 : Embeddings + pgvector (optionnel — enrichit le RAG)
    # ══════════════════════════════════════════════════════════
    try:
        update_document_status(document_id, "chunking")
        chunks = chunk_text(
            text=extracted_text,
            document_id=document_id,
            project_id=project_id,
            source_type=source_type,
            filename=filename,
        )

        if not chunks:
            raise ValueError("Aucun chunk produit après le découpage")

        logger.info(f"Chunking OK: {len(chunks)} chunks pour {filename}")

        update_document_status(document_id, "embedding")
        embedded_chunks = await embed_chunks(chunks)

        chunks_count = await store_chunks_in_pgvector(
            chunks=embedded_chunks,
            document_id=document_id,
        )

        # ✅ Pipeline complet — RAG pleinement fonctionnel
        update_document_status(document_id, "ready", chunks_count=chunks_count)
        logger.info(
            f"✅ Ingestion complète: {document_id} → {chunks_count} chunks (file={filename})"
        )

    except Exception as e:
        # L'embedding a échoué, MAIS le texte est extrait
        # → on garde "text_extracted" pour que la roadmap fonctionne
        error_msg = f"Embedding échoué (texte disponible): {e}"
        logger.warning(f"⚠️  {error_msg} pour {document_id}")
        update_document_status(
            document_id, "text_extracted",
            error_message=str(e)[:500],
        )