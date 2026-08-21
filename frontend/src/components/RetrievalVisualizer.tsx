import React from 'react';
import {
  GitMerge,
  Database,
  Search,
  Filter,
  Sparkles,
  Layers,
} from 'lucide-react';
import type { RAGResponse } from '../types/rag';

interface RetrievalVisualizerProps {
  response: RAGResponse | null;
}

export const RetrievalVisualizer: React.FC<RetrievalVisualizerProps> = ({ response }) => {
  if (!response) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-slate-800 text-center space-y-3">
        <GitMerge className="w-10 h-10 text-slate-600 mx-auto animate-pulse" />
        <h3 className="text-base font-bold text-slate-300">Retrieval Pipeline Visualizer</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Execute a voice or text query in the Workspace to visualize the real-time FAISS dense search,
          BM25 lexical search, reciprocal score fusion, and reranking stages.
        </p>
      </div>
    );
  }

  const lat = response.latency;

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800/80 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <GitMerge className="w-5 h-5 text-cyan-400" />
            <span>Hybrid Retrieval Pipeline Visualizer</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-stage vector and lexical score fusion for query: <em className="text-slate-200">"{response.query}"</em>
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono text-emerald-400 font-semibold">
            Core Retrieval: {lat.retrieval_core_ms.toFixed(1)} ms
          </span>
        </div>
      </div>

      {/* Pipeline Flowchart Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative items-stretch">
        {/* Step 1: Input Query & Multilingual Embedding */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                Step 1: Embed
              </span>
              <span className="text-[11px] font-mono text-slate-400">{lat.embedding_ms.toFixed(1)}ms</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Search className="w-3.5 h-3.5 text-indigo-400" />
              <span>Query Embedding</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              SentenceTransformer (384-dim normalized)
            </p>
          </div>
          <div className="text-[10px] font-mono text-indigo-300 bg-slate-950 p-2 rounded truncate">
            lang: {response.language}
          </div>
        </div>

        {/* Step 2: Parallel Dual Search (FAISS + BM25) */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                Step 2: Dual Search
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {(lat.faiss_ms + lat.bm25_ms).toFixed(1)}ms
              </span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dense + Sparse</span>
            </h4>
            <div className="space-y-1 mt-2 text-[11px] text-slate-400">
              <div className="flex justify-between">
                <span>FAISS FlatIP:</span>
                <span className="text-cyan-300 font-mono">{lat.faiss_ms.toFixed(1)}ms</span>
              </div>
              <div className="flex justify-between">
                <span>BM25 Lexical:</span>
                <span className="text-cyan-300 font-mono">{lat.bm25_ms.toFixed(1)}ms</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] font-mono text-cyan-300 bg-slate-950 p-2 rounded">
            Top candidates fetched
          </div>
        </div>

        {/* Step 3: Hybrid Score Fusion */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                Step 3: Fusion
              </span>
              <span className="text-[11px] font-mono text-slate-400">{lat.hybrid_fusion_ms.toFixed(1)}ms</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <GitMerge className="w-3.5 h-3.5 text-purple-400" />
              <span>Weighted Fusion</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              0.70 × FAISS + 0.30 × BM25
            </p>
          </div>
          <div className="text-[10px] font-mono text-purple-300 bg-slate-950 p-2 rounded">
            Candidate pool created
          </div>
        </div>

        {/* Step 4: Fast Reranking */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Step 4: Reranker
              </span>
              <span className="text-[11px] font-mono text-slate-400">{lat.reranking_ms.toFixed(1)}ms</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Filter className="w-3.5 h-3.5 text-emerald-400" />
              <span>Cross-Ranking</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Term density + exact match + language filter
            </p>
          </div>
          <div className="text-[10px] font-mono text-emerald-300 bg-slate-950 p-2 rounded">
            Top {response.sources.length} Context Chunks
          </div>
        </div>

        {/* Step 5: Grounded LLM Generation */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-pink-500/20 text-pink-300">
                Step 5: LLM
              </span>
              <span className="text-[11px] font-mono text-slate-400">{lat.generation_ms.toFixed(1)}ms</span>
            </div>
            <h4 className="text-xs font-bold text-slate-200 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-400" />
              <span>Sarvam Chat</span>
            </h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Strict context grounding prompt
            </p>
          </div>
          <div className="text-[10px] font-mono text-pink-300 bg-slate-950 p-2 rounded">
            Confidence: {Math.round(response.guardrails.confidence_score * 100)}%
          </div>
        </div>
      </div>

      {/* Retrieved Chunks Real-time List */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Final Context Passages Injected into LLM ({response.sources.length})</span>
        </h3>
        <div className="space-y-2">
          {response.sources.map((src) => (
            <div
              key={src.id}
              className="p-3 rounded-lg bg-slate-950/60 border border-slate-850 flex items-center justify-between text-xs text-slate-300"
            >
              <div className="flex items-center space-x-3 truncate">
                <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold flex items-center justify-center text-[10px]">
                  #{src.rank}
                </span>
                <span className="font-mono text-slate-400">{src.id}</span>
                <span className="truncate text-slate-300 max-w-lg">{src.text}</span>
              </div>
              <div className="flex items-center space-x-3 shrink-0 font-mono">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">{src.strategy}</span>
                <span className="text-cyan-300 font-bold">{src.score.toFixed(3)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
