import pytest
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from rag.chunker import (
    FixedSizeChunker,
    SentenceChunker,
    PassageChunker,
    MetadataAwareChunker,
    SemanticChunker,
    ChunkingPipeline,
    ChunkStrategyType,
)

SAMPLE_TEXT = """Solar photovoltaic cells convert solar radiation directly into electrical energy through the photovoltaic effect. When photons strike semiconductor materials like silicon, electrons are excited into higher energy states, generating direct electrical current.

Solar energy is abundant and produces zero greenhouse gas emissions during operation. It offers scalable distributed energy generation for industrial and residential grids."""


def test_fixed_size_chunker():
    chunker = FixedSizeChunker(chunk_size=15, overlap=5)
    chunks = chunker.chunk(SAMPLE_TEXT, doc_id="doc_1", metadata={"language": "en"})
    assert len(chunks) >= 2
    for c in chunks:
        assert c.doc_id == "doc_1"
        assert c.strategy == ChunkStrategyType.FIXED_SIZE.value
        assert len(c.text) > 0


def test_sentence_chunker():
    chunker = SentenceChunker(max_sentences_per_chunk=2, sentence_overlap=1)
    chunks = chunker.chunk(SAMPLE_TEXT, doc_id="doc_2", metadata={"language": "en"})
    assert len(chunks) >= 2
    for c in chunks:
        assert c.doc_id == "doc_2"
        assert c.strategy == ChunkStrategyType.SENTENCE_AWARE.value
        assert c.metadata.get("sentence_count", 0) > 0


def test_passage_chunker():
    chunker = PassageChunker()
    chunks = chunker.chunk(SAMPLE_TEXT, doc_id="doc_3", metadata={"language": "en"})
    assert len(chunks) == 2  # Two distinct paragraphs in sample
    for c in chunks:
        assert c.strategy == ChunkStrategyType.PASSAGE_AWARE.value


def test_metadata_aware_chunker():
    chunker = MetadataAwareChunker()
    chunks = chunker.chunk(SAMPLE_TEXT, doc_id="doc_4", metadata={"language": "hi", "query_id": "q_101"})
    assert len(chunks) >= 1
    assert "[Lang: HI]" in chunks[0].text
    assert "[Query: q_101]" in chunks[0].text
    assert chunks[0].strategy == ChunkStrategyType.METADATA_AWARE.value


def test_semantic_chunker():
    chunker = SemanticChunker(min_sentences=1, max_sentences=3)
    chunks = chunker.chunk(SAMPLE_TEXT, doc_id="doc_5", metadata={"language": "en"})
    assert len(chunks) >= 1
    for c in chunks:
        assert c.strategy == ChunkStrategyType.SEMANTIC.value


def test_chunking_pipeline():
    pipeline = ChunkingPipeline()
    docs = [
        {"id": "d1", "query_id": "q1", "passage_id": "p1", "text": SAMPLE_TEXT, "language": "en"},
        {"id": "d2", "query_id": "q2", "passage_id": "p2", "text": "सौर ऊर्जा स्वच्छ और सुरक्षित ऊर्जा का स्रोत है।", "language": "hi"},
    ]
    chunks = pipeline.chunk_dataset(docs, strategy=ChunkStrategyType.METADATA_AWARE.value)
    assert len(chunks) >= 2
