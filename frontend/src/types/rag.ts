export type VoiceState = 'IDLE' | 'RECORDING' | 'PROCESSING' | 'ANSWERING' | 'COMPLETED' | 'ERROR';

export type ChunkStrategy = 'fixed_size' | 'sentence_aware' | 'passage_aware' | 'metadata_aware' | 'semantic';

export interface SourceChunk {
  id: string;
  rank: number;
  score: number;
  semantic_score?: number;
  bm25_score?: number;
  rerank_score?: number;
  language: string;
  strategy: string;
  query_id?: string;
  passage_id?: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface GuardrailStatus {
  passed: boolean;
  grounded: boolean;
  guardrails_triggered: string[];
  input_valid: boolean;
  relevance_valid: boolean;
  score_valid: boolean;
  grounding_verified: boolean;
  safety_valid: boolean;
  confidence_score: number;
  details?: Record<string, any>;
}

export interface LatencyBreakdown {
  stt_ms: number;
  embedding_ms: number;
  faiss_ms: number;
  bm25_ms: number;
  hybrid_fusion_ms: number;
  reranking_ms: number;
  generation_ms: number;
  guardrails_ms: number;
  retrieval_core_ms: number;
  total_ms: number;
}

export interface RAGResponse {
  request_id: string;
  query: string;
  transcript?: string;
  language: string;
  answer: string;
  sources: SourceChunk[];
  retrieval: Record<string, any>;
  guardrails: GuardrailStatus;
  latency: LatencyBreakdown;
  cached: boolean;
}

export interface BenchmarkItem {
  query_id: string;
  query: string;
  expected_language: string;
  latency_ms: number;
  retrieval_core_ms: number;
  sources_retrieved: number;
  top_score: number;
  grounded: boolean;
  status: string;
}

export interface EvaluationSummary {
  total_queries: number;
  successful_queries: number;
  failed_queries: number;
  grounded_percentage: number;
  avg_latency_ms: number;
  avg_retrieval_core_ms: number;
  p50_latency_ms: number;
  p70_latency_ms: number;
  p100_latency_ms: number;
  min_latency_ms: number;
  max_latency_ms: number;
  target_sub200ms_compliance_rate: number;
  query_samples: BenchmarkItem[];
}

export interface SystemStatus {
  backend_status: string;
  vector_index_ready: boolean;
  dataset_loaded: boolean;
  embedding_model_ready: boolean;
  sarvam_api_connected: boolean;
  sarvam_api_key_configured: boolean;
  last_index_build?: string;
  total_documents: number;
  total_chunks: number;
  embedding_model_name: string;
  active_chunking_strategies: string[];
  cache_entries: number;
}

export interface TextQueryPayload {
  query: string;
  language?: string;
  top_k?: number;
  chunk_strategy?: ChunkStrategy;
  semantic_weight?: number;
  bm25_weight?: number;
  rerank?: boolean;
}

export interface VoiceQueryPayload {
  query?: string;
  audio_base64?: string;
  language?: string;
  top_k?: number;
  chunk_strategy?: ChunkStrategy;
  semantic_weight?: number;
  bm25_weight?: number;
  rerank?: boolean;
}
