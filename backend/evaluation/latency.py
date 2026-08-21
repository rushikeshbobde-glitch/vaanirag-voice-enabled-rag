import time
import math
from typing import List, Dict, Any, Optional
import numpy as np

from app.schemas.rag import LatencyBreakdown


class LatencyTracker:
    """
    Real-time latency analytics engine for VaaniRAG.
    Maintains ring buffer of query latencies and computes accurate P50, P70, P100,
    Mean, Min, and Max metrics across RAG pipeline stages.
    """
    def __init__(self, max_records: int = 500):
        self.max_records = max_records
        self.history: List[LatencyBreakdown] = []

    def record(self, breakdown: LatencyBreakdown):
        """Appends a latency record, maintaining max buffer size."""
        self.history.append(breakdown)
        if len(self.history) > self.max_records:
            self.history.pop(0)

    def _calc_percentiles(self, values: List[float]) -> Dict[str, float]:
        if not values:
            return {"mean": 0.0, "p50": 0.0, "p70": 0.0, "p100": 0.0, "min": 0.0, "max": 0.0}

        sorted_vals = sorted(values)
        n = len(sorted_vals)

        p50 = float(np.percentile(sorted_vals, 50))
        p70 = float(np.percentile(sorted_vals, 70))
        p100 = float(sorted_vals[-1])
        mean = float(np.mean(sorted_vals))
        min_val = float(sorted_vals[0])
        max_val = float(sorted_vals[-1])

        return {
            "mean": round(mean, 2),
            "p50": round(p50, 2),
            "p70": round(p70, 2),
            "p100": round(p100, 2),
            "min": round(min_val, 2),
            "max": round(max_val, 2),
        }

    def get_summary(self) -> Dict[str, Any]:
        """
        Returns full statistical summary for all stages and overall pipeline.
        """
        if not self.history:
            return {
                "total_queries": 0,
                "overall": self._calc_percentiles([]),
                "retrieval_core": self._calc_percentiles([]),
                "stages": {
                    "stt": self._calc_percentiles([]),
                    "embedding": self._calc_percentiles([]),
                    "faiss": self._calc_percentiles([]),
                    "bm25": self._calc_percentiles([]),
                    "reranking": self._calc_percentiles([]),
                    "generation": self._calc_percentiles([]),
                },
                "target_sub200ms_compliance_pct": 0.0,
            }

        total_latencies = [x.total_ms for x in self.history]
        retrieval_latencies = [x.retrieval_core_ms for x in self.history]
        stt_latencies = [x.stt_ms for x in self.history if x.stt_ms > 0]
        emb_latencies = [x.embedding_ms for x in self.history]
        faiss_latencies = [x.faiss_ms for x in self.history]
        bm25_latencies = [x.bm25_ms for x in self.history]
        rerank_latencies = [x.reranking_ms for x in self.history]
        gen_latencies = [x.generation_ms for x in self.history]

        sub200_count = sum(1 for x in retrieval_latencies if x <= 200.0)
        compliance_pct = round((sub200_count / len(retrieval_latencies)) * 100.0, 1)

        return {
            "total_queries": len(self.history),
            "overall": self._calc_percentiles(total_latencies),
            "retrieval_core": self._calc_percentiles(retrieval_latencies),
            "stages": {
                "stt": self._calc_percentiles(stt_latencies if stt_latencies else [0.0]),
                "embedding": self._calc_percentiles(emb_latencies),
                "faiss": self._calc_percentiles(faiss_latencies),
                "bm25": self._calc_percentiles(bm25_latencies),
                "reranking": self._calc_percentiles(rerank_latencies),
                "generation": self._calc_percentiles(gen_latencies),
            },
            "target_sub200ms_compliance_pct": compliance_pct,
        }


# Singleton tracker
_LATENCY_TRACKER: Optional[LatencyTracker] = None


def get_latency_tracker() -> LatencyTracker:
    global _LATENCY_TRACKER
    if _LATENCY_TRACKER is None:
        _LATENCY_TRACKER = LatencyTracker()
    return _LATENCY_TRACKER
