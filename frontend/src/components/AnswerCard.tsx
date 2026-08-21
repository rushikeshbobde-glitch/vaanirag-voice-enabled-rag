import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Layers,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Cpu,
} from 'lucide-react';
import type { RAGResponse } from '../types/rag';

interface AnswerCardProps {
  response: RAGResponse | null;
  isLoading: boolean;
}

export const AnswerCard: React.FC<AnswerCardProps> = ({ response, isLoading }) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-slate-800 rounded w-1/4" />
          <div className="h-5 bg-slate-800 rounded w-1/6" />
        </div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-800/80 rounded w-full" />
          <div className="h-4 bg-slate-800/80 rounded w-5/6" />
          <div className="h-4 bg-slate-800/80 rounded w-4/6" />
        </div>
        <div className="grid grid-cols-4 gap-3 pt-4 border-t border-slate-800">
          <div className="h-10 bg-slate-800/60 rounded-xl" />
          <div className="h-10 bg-slate-800/60 rounded-xl" />
          <div className="h-10 bg-slate-800/60 rounded-xl" />
          <div className="h-10 bg-slate-800/60 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!response) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(response.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      if (isPlayingAudio) {
        window.speechSynthesis.cancel();
        setIsPlayingAudio(false);
      } else {
        const cleanText = response.answer.replace(/\[Source #\d+\]/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.onend = () => setIsPlayingAudio(false);
        utterance.onerror = () => setIsPlayingAudio(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingAudio(true);
      }
    }
  };

  const confidencePct = Math.round(response.guardrails.confidence_score * 100);
  const isGrounded = response.guardrails.grounded && response.guardrails.passed;

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-7 border border-slate-800/80 shadow-2xl relative overflow-hidden space-y-6">
      {/* Top Banner */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center shadow-md shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-100 flex items-center space-x-2">
              <span>Grounded AI Answer</span>
              {response.cached && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Cached
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400">
              Request ID: <code className="text-indigo-300">{response.request_id}</code>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSpeak}
            title={isPlayingAudio ? 'Stop Speech' : 'Listen to Answer'}
            className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/60 transition-colors"
          >
            {isPlayingAudio ? <VolumeX className="w-4 h-4 text-cyan-400 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <button
            onClick={handleCopy}
            title="Copy Answer"
            className="p-2 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-700/60 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Answer Content */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-100 text-sm sm:text-base leading-relaxed tracking-wide shadow-inner">
        {response.answer}
      </div>

      {/* Guardrail Warnings if any */}
      {response.guardrails.guardrails_triggered.length > 0 && (
        <div className="flex items-start space-x-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Guardrail Advisory: </span>
            <span>{response.guardrails.guardrails_triggered.join(', ')}</span>
          </div>
        </div>
      )}

      {/* Verified Analytics Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {/* Confidence */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Confidence</span>
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-extrabold text-indigo-300">{confidencePct}%</span>
            <span className="text-[10px] text-slate-500">factual</span>
          </div>
        </div>

        {/* Grounding Status */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Grounding</span>
            {isGrounded ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            )}
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span
              className={`text-sm font-bold ${
                isGrounded ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {isGrounded ? 'Verified Grounded' : 'Context Fallback'}
            </span>
          </div>
        </div>

        {/* Sources Count */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Sources</span>
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-extrabold text-cyan-300">{response.sources.length}</span>
            <span className="text-[10px] text-slate-500">passages</span>
          </div>
        </div>

        {/* Real Latency */}
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Total Latency</span>
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-xl font-extrabold text-emerald-300">
              {Math.round(response.latency.total_ms)}
            </span>
            <span className="text-[10px] text-slate-500">ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};
