import time
import uuid
import logging
from typing import Dict, Any, Optional, Tuple, List

from app.dependencies import get_settings
from app.schemas.rag import (
    TextQueryRequest,
    VoiceQueryRequest,
    RAGResponse,
    SourceChunk,
    GuardrailStatus,
    LatencyBreakdown,
)
from rag.retriever import get_retriever
from rag.reranker import get_reranker
from rag.generator import get_generator
from rag.guardrails import get_guardrails
from speech.sarvam_stt import get_stt
from evaluation.latency import get_latency_tracker

logger = logging.getLogger("vaani_rag.orchestrator")


def detect_query_language(text: str) -> str:
    """
    Accurately detects Indic language script or English based on unicode character ranges.
    """
    for ch in text:
        code = ord(ch)
        if 0x0980 <= code <= 0x09FF:
            return "bn"  # Bengali
        elif 0x0B80 <= code <= 0x0BFF:
            return "ta"  # Tamil
        elif 0x0C00 <= code <= 0x0C7F:
            return "te"  # Telugu
        elif 0x0A80 <= code <= 0x0AFF:
            return "gu"  # Gujarati
        elif 0x0C80 <= code <= 0x0CFF:
            return "kn"  # Kannada
        elif 0x0D00 <= code <= 0x0D7F:
            return "ml"  # Malayalam
        elif 0x0A00 <= code <= 0x0A7F:
            return "pa"  # Punjabi
        elif 0x0900 <= code <= 0x097F:
            # Devanagari (Hindi / Marathi)
            if any(w in text for w in ["आहे", "नाही", "आणि", "कसे", "काय", "यांचे", "मध्ये", "स्रोत"]):
                return "mr"
            return "hi"
    return "en"


class RAGOrchestrator:
    """
    Production-grade RAG orchestration harness managing request lifecycles,
    multi-stage timing, caching, multi-language detection, and guardrail enforcement.
    """
    def __init__(self):
        self.settings = get_settings()
        self.retriever = get_retriever()
        self.reranker = get_reranker()
        self.generator = get_generator()
        self.guardrails = get_guardrails()
        self.stt = get_stt()
        self.latency_tracker = get_latency_tracker()

        # In-memory LRU query cache: normalized_query -> cached RAGResponse dict
        self.query_cache: Dict[str, Dict[str, Any]] = {}

    def _normalize_key(self, query: str, lang: str, strategy: str) -> str:
        return f"{lang.lower()}:{strategy.lower()}:{query.strip().lower()}"

    async def execute_voice_query(self, req: VoiceQueryRequest) -> RAGResponse:
        """
        Executes end-to-end voice query: Audio -> STT -> RAG Pipeline.
        """
        request_id = f"req_v_{uuid.uuid4().hex[:8]}"
        stt_ms = 0.0
        transcript = ""
        detected_lang = req.language or "auto"

        # 1. Use client transcript if provided, otherwise transcribe audio
        if req.query and req.query.strip():
            transcript = req.query.strip()
        elif req.audio_base64:
            stt_res = await self.stt.transcribe_base64(req.audio_base64, language_code=detected_lang)
            transcript = stt_res.transcript
            stt_ms = stt_res.latency_ms
            if stt_res.language and stt_res.language != "unknown":
                detected_lang = stt_res.language
        else:
            transcript = "What is the key information in this dataset?"

        # If auto, resolve language from transcript
        if detected_lang in ["auto", "unknown", None]:
            detected_lang = detect_query_language(transcript)

        # Fallback text query using generated transcript
        text_req = TextQueryRequest(
            query=transcript,
            language=detected_lang,
            top_k=req.top_k,
            chunk_strategy=req.chunk_strategy,
            semantic_weight=req.semantic_weight,
            bm25_weight=req.bm25_weight,
            rerank=req.rerank,
        )

        response = await self.execute_text_query(text_req, request_id_override=request_id, stt_latency_ms=stt_ms)
        response.transcript = transcript
        return response

    async def execute_text_query(
        self,
        req: TextQueryRequest,
        request_id_override: Optional[str] = None,
        stt_latency_ms: float = 0.0,
    ) -> RAGResponse:
        """
        Structured end-to-end text RAG pipeline execution.
        """
        request_id = request_id_override or f"req_t_{uuid.uuid4().hex[:8]}"
        start_pipeline = time.perf_counter()

        query_str = req.query.strip()
        raw_lang = req.language or "auto"
        # Auto-detect language if auto or unknown
        if raw_lang in ["auto", "unknown", None]:
            lang_str = detect_query_language(query_str)
        else:
            lang_str = raw_lang

        strategy_str = req.chunk_strategy.value if req.chunk_strategy else "metadata_aware"

        # Check Cache
        cache_key = self._normalize_key(query_str, lang_str, strategy_str)
        if cache_key in self.query_cache:
            cached_data = self.query_cache[cache_key]
            logger.info(f"Cache HIT for query: '{query_str}'")
            cached_resp = RAGResponse(**cached_data)
            cached_resp.request_id = request_id
            cached_resp.cached = True
            return cached_resp

        # Stage 1: Input Validation & Safety Guardrails (Guardrail 1 & 5)
        t_g1 = time.perf_counter()
        is_input_valid, input_error = self.guardrails.validate_input(query_str)
        guardrail_ms = (time.perf_counter() - t_g1) * 1000

        if not is_input_valid:
            total_elapsed = (time.perf_counter() - start_pipeline) * 1000
            breakdown = LatencyBreakdown(
                stt_ms=stt_latency_ms,
                guardrails_ms=guardrail_ms,
                total_ms=total_elapsed,
            )
            self.latency_tracker.record(breakdown)
            return RAGResponse(
                request_id=request_id,
                query=query_str,
                language=lang_str,
                answer=input_error or "Invalid input provided.",
                sources=[],
                retrieval={},
                guardrails=GuardrailStatus(
                    passed=False,
                    grounded=False,
                    input_valid=False,
                    guardrails_triggered=["Input Validation / Safety"],
                    confidence_score=0.0,
                ),
                latency=breakdown,
                cached=False,
            )

        # Stage 2: Hybrid Retrieval (FAISS + BM25)
        top_k_candidates = req.top_k * 3 if req.rerank else req.top_k
        candidates, ret_timings = self.retriever.retrieve_hybrid(
            query=query_str,
            top_k=top_k_candidates,
            semantic_weight=req.semantic_weight,
            bm25_weight=req.bm25_weight,
            chunk_strategy_filter=strategy_str,
            target_language=lang_str,
        )

        # Stage 3: Reranking
        rerank_ms = 0.0
        final_sources: List[SourceChunk] = []
        if req.rerank and candidates:
            final_sources, rerank_ms = self.reranker.rerank(
                query=query_str,
                candidates=candidates,
                final_k=req.top_k,
                target_language=lang_str,
            )
        else:
            # Fallback to top k candidates directly converted to SourceChunk
            for i, cand in enumerate(candidates[:req.top_k]):
                c = cand["chunk"]
                final_sources.append(
                    SourceChunk(
                        id=c.get("chunk_id", f"src_{i+1}"),
                        rank=i + 1,
                        score=round(cand["score"], 4),
                        semantic_score=round(cand.get("semantic_score", 0.0), 4),
                        bm25_score=round(cand.get("bm25_score", 0.0), 4),
                        rerank_score=round(cand["score"], 4),
                        language=c.get("language", "en"),
                        strategy=c.get("strategy", strategy_str),
                        query_id=c.get("query_id"),
                        passage_id=c.get("passage_id"),
                        text=c.get("text", ""),
                        metadata=c.get("metadata", {}),
                    )
                )

        # Stage 4: Context Validation Guardrail (Guardrail 2 & 3: Off-topic / Score Threshold)
        t_g2 = time.perf_counter()
        is_context_valid, context_msg, top_score = self.guardrails.validate_retrieval(final_sources)
        guardrail_ms += (time.perf_counter() - t_g2) * 1000

        if not is_context_valid:
            total_elapsed = (time.perf_counter() - start_pipeline) * 1000
            breakdown = LatencyBreakdown(
                stt_ms=stt_latency_ms,
                embedding_ms=ret_timings["embedding_ms"],
                faiss_ms=ret_timings["faiss_ms"],
                bm25_ms=ret_timings["bm25_ms"],
                hybrid_fusion_ms=ret_timings["hybrid_fusion_ms"],
                reranking_ms=rerank_ms,
                generation_ms=0.0,
                guardrails_ms=guardrail_ms,
                retrieval_core_ms=ret_timings["retrieval_core_ms"] + rerank_ms,
                total_ms=total_elapsed,
            )
            self.latency_tracker.record(breakdown)
            return RAGResponse(
                request_id=request_id,
                query=query_str,
                language=lang_str,
                answer=context_msg,
                sources=final_sources,
                retrieval={
                    "candidates_retrieved": len(candidates),
                    "top_score": top_score,
                },
                guardrails=GuardrailStatus(
                    passed=False,
                    grounded=False,
                    relevance_valid=False,
                    score_valid=False,
                    guardrails_triggered=["Low Retrieval Score / Off-topic Context"],
                    confidence_score=round(top_score, 3),
                ),
                latency=breakdown,
                cached=False,
            )

        # Stage 5: Grounded Answer Generation (Sarvam AI)
        answer_text, gen_ms, is_live_llm = await self.generator.generate_answer(
            query=query_str,
            sources=final_sources,
            language=lang_str,
        )

        # Stage 6: Grounding & Hallucination Guardrail (Guardrail 4)
        t_g3 = time.perf_counter()
        is_grounded, confidence_score, g_warnings = self.guardrails.validate_grounding(answer_text, final_sources)
        guardrail_ms += (time.perf_counter() - t_g3) * 1000

        # Compute full latency breakdown
        total_elapsed = (time.perf_counter() - start_pipeline) * 1000
        retrieval_core_total = ret_timings["retrieval_core_ms"] + rerank_ms

        breakdown = LatencyBreakdown(
            stt_ms=stt_latency_ms,
            embedding_ms=round(ret_timings["embedding_ms"], 2),
            faiss_ms=round(ret_timings["faiss_ms"], 2),
            bm25_ms=round(ret_timings["bm25_ms"], 2),
            hybrid_fusion_ms=round(ret_timings["hybrid_fusion_ms"], 2),
            reranking_ms=round(rerank_ms, 2),
            generation_ms=round(gen_ms, 2),
            guardrails_ms=round(guardrail_ms, 2),
            retrieval_core_ms=round(retrieval_core_total, 2),
            total_ms=round(total_elapsed, 2),
        )

        self.latency_tracker.record(breakdown)

        response = RAGResponse(
            request_id=request_id,
            query=query_str,
            language=lang_str,
            answer=answer_text,
            sources=final_sources,
            retrieval={
                "strategy": strategy_str,
                "semantic_candidates": len(candidates),
                "final_sources_count": len(final_sources),
                "top_score": round(top_score, 4),
                "semantic_weight": req.semantic_weight,
                "bm25_weight": req.bm25_weight,
            },
            guardrails=GuardrailStatus(
                passed=is_grounded,
                grounded=is_grounded,
                grounding_verified=is_grounded,
                guardrails_triggered=g_warnings,
                confidence_score=confidence_score,
                details={"is_live_llm": is_live_llm},
            ),
            latency=breakdown,
            cached=False,
        )

        # Cache valid successful responses
        if len(self.query_cache) >= self.settings.CACHE_SIZE:
            self.query_cache.pop(next(iter(self.query_cache)))
        self.query_cache[cache_key] = response.model_dump()

        return response


# Singleton orchestrator
_ORCHESTRATOR_INSTANCE: Optional[RAGOrchestrator] = None


def get_orchestrator() -> RAGOrchestrator:
    global _ORCHESTRATOR_INSTANCE
    if _ORCHESTRATOR_INSTANCE is None:
        _ORCHESTRATOR_INSTANCE = RAGOrchestrator()
    return _ORCHESTRATOR_INSTANCE
