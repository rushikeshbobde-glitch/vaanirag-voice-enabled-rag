import os
import time
import json
import logging
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks

from app.dependencies import get_settings
from app.schemas.rag import SystemStatus, SourceChunk
from rag.retriever import get_retriever
from rag.embeddings import load_embedding_model
from rag.orchestrator import get_orchestrator
from scripts.build_index import build_full_index

logger = logging.getLogger("vaani_rag.api.system")
router = APIRouter(tags=["System"])


@router.get("/system/status", response_model=SystemStatus)
async def get_system_status():
    """
    Returns real-time status of backend services, vector database, dataset, and AI models.
    """
    settings = get_settings()
    retriever = get_retriever()
    orchestrator = get_orchestrator()

    index_ready = retriever.is_ready
    total_chunks = len(retriever.metadata) if index_ready else 0

    raw_dataset_exists = (settings.RAW_DATA_DIR / "dataset.json").exists()
    doc_count = 0
    if raw_dataset_exists:
        try:
            with open(settings.RAW_DATA_DIR / "dataset.json", "r", encoding="utf-8") as f:
                doc_count = len(json.load(f))
        except Exception:
            doc_count = total_chunks

    last_build_time = None
    if (settings.INDEX_DIR / "metadata.json").exists():
        mtime = os.path.getmtime(settings.INDEX_DIR / "metadata.json")
        last_build_time = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(mtime))

    sarvam_configured = bool(settings.SARVAM_API_KEY and settings.SARVAM_API_KEY.strip())

    return SystemStatus(
        backend_status="ONLINE",
        vector_index_ready=index_ready,
        dataset_loaded=raw_dataset_exists or index_ready,
        embedding_model_ready=True,
        sarvam_api_connected=sarvam_configured,
        sarvam_api_key_configured=sarvam_configured,
        last_index_build=last_build_time,
        total_documents=doc_count,
        total_chunks=total_chunks,
        embedding_model_name=settings.EMBEDDING_MODEL,
        active_chunking_strategies=[
            "Fixed-Size Window",
            "Sentence-Aware Multi-Language",
            "Passage-Aware MSMARCO",
            "Metadata-Enriched Provenance",
            "Semantic Distance Clustering",
        ],
        cache_entries=len(orchestrator.query_cache),
    )


@router.post("/index/build")
async def trigger_index_build(
    limit: int = Query(500, ge=50, le=50000),
    background_tasks: BackgroundTasks = None,
):
    """
    Rebuilds the complete multi-strategy FAISS and BM25 index.
    """
    try:
        success = build_full_index(dataset_limit=limit)
        if success:
            # Reload in-memory retriever
            get_retriever().load_index_if_exists()
            return {"status": "success", "message": f"Index built successfully with {limit} documents limit."}
        else:
            raise HTTPException(status_code=500, detail="Failed to build index.")
    except Exception as e:
        logger.error(f"Error building index: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index/reload")
async def reload_index():
    """
    Reloads FAISS index and metadata from disk without rebuilding and clears LRU cache.
    """
    retriever = get_retriever()
    orchestrator = get_orchestrator()
    orchestrator.query_cache.clear()
    success = retriever.load_index_if_exists()
    return {
        "status": "success" if success else "failed",
        "chunks_loaded": len(retriever.metadata),
        "is_ready": retriever.is_ready,
        "cache_cleared": True,
    }


@router.post("/system/clear-cache")
async def clear_cache():
    """
    Clears the in-memory query and embedding cache.
    """
    orchestrator = get_orchestrator()
    count = len(orchestrator.query_cache)
    orchestrator.query_cache.clear()
    return {"status": "success", "cleared_entries": count}


@router.get("/sources/{request_id}")
async def get_sources_by_request(request_id: str):
    """
    Retrieves source provenance for a given request ID.
    """
    orchestrator = get_orchestrator()
    for cached in orchestrator.query_cache.values():
        if cached.get("request_id") == request_id:
            return {"request_id": request_id, "sources": cached.get("sources", [])}
    return {"request_id": request_id, "sources": []}


@router.post("/system/api-key")
async def update_sarvam_api_key(payload: Dict[str, str]):
    """
    Dynamically updates SARVAM_API_KEY across backend STT and LLM services.
    """
    key = payload.get("api_key", "").strip()
    settings = get_settings()
    settings.SARVAM_API_KEY = key

    from speech.sarvam_stt import get_stt
    from rag.generator import get_generator

    stt = get_stt()
    stt.api_key = key
    gen = get_generator()
    gen.api_key = key

    logger.info(f"Updated SARVAM_API_KEY: {'[CONFIGURED]' if key else '[CLEARED]'}")
    return {"status": "success", "sarvam_configured": bool(key)}
