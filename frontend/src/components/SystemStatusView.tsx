import React, { useState, useEffect } from 'react';
import {
  Server,
  Database,
  Cpu,
  RefreshCw,
  Hammer,
  CheckCircle2,
  Radio,
  FileText,
  Layers,
} from 'lucide-react';
import { ragApi } from '../services/api';
import type { SystemStatus } from '../types/rag';

export const SystemStatusView: React.FC = () => {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await ragApi.getSystemStatus();
      setStatus(data);
    } catch (e) {
      console.error('Error fetching system status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleReload = async () => {
    setActionMsg('Reloading index from disk...');
    try {
      const res = await ragApi.reloadIndex();
      setActionMsg(`Index reloaded! ${res.chunks_loaded} chunks active.`);
      await fetchStatus();
    } catch (e: any) {
      setActionMsg(`Reload failed: ${e.message}`);
    }
  };

  const handleRebuild = async () => {
    setActionMsg('Rebuilding vector index across 5 strategies (may take a moment)...');
    try {
      const res = await ragApi.buildIndex(500);
      setActionMsg(`Index rebuild complete: ${res.message}`);
      await fetchStatus();
    } catch (e: any) {
      setActionMsg(`Rebuild failed: ${e.message}`);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800/80 space-y-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Server className="w-5 h-5 text-indigo-400" />
            <span>Infrastructure & System Status</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time health telemetry for FastAPI services, FAISS vector DB, and Sarvam AI APIs
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {actionMsg && (
        <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionMsg}</span>
        </div>
      )}

      {/* Grid of Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Backend Server */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400">FastAPI Backend</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {status?.backend_status || 'ONLINE'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-100 mt-1">Uvicorn Asynchronous Service</p>
            <span className="text-[10px] text-slate-500">Port 8000 • CORS Enabled</span>
          </div>
        </div>

        {/* Vector DB / FAISS */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400">Vector Index (FAISS)</h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  status?.vector_index_ready
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}
              >
                {status?.vector_index_ready ? 'READY' : 'BUILDING'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-100 mt-1">{status?.total_chunks ?? 0} Chunks Indexed</p>
            <span className="text-[10px] text-slate-500">FlatIP Inner-Product Search</span>
          </div>
        </div>

        {/* Dataset */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400">Dataset (MSMARCO-XI)</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {status?.dataset_loaded ? 'LOADED' : 'PENDING'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-100 mt-1">{status?.total_documents ?? 0} Source Documents</p>
            <span className="text-[10px] text-slate-500">10+ Indic Languages + English</span>
          </div>
        </div>

        {/* Embedding Model */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400">Embedding Model</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-xs font-bold text-slate-100 mt-1 truncate">
              {status?.embedding_model_name?.split('/')[1] || 'paraphrase-multilingual-MiniLM-L12-v2'}
            </p>
            <span className="text-[10px] text-slate-500">384-dimensional dense vectors</span>
          </div>
        </div>

        {/* Sarvam AI API */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400">Sarvam AI Gateway</h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  status?.sarvam_api_key_configured
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {status?.sarvam_api_key_configured ? 'CONNECTED' : 'LOCAL SYNTHESIS'}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-100 mt-1">Saaras v3 STT & Chat LLM</p>
            <span className="text-[10px] text-slate-500">
              {status?.sarvam_api_key_configured ? 'Key Configured via Backend .env' : 'Ready for live API Key'}
            </span>
          </div>
        </div>

        {/* In-Memory LRU Cache */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-400">In-Memory LRU Cache</h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ACTIVE
              </span>
            </div>
            <p className="text-sm font-bold text-slate-100 mt-1">{status?.cache_entries ?? 0} Cached Queries</p>
            <span className="text-[10px] text-slate-500">&lt; 1ms sub-millisecond retrieval</span>
          </div>
        </div>
      </div>

      {/* Chunking Strategies Active */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-slate-300">Multi-Strategy Chunking Modules Loaded:</h4>
        <div className="flex flex-wrap gap-2">
          {status?.active_chunking_strategies?.map((strat) => (
            <span
              key={strat}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-900 border border-slate-800 text-indigo-300 font-medium"
            >
              ✓ {strat}
            </span>
          ))}
        </div>
        <div className="text-[11px] text-slate-500 pt-1">
          Last Index Build: <span className="text-slate-400 font-mono">{status?.last_index_build || 'Initial Build'}</span>
        </div>
      </div>

      {/* Administrative Operations */}
      <div className="pt-2 flex items-center space-x-3">
        <button
          onClick={handleReload}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors flex items-center space-x-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reload Index from Disk</span>
        </button>

        <button
          onClick={handleRebuild}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-md shadow-indigo-500/20 transition-all flex items-center space-x-2"
        >
          <Hammer className="w-3.5 h-3.5" />
          <span>Rebuild Full Index</span>
        </button>
      </div>
    </div>
  );
};
