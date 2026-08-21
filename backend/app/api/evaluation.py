import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Query

from evaluation.latency import get_latency_tracker
from evaluation.benchmark import get_benchmark_runner
from app.schemas.rag import EvaluationSummary

logger = logging.getLogger("vaani_rag.api.evaluation")
router = APIRouter(tags=["Evaluation & Analytics"])


@router.get("/latency")
async def get_latency_stats() -> Dict[str, Any]:
    """
    Returns actual P50, P70, P100, Mean, Min, Max latency percentiles
    across all historical queries and per-stage breakdown.
    """
    tracker = get_latency_tracker()
    return tracker.get_summary()


@router.get("/evaluation/summary", response_model=Optional[EvaluationSummary])
async def get_evaluation_summary():
    """
    Retrieves the most recent benchmark evaluation results.
    """
    runner = get_benchmark_runner()
    if runner.last_benchmark_result is not None:
        return runner.last_benchmark_result
    # Run a quick initial benchmark if none exists
    return await runner.run_benchmark(sample_limit=10)


@router.post("/evaluation/run", response_model=EvaluationSummary)
async def run_evaluation(sample_limit: int = Query(15, ge=1, le=50)):
    """
    Triggers an automated benchmark evaluation across multilingual test queries,
    measuring retrieval accuracy, grounding percentage, and latency percentiles.
    """
    try:
        runner = get_benchmark_runner()
        summary = await runner.run_benchmark(sample_limit=sample_limit)
        return summary
    except Exception as e:
        logger.error(f"Evaluation benchmark failed: {e}")
        raise HTTPException(status_code=500, detail=f"Benchmark execution failed: {str(e)}")
