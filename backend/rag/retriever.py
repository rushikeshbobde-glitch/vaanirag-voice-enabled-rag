import os
import json
import time
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import faiss
from rank_bm25 import BM25Okapi

from app.dependencies import get_settings
from rag.embeddings import embed_query, embed_documents, get_embedding_dimension
from app.schemas.rag import SourceChunk, RetrievalMetrics

logger = logging.getLogger("vaani_rag.retriever")


class HybridRetriever:
    """
    Hybrid retriever combining FAISS dense vector search with BM25 sparse lexical search,
    performing score normalization and weighted reciprocal score fusion.
    """
    def __init__(self, index_dir: Optional[Path] = None):
        self.settings = get_settings()
        self.index_dir = index_dir or self.settings.INDEX_DIR
        self.faiss_index_path = self.index_dir / "faiss.index"
        self.metadata_path = self.index_dir / "metadata.json"
        
        self.faiss_index: Optional[faiss.Index] = None
        self.metadata: List[Dict[str, Any]] = []
        self.bm25: Optional[BM25Okapi] = None
        self.corpus_tokens: List[List[str]] = []
        self.is_ready: bool = False
        
        # Load existing index if present
        self.load_index_if_exists()

    def _tokenize(self, text: str) -> List[str]:
        """Multilingual-safe tokenizer for BM25."""
        return [w.lower() for w in re.findall(r'\w+', text, flags=re.UNICODE) if len(w) > 1]

    def build_index(
        self,
        chunks: List[Dict[str, Any]],
        embeddings: Optional[np.ndarray] = None,
        save: bool = True,
    ) -> bool:
        """
        Builds FAISS index and BM25 index from a list of chunk dictionaries.
        """
        start_time = time.perf_counter()
        logger.info(f"Building Hybrid Index for {len(chunks)} chunks...")

        if not chunks:
            logger.warning("No chunks provided to build index.")
            return False

        self.metadata = chunks

        # 1. Compute/Assign Embeddings
        texts = [c["text"] for c in chunks]
        if embeddings is None or len(embeddings) != len(chunks):
            logger.info("Computing dense vectors for all chunks...")
            embeddings = embed_documents(texts, batch_size=64, show_progress_bar=False)

        dim = embeddings.shape[1]
        
        # 2. Build FAISS Index with Inner Product (Cosine similarity on normalized vectors)
        index = faiss.IndexFlatIP(dim)
        index.add(embeddings)
        self.faiss_index = index

        # 3. Build BM25 Index
        logger.info("Tokenizing corpus for BM25 lexical index...")
        self.corpus_tokens = [self._tokenize(t) for t in texts]
        self.bm25 = BM25Okapi(self.corpus_tokens)

        self.is_ready = True
        elapsed = (time.perf_counter() - start_time) * 1000
        logger.info(f"Hybrid index built successfully in {elapsed:.2f}ms")

        # 4. Save to disk if requested
        if save:
            self.save_index()

        return True

    def save_index(self):
        """Persists the FAISS index and metadata to disk."""
        self.index_dir.mkdir(parents=True, exist_ok=True)
        if self.faiss_index is not None:
            faiss.write_index(self.faiss_index, str(self.faiss_index_path))
        with open(self.metadata_path, "w", encoding="utf-8") as f:
            json.dump(self.metadata, f, ensure_ascii=False, indent=2)
        logger.info(f"Saved FAISS index ({self.faiss_index_path}) and metadata ({self.metadata_path})")

    def load_index_if_exists(self) -> bool:
        """Loads FAISS index, metadata, and reinitializes BM25 in memory."""
        if not self.faiss_index_path.exists() or not self.metadata_path.exists():
            logger.info("No existing index found on disk.")
            self.is_ready = False
            return False

        try:
            start_time = time.perf_counter()
            logger.info(f"Loading FAISS index from {self.faiss_index_path}...")
            self.faiss_index = faiss.read_index(str(self.faiss_index_path))

            logger.info(f"Loading metadata from {self.metadata_path}...")
            with open(self.metadata_path, "r", encoding="utf-8") as f:
                self.metadata = json.load(f)

            # Rebuild fast BM25 index from stored texts
            texts = [c["text"] for c in self.metadata]
            self.corpus_tokens = [self._tokenize(t) for t in texts]
            self.bm25 = BM25Okapi(self.corpus_tokens)

            self.is_ready = True
            elapsed = (time.perf_counter() - start_time) * 1000
            logger.info(f"Loaded Hybrid index ({len(self.metadata)} chunks) in {elapsed:.2f}ms")
            return True
        except Exception as e:
            logger.error(f"Failed to load index from disk: {e}")
            self.is_ready = False
            return False

    def retrieve_semantic(self, query_vec: np.ndarray, top_k: int = 15) -> List[Tuple[int, float]]:
        """
        Executes FAISS inner product vector search.
        Returns list of (doc_index, cosine_score).
        """
        if not self.is_ready or self.faiss_index is None:
            return []

        # FAISS search requires 2D array
        query_2d = np.ascontiguousarray(query_vec.reshape(1, -1), dtype=np.float32)
        actual_k = min(top_k, self.faiss_index.ntotal)
        if actual_k <= 0:
            return []

        scores, indices = self.faiss_index.search(query_2d, actual_k)
        results = []
        for idx, score in zip(indices[0], scores[0]):
            if idx != -1:
                # Clamp cosine similarity to [0.0, 1.0]
                norm_score = max(0.0, min(1.0, float((score + 1.0) / 2.0)))
                results.append((int(idx), norm_score))
        return results

    def retrieve_bm25(self, query: str, top_k: int = 15) -> List[Tuple[int, float]]:
        """
        Executes BM25 lexical keyword search.
        Returns list of (doc_index, normalized_score).
        """
        if not self.is_ready or self.bm25 is None or not self.corpus_tokens:
            return []

        q_tokens = self._tokenize(query)
        if not q_tokens:
            return []

        raw_scores = self.bm25.get_scores(q_tokens)
        top_indices = np.argsort(raw_scores)[::-1][:top_k]

        max_score = float(np.max(raw_scores)) if len(raw_scores) > 0 and np.max(raw_scores) > 0 else 1.0

        results = []
        for idx in top_indices:
            score = float(raw_scores[idx])
            if score > 0.0:
                norm_score = min(1.0, score / max_score)
                results.append((int(idx), norm_score))
        return results

    def retrieve_hybrid(
        self,
        query: str,
        top_k: int = 10,
        semantic_weight: Optional[float] = None,
        bm25_weight: Optional[float] = None,
        chunk_strategy_filter: Optional[str] = None,
        target_language: Optional[str] = None,
    ) -> Tuple[List[Dict[str, Any]], Dict[str, float]]:
        """
        Executes Hybrid Retrieval combining FAISS and BM25 with score fusion.
        Returns:
          - List of candidate chunk dicts with unified scores
          - Timing breakdown dict (embedding_ms, faiss_ms, bm25_ms, fusion_ms, total_retrieval_ms)
        """
        sem_w = semantic_weight if semantic_weight is not None else self.settings.SEMANTIC_WEIGHT
        bm_w = bm25_weight if bm25_weight is not None else self.settings.BM25_WEIGHT

        timings: Dict[str, float] = {
            "embedding_ms": 0.0,
            "faiss_ms": 0.0,
            "bm25_ms": 0.0,
            "hybrid_fusion_ms": 0.0,
            "retrieval_core_ms": 0.0,
        }

        if not self.is_ready:
            return [], timings

        start_all = time.perf_counter()

        # 1. Embedding timing
        t0 = time.perf_counter()
        query_vec = embed_query(query)
        timings["embedding_ms"] = (time.perf_counter() - t0) * 1000

        # 2. FAISS Semantic Search (Broad candidate pool)
        t1 = time.perf_counter()
        pool_size = min(150, self.faiss_index.ntotal if self.faiss_index else 100)
        semantic_hits = self.retrieve_semantic(query_vec, top_k=pool_size)
        timings["faiss_ms"] = (time.perf_counter() - t1) * 1000

        # 3. BM25 Lexical Search (Broad candidate pool)
        t2 = time.perf_counter()
        bm25_hits = self.retrieve_bm25(query, top_k=pool_size)
        timings["bm25_ms"] = (time.perf_counter() - t2) * 1000

        # 4. Hybrid Score Fusion
        t3 = time.perf_counter()
        combined_scores: Dict[int, Dict[str, float]] = {}

        for idx, s_score in semantic_hits:
            if idx not in combined_scores:
                combined_scores[idx] = {"semantic": s_score, "bm25": 0.0}
            else:
                combined_scores[idx]["semantic"] = s_score

        for idx, b_score in bm25_hits:
            if idx not in combined_scores:
                combined_scores[idx] = {"semantic": 0.0, "bm25": b_score}
            else:
                combined_scores[idx]["bm25"] = b_score

        # Calculate weighted hybrid score
        candidate_list = []
        for idx, scores in combined_scores.items():
            if idx < 0 or idx >= len(self.metadata):
                continue
            chunk_meta = self.metadata[idx]

            # Language & strategy bonuses
            is_lang_match = bool(target_language and target_language != "auto" and chunk_meta.get("language") == target_language)
            lang_boost = 0.25 if is_lang_match else 0.0
            strat_bonus = 0.05 if (chunk_strategy_filter and chunk_meta.get("strategy") == chunk_strategy_filter) else 0.0

            h_score = (sem_w * scores["semantic"]) + (bm_w * scores["bm25"]) + strat_bonus + lang_boost
            candidate_list.append({
                "index": idx,
                "score": float(min(1.0, h_score)),
                "semantic_score": float(scores["semantic"]),
                "bm25_score": float(scores["bm25"]),
                "is_lang_match": is_lang_match,
                "chunk": chunk_meta,
            })

        # Sort candidates descending by language match and hybrid score
        candidate_list.sort(key=lambda x: (x["is_lang_match"], x["score"]), reverse=True)
        top_candidates = candidate_list[:top_k]

        timings["hybrid_fusion_ms"] = (time.perf_counter() - t3) * 1000
        timings["retrieval_core_ms"] = (time.perf_counter() - start_all) * 1000

        return top_candidates, timings


# Singleton instance
_RETRIEVER_INSTANCE: Optional[HybridRetriever] = None


def get_retriever() -> HybridRetriever:
    global _RETRIEVER_INSTANCE
    if _RETRIEVER_INSTANCE is None:
        _RETRIEVER_INSTANCE = HybridRetriever()
    return _RETRIEVER_INSTANCE
