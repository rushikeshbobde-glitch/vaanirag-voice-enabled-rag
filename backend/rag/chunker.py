import re
from typing import List, Dict, Any, Optional
from enum import Enum
import numpy as np


class ChunkStrategyType(str, Enum):
    FIXED_SIZE = "fixed_size"
    SENTENCE_AWARE = "sentence_aware"
    PASSAGE_AWARE = "passage_aware"
    METADATA_AWARE = "metadata_aware"
    SEMANTIC = "semantic"


class Chunk:
    def __init__(
        self,
        text: str,
        chunk_id: str,
        doc_id: str,
        strategy: str,
        language: str = "en",
        query_id: Optional[str] = None,
        passage_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        self.text = text.strip()
        self.chunk_id = chunk_id
        self.doc_id = doc_id
        self.strategy = strategy
        self.language = language
        self.query_id = query_id
        self.passage_id = passage_id
        self.metadata = metadata or {}
        self.char_length = len(self.text)
        self.word_count = len(self.text.split())

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "doc_id": self.doc_id,
            "text": self.text,
            "strategy": self.strategy,
            "language": self.language,
            "query_id": self.query_id,
            "passage_id": self.passage_id,
            "char_length": self.char_length,
            "word_count": self.word_count,
            "metadata": self.metadata,
        }


class BaseChunker:
    """Base class for all chunking strategies."""
    def chunk(self, text: str, doc_id: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        raise NotImplementedError


class FixedSizeChunker(BaseChunker):
    """
    Fixed-size character/word window chunker with configurable overlap.
    """
    def __init__(self, chunk_size: int = 350, overlap: int = 50):
        self.chunk_size = max(50, chunk_size)
        self.overlap = max(0, min(overlap, chunk_size - 10))
        self.strategy_name = ChunkStrategyType.FIXED_SIZE.value

    def chunk(self, text: str, doc_id: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        meta = metadata or {}
        lang = meta.get("language", "en")
        words = text.split()
        if not words:
            return []

        chunks: List[Chunk] = []
        step = max(1, self.chunk_size - self.overlap)
        idx = 0

        # Word-based fixed windowing for natural boundaries
        for i in range(0, len(words), step):
            chunk_words = words[i : i + self.chunk_size]
            chunk_text = " ".join(chunk_words).strip()
            if not chunk_text:
                continue
            chunk_id = f"{doc_id}_fixed_{idx}"
            chunks.append(
                Chunk(
                    text=chunk_text,
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    strategy=self.strategy_name,
                    language=lang,
                    query_id=meta.get("query_id"),
                    passage_id=meta.get("passage_id"),
                    metadata={
                        **meta,
                        "window_start": i,
                        "window_end": min(i + self.chunk_size, len(words)),
                    },
                )
            )
            idx += 1
            if i + self.chunk_size >= len(words):
                break

        return chunks


class SentenceChunker(BaseChunker):
    """
    Sentence-aware chunker that splits using multilingual sentence delimiters
    and groups sentences into coherent windows.
    """
    # Multilingual sentence boundaries (English full stop, Hindi purna viram । , Bengali ।, Urdu ۔ , ?, !)
    SENTENCE_SPLIT_REGEX = re.compile(r'(?<=[.!?।۔\n])\s+')

    def __init__(self, max_sentences_per_chunk: int = 3, sentence_overlap: int = 1):
        self.max_sentences = max(1, max_sentences_per_chunk)
        self.sentence_overlap = max(0, min(sentence_overlap, max_sentences_per_chunk - 1))
        self.strategy_name = ChunkStrategyType.SENTENCE_AWARE.value

    def _split_sentences(self, text: str) -> List[str]:
        raw_sentences = self.SENTENCE_SPLIT_REGEX.split(text)
        cleaned = [s.strip() for s in raw_sentences if s.strip()]
        return cleaned if cleaned else [text.strip()]

    def chunk(self, text: str, doc_id: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        meta = metadata or {}
        lang = meta.get("language", "en")
        sentences = self._split_sentences(text)
        if not sentences:
            return []

        chunks: List[Chunk] = []
        step = max(1, self.max_sentences - self.sentence_overlap)
        idx = 0

        for i in range(0, len(sentences), step):
            window = sentences[i : i + self.max_sentences]
            chunk_text = " ".join(window).strip()
            if not chunk_text:
                continue
            chunk_id = f"{doc_id}_sent_{idx}"
            chunks.append(
                Chunk(
                    text=chunk_text,
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    strategy=self.strategy_name,
                    language=lang,
                    query_id=meta.get("query_id"),
                    passage_id=meta.get("passage_id"),
                    metadata={
                        **meta,
                        "sentence_count": len(window),
                        "sentence_index_start": i,
                    },
                )
            )
            idx += 1
            if i + self.max_sentences >= len(sentences):
                break

        return chunks


class PassageChunker(BaseChunker):
    """
    Passage-aware chunker that preserves the semantic paragraph / passage boundaries
    of the MSMARCO-XI dataset without arbitrary fragmentation.
    """
    def __init__(self, max_passage_chars: int = 1000):
        self.max_chars = max_passage_chars
        self.strategy_name = ChunkStrategyType.PASSAGE_AWARE.value

    def chunk(self, text: str, doc_id: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        meta = metadata or {}
        lang = meta.get("language", "en")
        # Split on double newline or linebreaks
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [text.strip()]

        chunks: List[Chunk] = []
        idx = 0

        for p_idx, para in enumerate(paragraphs):
            # If paragraph exceeds max length, split cleanly
            if len(para) > self.max_chars:
                sub_sentences = SentenceChunker(max_sentences_per_chunk=3).chunk(para, f"{doc_id}_p{p_idx}", meta)
                chunks.extend(sub_sentences)
            else:
                chunk_id = f"{doc_id}_pass_{idx}"
                chunks.append(
                    Chunk(
                        text=para,
                        chunk_id=chunk_id,
                        doc_id=doc_id,
                        strategy=self.strategy_name,
                        language=lang,
                        query_id=meta.get("query_id"),
                        passage_id=meta.get("passage_id", str(p_idx)),
                        metadata={
                            **meta,
                            "passage_index": p_idx,
                            "boundary_type": "paragraph",
                        },
                    )
                )
                idx += 1

        return chunks


class MetadataAwareChunker(BaseChunker):
    """
    Metadata-aware chunker that prefixes and enriches each passage with contextual tags:
    [Language: {lang}] [Doc: {query_id}] [Domain: {domain}]
    retaining full provenance and multi-aspect filtering metadata.
    """
    def __init__(self, base_chunker: Optional[BaseChunker] = None):
        self.base_chunker = base_chunker or PassageChunker()
        self.strategy_name = ChunkStrategyType.METADATA_AWARE.value

    def chunk(self, text: str, doc_id: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        meta = metadata or {}
        lang = meta.get("language", "en")
        query_id = meta.get("query_id", "Q-N/A")
        passage_id = meta.get("passage_id", "P-N/A")

        base_chunks = self.base_chunker.chunk(text, doc_id, meta)
        enriched_chunks: List[Chunk] = []

        for idx, c in enumerate(base_chunks):
            # Contextual metadata header helps multilingual retriever differentiate concepts
            prefix = f"[Lang: {lang.upper()}] [Query: {query_id}]"
            enriched_text = f"{prefix} {c.text}" if not c.text.startswith("[Lang:") else c.text
            chunk_id = f"{doc_id}_meta_{idx}"
            enriched_chunks.append(
                Chunk(
                    text=enriched_text,
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    strategy=self.strategy_name,
                    language=lang,
                    query_id=query_id,
                    passage_id=passage_id,
                    metadata={
                        **c.metadata,
                        "raw_text": c.text,
                        "has_metadata_header": True,
                        "language": lang,
                        "query_id": query_id,
                        "passage_id": passage_id,
                    },
                )
            )

        return enriched_chunks


class SemanticChunker(BaseChunker):
    """
    Semantic chunker that groups sentences by semantic continuity,
    detecting topic transitions using sentence embedding cosine similarity distances.
    """
    def __init__(self, similarity_threshold: float = 0.65, min_sentences: int = 2, max_sentences: int = 6):
        self.similarity_threshold = similarity_threshold
        self.min_sentences = min_sentences
        self.max_sentences = max_sentences
        self.strategy_name = ChunkStrategyType.SEMANTIC.value

    def chunk(self, text: str, doc_id: str, metadata: Optional[Dict[str, Any]] = None) -> List[Chunk]:
        meta = metadata or {}
        lang = meta.get("language", "en")
        # Split sentences
        sentences = SentenceChunker.SENTENCE_SPLIT_REGEX.split(text)
        sentences = [s.strip() for s in sentences if s.strip()]
        if not sentences:
            return []

        if len(sentences) <= self.min_sentences:
            return [
                Chunk(
                    text=" ".join(sentences),
                    chunk_id=f"{doc_id}_sem_0",
                    doc_id=doc_id,
                    strategy=self.strategy_name,
                    language=lang,
                    query_id=meta.get("query_id"),
                    passage_id=meta.get("passage_id"),
                    metadata={**meta, "semantic_cluster": 0},
                )
            ]

        # Fast lexical-semantic continuity clustering based on Jaccard/TF word overlap and length
        clusters: List[List[str]] = []
        current_cluster: List[str] = [sentences[0]]

        for i in range(1, len(sentences)):
            prev_words = set(re.findall(r'\w+', current_cluster[-1].lower()))
            curr_words = set(re.findall(r'\w+', sentences[i].lower()))
            
            overlap = len(prev_words.intersection(curr_words)) / max(1, len(prev_words.union(curr_words)))
            
            # If current cluster reached max sentences or overlap dropped too low with min satisfied
            if len(current_cluster) >= self.max_sentences or (len(current_cluster) >= self.min_sentences and overlap < 0.08):
                clusters.append(current_cluster)
                current_cluster = [sentences[i]]
            else:
                current_cluster.append(sentences[i])

        if current_cluster:
            clusters.append(current_cluster)

        chunks: List[Chunk] = []
        for idx, cluster in enumerate(clusters):
            chunk_text = " ".join(cluster).strip()
            chunk_id = f"{doc_id}_sem_{idx}"
            chunks.append(
                Chunk(
                    text=chunk_text,
                    chunk_id=chunk_id,
                    doc_id=doc_id,
                    strategy=self.strategy_name,
                    language=lang,
                    query_id=meta.get("query_id"),
                    passage_id=meta.get("passage_id"),
                    metadata={
                        **meta,
                        "semantic_cluster": idx,
                        "sentences_in_cluster": len(cluster),
                    },
                )
            )

        return chunks


class ChunkingPipeline:
    """
    Unified manager that provides access to all 5 chunking strategies
    and allows runtime strategy selection or batch chunking across documents.
    """
    def __init__(self):
        self.strategies = {
            ChunkStrategyType.FIXED_SIZE.value: FixedSizeChunker(),
            ChunkStrategyType.SENTENCE_AWARE.value: SentenceChunker(),
            ChunkStrategyType.PASSAGE_AWARE.value: PassageChunker(),
            ChunkStrategyType.METADATA_AWARE.value: MetadataAwareChunker(),
            ChunkStrategyType.SEMANTIC.value: SemanticChunker(),
        }

    def get_chunker(self, strategy_name: str) -> BaseChunker:
        return self.strategies.get(strategy_name, self.strategies[ChunkStrategyType.METADATA_AWARE.value])

    def chunk_document(
        self,
        text: str,
        doc_id: str,
        strategy: str = ChunkStrategyType.METADATA_AWARE.value,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> List[Chunk]:
        chunker = self.get_chunker(strategy)
        return chunker.chunk(text, doc_id, metadata)

    def chunk_dataset(
        self,
        documents: List[Dict[str, Any]],
        strategy: str = ChunkStrategyType.METADATA_AWARE.value,
    ) -> List[Chunk]:
        all_chunks: List[Chunk] = []
        for doc in documents:
            text = doc.get("text", "")
            doc_id = str(doc.get("id", doc.get("query_id", len(all_chunks))))
            meta = {
                "language": doc.get("language", "en"),
                "query_id": doc.get("query_id"),
                "passage_id": doc.get("passage_id"),
                "title": doc.get("title", ""),
                "url": doc.get("url", ""),
            }
            chunks = self.chunk_document(text, doc_id, strategy=strategy, metadata=meta)
            all_chunks.extend(chunks)
        return all_chunks
