import logging
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends

from app.schemas.rag import TextQueryRequest, VoiceQueryRequest, RAGResponse, SourceChunk
from rag.orchestrator import get_orchestrator

logger = logging.getLogger("vaani_rag.api.rag")
router = APIRouter(prefix="/rag", tags=["RAG"])


@router.post("/query", response_model=RAGResponse)
async def execute_query(request: TextQueryRequest):
    """
    Core Text-based RAG query execution pipeline:
    Query -> Hybrid Retrieval (FAISS + BM25) -> Reranking -> Guardrails -> Sarvam Generation -> Verified Answer + Sources + Latency.
    """
    try:
        orchestrator = get_orchestrator()
        response = await orchestrator.execute_text_query(request)
        return response
    except Exception as e:
        logger.error(f"Error in /rag/query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"RAG execution error: {str(e)}")


@router.post("/voice-query", response_model=RAGResponse)
async def execute_voice_query(request: VoiceQueryRequest):
    """
    End-to-End Voice RAG pipeline:
    Audio Base64 -> Sarvam Saaras v3 STT -> Query Processing -> Hybrid Retrieval -> Reranker -> Generation -> Guardrail Validation.
    """
    try:
        orchestrator = get_orchestrator()
        response = await orchestrator.execute_voice_query(request)
        return response
    except Exception as e:
        logger.error(f"Error in /rag/voice-query: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Voice RAG execution error: {str(e)}")
