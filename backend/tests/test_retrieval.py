import pytest
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from rag.chunker import ChunkingPipeline, ChunkStrategyType
from rag.retriever import HybridRetriever
from rag.reranker import FastReranker

TEST_DOCS = [
    {
        "id": "doc_solar",
        "query_id": "q_solar",
        "passage_id": "p_solar",
        "text": "Solar photovoltaic panels convert sunlight photons into electricity using silicon semiconductors with zero greenhouse emissions.",
        "language": "en",
    },
    {
        "id": "doc_photo",
        "query_id": "q_photo",
        "passage_id": "p_photo",
        "text": "Plants undergo photosynthesis to synthesize carbohydrates from carbon dioxide and water using chlorophyll pigments in chloroplasts.",
        "language": "en",
    },
    {
        "id": "doc_solar_hi",
        "query_id": "q_solar_hi",
        "passage_id": "p_solar_hi",
        "text": "सौर ऊर्जा सूर्य के प्रकाश से बिजली उत्पन्न करने का एक प्रदूषण मुक्त और टिकाऊ स्रोत है।",
        "language": "hi",
    },
]


def test_hybrid_indexing_and_search(tmp_path):
    pipeline = ChunkingPipeline()
    chunks = pipeline.chunk_dataset(TEST_DOCS, strategy=ChunkStrategyType.METADATA_AWARE.value)
    chunk_dicts = [c.to_dict() for c in chunks]

    retriever = HybridRetriever(index_dir=tmp_path)
    success = retriever.build_index(chunk_dicts, save=True)
    assert success is True
    assert retriever.is_ready is True
    assert len(retriever.metadata) == len(chunk_dicts)

    # Test Semantic Search
    results, timings = retriever.retrieve_hybrid(query="solar energy electricity silicon", top_k=2)
    assert len(results) > 0
    assert timings["retrieval_core_ms"] > 0.0
    assert results[0]["score"] > 0.0

    # Verify reload from disk
    reloaded_retriever = HybridRetriever(index_dir=tmp_path)
    assert reloaded_retriever.is_ready is True
    assert len(reloaded_retriever.metadata) == len(chunk_dicts)


def test_fast_reranker():
    candidates = [
        {
            "score": 0.70,
            "semantic_score": 0.68,
            "bm25_score": 0.72,
            "chunk": {
                "chunk_id": "c1",
                "text": "Solar photovoltaic technology harnesses sun rays for clean electrical power.",
                "language": "en",
                "strategy": "metadata_aware",
            },
        },
        {
            "score": 0.40,
            "semantic_score": 0.41,
            "bm25_score": 0.38,
            "chunk": {
                "chunk_id": "c2",
                "text": "Photosynthesis produces organic compounds in green leaves.",
                "language": "en",
                "strategy": "metadata_aware",
            },
        },
    ]

    reranker = FastReranker()
    sources, rerank_ms = reranker.rerank(query="solar power energy", candidates=candidates, final_k=2)
    assert len(sources) == 2
    assert sources[0].id == "c1"
    assert sources[0].rank == 1
    assert rerank_ms >= 0.0
