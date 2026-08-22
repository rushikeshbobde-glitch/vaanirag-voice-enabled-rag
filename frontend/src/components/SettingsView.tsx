import React, { useState, useEffect } from 'react';
import { Sliders, Layers, Zap, Globe, Key, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import type { ChunkStrategy } from '../types/rag';
import { ragApi, DEFAULT_PRODUCTION_BACKEND, getApiBase } from '../services/api';

interface SettingsViewProps {
  chunkStrategy: ChunkStrategy;
  setChunkStrategy: (strat: ChunkStrategy) => void;
  semanticWeight: number;
  setSemanticWeight: (w: number) => void;
  topK: number;
  setTopK: (k: number) => void;
  rerankEnabled: boolean;
  setRerankEnabled: (r: boolean) => void;
}

const STRATEGIES: { id: ChunkStrategy; name: string; desc: string }[] = [
  {
    id: 'metadata_aware',
    name: 'Metadata-Enriched Provenance',
    desc: 'Prefixes language tags, document IDs, and query mappings to preserve multi-aspect search context.',
  },
  {
    id: 'passage_aware',
    name: 'Passage-Aware MSMARCO',
    desc: 'Preserves original dataset paragraph boundaries without arbitrary sentence truncation.',
  },
  {
    id: 'sentence_aware',
    name: 'Sentence-Aware Multi-Language',
    desc: 'Splits using Indian and Latin sentence delimiters (। , ! , ?) with overlapping sliding windows.',
  },
  {
    id: 'semantic',
    name: 'Semantic Distance Clustering',
    desc: 'Dynamically clusters sentences based on semantic similarity transitions.',
  },
  {
    id: 'fixed_size',
    name: 'Fixed-Size Sliding Window',
    desc: 'Splits text into fixed word/character intervals with configurable overlap.',
  },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  chunkStrategy,
  setChunkStrategy,
  semanticWeight,
  setSemanticWeight,
  topK,
  setTopK,
  rerankEnabled,
  setRerankEnabled,
}) => {
  const [backendUrl, setBackendUrl] = useState<string>(DEFAULT_PRODUCTION_BACKEND);
  const [connectionStatus, setConnectionStatus] = useState<'IDLE' | 'TESTING' | 'CONNECTED' | 'ERROR'>('IDLE');
  const [connectionMsg, setConnectionMsg] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [apiKeyStatus, setApiKeyStatus] = useState<string>('');

  useEffect(() => {
    const saved = localStorage.getItem('vaanirag_backend_url') || (import.meta as any).env?.VITE_API_BASE_URL || DEFAULT_PRODUCTION_BACKEND;
    setBackendUrl(saved);
  }, []);

  const handleTestConnection = async () => {
    setConnectionStatus('TESTING');
    setConnectionMsg('Pinging backend /api/health...');
    try {
      ragApi.setBackendUrl(backendUrl);
      const res = await ragApi.getHealth();
      setConnectionStatus('CONNECTED');
      setConnectionMsg(`Connected successfully to ${res.service || 'VaaniRAG Backend'} (v${res.version})!`);
    } catch (err: any) {
      setConnectionStatus('ERROR');
      setConnectionMsg(`Connection failed: ${err.message || 'Unable to reach backend URL'}. Make sure your backend service is running.`);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKeyInput.trim()) return;
    try {
      setApiKeyStatus('Saving key to backend...');
      await ragApi.updateApiKey(apiKeyInput.trim());
      setApiKeyStatus('Sarvam AI API key saved and activated successfully!');
    } catch (err: any) {
      setApiKeyStatus(`Error saving key: ${err.message}`);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800/80 space-y-8 shadow-2xl">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <span>RAG Pipeline Configuration & Deployment Settings</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Configure live backend endpoints, chunking strategies, hybrid weights, and Sarvam AI credentials
        </p>
      </div>

      {/* Live Backend Connection (Netlify / Vercel Integration) */}
      <div className="p-5 rounded-xl bg-slate-950/70 border border-indigo-500/30 space-y-3 shadow-inner">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>Backend Service URL (Netlify / Vercel Cloud Connection)</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">
            Active: {getApiBase()}
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          If deployed on Netlify or Vercel, paste your live backend URL below (e.g. <code>https://vaanirag-backend.onrender.com</code> or <code>http://localhost:8000</code>).
        </p>

        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="e.g., https://vaanirag-backend.onrender.com or http://localhost:8000"
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
          />
          <button
            onClick={handleTestConnection}
            disabled={connectionStatus === 'TESTING'}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            {connectionStatus === 'TESTING' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Globe className="w-3.5 h-3.5" />
            )}
            <span>{connectionStatus === 'TESTING' ? 'Testing...' : 'Test & Connect'}</span>
          </button>
        </div>

        {connectionStatus === 'CONNECTED' && (
          <div className="flex items-center space-x-2 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{connectionMsg}</span>
          </div>
        )}

        {connectionStatus === 'ERROR' && (
          <div className="flex items-center space-x-2 p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{connectionMsg}</span>
          </div>
        )}
      </div>

      {/* Multi-Strategy Chunking Selection */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>Active Chunking Strategy</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {STRATEGIES.map((strat) => {
            const isSelected = chunkStrategy === strat.id;
            return (
              <div
                key={strat.id}
                onClick={() => setChunkStrategy(strat.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                    {strat.name}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{strat.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hybrid Retrieval Weight Slider */}
      <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
            <Zap className="w-4 h-4 text-purple-400" />
            <span>Hybrid Retrieval Score Weights</span>
          </h3>
          <span className="text-xs font-mono text-cyan-400 font-bold">
            FAISS: {(semanticWeight * 100).toFixed(0)}% | BM25: {((1 - semanticWeight) * 100).toFixed(0)}%
          </span>
        </div>

        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={semanticWeight}
          onChange={(e) => setSemanticWeight(parseFloat(e.target.value))}
          className="w-full accent-indigo-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
        />

        <div className="flex justify-between text-xs text-slate-400 font-mono">
          <span>0.0 (Pure BM25)</span>
          <span>0.5 (Balanced)</span>
          <span>1.0 (Pure Dense Vector)</span>
        </div>
      </div>

      {/* Top K & Reranker Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
          <label className="text-xs font-bold text-slate-300 block">
            Final Top-K Context Passages ({topK})
          </label>
          <select
            value={topK}
            onChange={(e) => setTopK(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value={3}>3 Passages (Ultra-fast, lowest latency)</option>
            <option value={5}>5 Passages (Recommended balanced)</option>
            <option value={8}>8 Passages (High context depth)</option>
            <option value={10}>10 Passages (Comprehensive analysis)</option>
          </select>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">Fast Cross-Reranker</span>
            <input
              type="checkbox"
              checked={rerankEnabled}
              onChange={(e) => setRerankEnabled(e.target.checked)}
              className="accent-indigo-500 w-4 h-4 cursor-pointer"
            />
          </div>
          <p className="text-[11px] text-slate-400">
            Enables term density scoring and language alignment filtering to optimize top candidates.
          </p>
        </div>
      </div>

      {/* Sarvam AI Key Configuration */}
      <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
          <Key className="w-4 h-4 text-emerald-400" />
          <span>Sarvam AI Credentials (Optional)</span>
        </h3>
        <p className="text-xs text-slate-400">
          Enter your Sarvam AI API key for Saaras v3 STT and 105B LLM generation. If left blank, high-accuracy local grounded synthesis is used.
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Paste your SARVAM_API_KEY here..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
          <button
            onClick={handleSaveApiKey}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20"
          >
            Save Key
          </button>
        </div>
        {apiKeyStatus && (
          <p className="text-xs text-emerald-300 font-medium">{apiKeyStatus}</p>
        )}
      </div>
    </div>
  );
};
