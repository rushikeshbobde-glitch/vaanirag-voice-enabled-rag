import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { SourceChunk } from '../types/rag';

interface SourceCardProps {
  source: SourceChunk;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="glass-panel glass-panel-hover rounded-xl p-4 sm:p-5 border border-slate-800/80 transition-all duration-200 space-y-3">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="w-6 h-6 rounded-md bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center justify-center">
            #{source.rank}
          </span>
          <span className="text-xs font-semibold text-slate-200 font-mono">
            {source.id}
          </span>
        </div>

        {/* Score & Strategy Badges */}
        <div className="flex items-center space-x-2">
          {/* Strategy */}
          <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
            {source.strategy}
          </span>

          {/* Language */}
          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {source.language}
          </span>

          {/* Relevance Score */}
          <div className="flex items-center space-x-1 px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold">
            <span>Score:</span>
            <span>{source.score.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Passage Text */}
      <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans bg-slate-950/50 p-3 rounded-lg border border-slate-850">
        <p className={expanded ? '' : 'line-clamp-3'}>{source.text}</p>
      </div>

      {/* Expand/Collapse and Sub-scores */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
        <div className="flex items-center space-x-3 font-mono">
          {source.semantic_score !== undefined && (
            <span>FAISS: <strong className="text-indigo-300">{source.semantic_score.toFixed(3)}</strong></span>
          )}
          {source.bm25_score !== undefined && (
            <span>BM25: <strong className="text-cyan-300">{source.bm25_score.toFixed(3)}</strong></span>
          )}
          {source.rerank_score !== undefined && (
            <span>Rerank: <strong className="text-emerald-300">{source.rerank_score.toFixed(3)}</strong></span>
          )}
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center space-x-1 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>{expanded ? 'Collapse' : 'Expand full passage'}</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expanded Metadata Details */}
      {expanded && source.metadata && Object.keys(source.metadata).length > 0 && (
        <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[11px] space-y-1 font-mono text-slate-300 mt-2">
          <div className="text-slate-400 font-semibold mb-1">Passage Metadata Provenance:</div>
          {Object.entries(source.metadata).map(([k, v]) => (
            <div key={k} className="flex space-x-2">
              <span className="text-slate-500">{k}:</span>
              <span className="text-cyan-300 truncate">{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
