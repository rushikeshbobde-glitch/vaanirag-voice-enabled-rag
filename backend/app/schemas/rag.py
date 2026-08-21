from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


class SupportedLanguage(str, Enum):
    AUTO = "auto"
    ENGLISH = "en"
    HINDI = "hi"
    MARATHI = "mr"
    BENGALI = "bn"
    TAMIL = "ta"
    TELUGU = "te"
    GUJARATI = "gu"
    KANNADA = "kn"
    MALAYALAM = "ml"
    PUNJABI = "pa"


class ChunkStrategy(str, Enum):
    FIXED_SIZE = "fixed_size"
    SENTENCE_AWARE = "sentence_aware"
    PASSAGE_AWARE = "passage_aware"
    METADATA_AWARE = "metadata_aware"
    SEMANTIC = "semantic"


class TextQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="User question in natural language")
    language: Optional[str] = Field("auto", description="Language code (e.g. en, hi, mr) or auto")
    top_k: Optional[int] = Field(5, ge=1, le=50, description="Number of final context sources to return")
    chunk_strategy: Optional[ChunkStrategy] = Field(ChunkStrategy.METADATA_AWARE, description="Chunking strategy to prioritize")
    semantic_weight: Optional[float] = Field(0.7, ge=0.0, le=1.0, description="Weight for semantic vector retrieval")
    bm25_weight: Optional[float] = Field(0.3, ge=0.0, le=1.0, description="Weight for BM25 lexical retrieval")
    rerank: Optional[bool] = Field(True, description="Whether to apply secondary reranker")


class VoiceQueryRequest(BaseModel):
    query: Optional[str] = Field(None, description="Transcribed question text if available")
    audio_base64: Optional[str] = Field(None, description="Base64 encoded audio payload")
    language: Optional[str] = Field("auto", description="Language hint for STT")
    top_k: Optional[int] = Field(5, ge=1, le=50)
    chunk_strategy: Optional[ChunkStrategy] = Field(ChunkStrategy.METADATA_AWARE)
    semantic_weight: Optional[float] = Field(0.7, ge=0.0, le=1.0)
    bm25_weight: Optional[float] = Field(0.3, ge=0.0, le=1.0)
    rerank: Optional[bool] = Field(True)


class TranscribeResponse(BaseModel):
    transcript: str
    language: str
    confidence: Optional[float] = 0.95
    duration_seconds: Optional[float] = 0.0
    latency_ms: float = 0.0


class SourceChunk(BaseModel):
    id: str
    rank: int
    score: float
    semantic_score: Optional[float] = None
    bm25_score: Optional[float] = None
    rerank_score: Optional[float] = None
    language: str = "en"
    strategy: str = "metadata_aware"
    query_id: Optional[str] = None
    passage_id: Optional[str] = None
    text: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class RetrievalMetrics(BaseModel):
    semantic_count: int = 0
    bm25_count: int = 0
    fused_candidates_count: int = 0
    reranked_count: int = 0
    semantic_top_score: float = 0.0
    bm25_top_score: float = 0.0
    hybrid_top_score: float = 0.0


class GuardrailStatus(BaseModel):
    passed: bool = True
    grounded: bool = True
    guardrails_triggered: List[str] = Field(default_factory=list)
    input_valid: bool = True
    relevance_valid: bool = True
    score_valid: bool = True
    grounding_verified: bool = True
    safety_valid: bool = True
    confidence_score: float = 0.85
    details: Dict[str, Any] = Field(default_factory=dict)


class LatencyBreakdown(BaseModel):
    stt_ms: float = 0.0
    embedding_ms: float = 0.0
    faiss_ms: float = 0.0
    bm25_ms: float = 0.0
    hybrid_fusion_ms: float = 0.0
    reranking_ms: float = 0.0
    generation_ms: float = 0.0
    guardrails_ms: float = 0.0
    retrieval_core_ms: float = 0.0
    total_ms: float = 0.0


class RAGResponse(BaseModel):
    request_id: str
    query: str
    transcript: Optional[str] = None
    language: str = "en"
    answer: str
    sources: List[SourceChunk] = Field(default_factory=list)
    retrieval: Dict[str, Any] = Field(default_factory=dict)
    guardrails: GuardrailStatus
    latency: LatencyBreakdown
    cached: bool = False


class BenchmarkItem(BaseModel):
    query_id: str
    query: str
    expected_language: str
    latency_ms: float
    retrieval_core_ms: float
    sources_retrieved: int
    top_score: float
    grounded: bool
    status: str


class EvaluationSummary(BaseModel):
    total_queries: int
    successful_queries: int
    failed_queries: int
    grounded_percentage: float
    avg_latency_ms: float
    avg_retrieval_core_ms: float
    p50_latency_ms: float
    p70_latency_ms: float
    p100_latency_ms: float
    min_latency_ms: float
    max_latency_ms: float
    target_sub200ms_compliance_rate: float
    query_samples: List[BenchmarkItem] = Field(default_factory=list)


class SystemStatus(BaseModel):
    backend_status: str = "ONLINE"
    vector_index_ready: bool = False
    dataset_loaded: bool = False
    embedding_model_ready: bool = False
    sarvam_api_connected: bool = False
    sarvam_api_key_configured: bool = False
    last_index_build: Optional[str] = None
    total_documents: int = 0
    total_chunks: int = 0
    embedding_model_name: str = ""
    active_chunking_strategies: List[str] = Field(default_factory=list)
    cache_entries: int = 0
