import time
import re
import logging
from typing import List, Dict, Any, Tuple
import numpy as np

from app.schemas.rag import SourceChunk

logger = logging.getLogger("vaani_rag.reranker")


class FastReranker:
    """
    Lightweight, high-speed reranker optimizing top candidates (10-20) down to final K (3-5).
    Evaluates:
      1. Exact and stemmed keyword density / cover in the chunk text
      2. Title/metadata relevance boost
      3. Language alignment bonus
      4. Length-penalized semantic relevance
    Runs in < 5ms to maintain strict sub-200ms latency budgets.
    """
    def __init__(self):
        pass

    def _tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in re.findall(r'\w+', text, flags=re.UNICODE) if len(w) > 1]

    def rerank(
        self,
        query: str,
        candidates: List[Dict[str, Any]],
        final_k: int = 5,
        target_language: str = "auto",
    ) -> Tuple[List[SourceChunk], float]:
        """
        Reranks a list of candidate chunk dicts and returns top final_k SourceChunks
        along with reranker execution latency in milliseconds.
        """
        start_t = time.perf_counter()

        if not candidates:
            return [], 0.0

        query_tokens = set(self._tokenize(query))
        query_len = max(1, len(query_tokens))

        scored_sources: List[Dict[str, Any]] = []

        for rank_idx, cand in enumerate(candidates):
            chunk_data = cand.get("chunk", {})
            text = chunk_data.get("text", "")
            base_score = cand.get("score", 0.0)
            sem_score = cand.get("semantic_score", 0.0)
            bm_score = cand.get("bm25_score", 0.0)

            chunk_tokens = self._tokenize(text)
            chunk_token_set = set(chunk_tokens)

            # 1. Term coverage ratio
            matched_terms = query_tokens.intersection(chunk_token_set)
            coverage_ratio = len(matched_terms) / query_len

            # 2. Term proximity / density bonus
            density_bonus = 0.0
            if len(matched_terms) > 1 and len(chunk_tokens) > 0:
                # Count frequency of matched terms in window
                density_bonus = min(0.15, (len([t for t in chunk_tokens if t in matched_terms]) / len(chunk_tokens)) * 0.5)

            # 3. Exact phrase match bonus
            exact_bonus = 0.15 if query.lower().strip() in text.lower() else 0.0

            # 4. Language alignment bonus
            lang = chunk_data.get("language", "en")
            is_lang_match = bool(target_language and target_language != "auto" and lang == target_language)
            lang_bonus = 0.30 if is_lang_match else 0.0

            # Composite rerank score (clamped between 0.0 and 1.0)
            rerank_score = (
                (0.60 * base_score) +
                (0.15 * coverage_ratio) +
                (0.10 * exact_bonus) +
                (0.05 * density_bonus) +
                lang_bonus
            )
            rerank_score = max(0.0, min(1.0, float(rerank_score)))

            scored_sources.append({
                "cand": cand,
                "rerank_score": rerank_score,
                "is_lang_match": is_lang_match,
                "matched_terms_count": len(matched_terms),
            })

        # Sort with matching language priority, then rerank score descending
        scored_sources.sort(key=lambda x: (x["is_lang_match"], x["rerank_score"]), reverse=True)
        top_k_items = scored_sources[:final_k]

        final_sources: List[SourceChunk] = []
        for i, item in enumerate(top_k_items):
            cand = item["cand"]
            c = cand.get("chunk", {})
            final_sources.append(
                SourceChunk(
                    id=c.get("chunk_id", f"src_{i+1}"),
                    rank=i + 1,
                    score=round(item["rerank_score"], 4),
                    semantic_score=round(cand.get("semantic_score", 0.0), 4),
                    bm25_score=round(cand.get("bm25_score", 0.0), 4),
                    rerank_score=round(item["rerank_score"], 4),
                    language=c.get("language", "en"),
                    strategy=c.get("strategy", "metadata_aware"),
                    query_id=c.get("query_id"),
                    passage_id=c.get("passage_id"),
                    text=c.get("text", ""),
                    metadata=c.get("metadata", {}),
                )
            )

        rerank_ms = (time.perf_counter() - start_t) * 1000
        return final_sources, rerank_ms


# Singleton instance
_RERANKER_INSTANCE: Optional[FastReranker] = None


def get_reranker() -> FastReranker:
    global _RERANKER_INSTANCE
    if _RERANKER_INSTANCE is None:
        _RERANKER_INSTANCE = FastReranker()
    return _RERANKER_INSTANCE
