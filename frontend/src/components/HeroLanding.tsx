import React from 'react';
import {
  Mic,
  Sparkles,
  ArrowRight,
  Database,
  ShieldCheck,
  Zap,
  Globe,
  LineChart,
} from 'lucide-react';

interface HeroLandingProps {
  onStartVoice: () => void;
  onExplore: () => void;
  onOpenDemo: () => void;
}

export const HeroLanding: React.FC<HeroLandingProps> = ({
  onStartVoice,
  onExplore,
  onOpenDemo,
}) => {
  return (
    <div className="space-y-16 py-6 sm:py-10">
      {/* Hero Section */}
      <div className="text-center space-y-6 max-w-4xl mx-auto relative">
        {/* Glow backdrop */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-500/20 via-cyan-500/20 to-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 shadow-md">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs font-semibold text-slate-300">
            HH Goa 2026 Submission • Multilingual Voice RAG
          </span>
        </div>

        {/* Title */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-100">
          Vaani<span className="text-cyan-400">RAG</span>
          <span className="block text-xl sm:text-2xl font-medium mt-3 bg-gradient-to-r from-indigo-300 via-cyan-200 to-indigo-400 bg-clip-text text-transparent">
            Multilingual Voice-Enabled Retrieval Intelligence
          </span>
        </h1>

        {/* Tagline */}
        <p className="text-base sm:text-xl text-slate-300 font-light max-w-2xl mx-auto leading-relaxed">
          “Speak naturally. Retrieve precisely. Answer with evidence.”
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <button
            onClick={onStartVoice}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 hover:scale-105 transition-all duration-200"
          >
            <Mic className="w-4 h-4" />
            <span>Start Voice Query</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenDemo}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-semibold text-sm shadow-md transition-all duration-200"
          >
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Interactive Demo</span>
          </button>

          <button
            onClick={onExplore}
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800 font-semibold text-sm transition-all duration-200"
          >
            <span>Explore System</span>
          </button>
        </div>
      </div>

      {/* Architecture Flow Preview */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800/80 max-w-5xl mx-auto space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 text-center">
          End-to-End Multilingual Voice Intelligence Architecture
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <Mic className="w-5 h-5 text-indigo-400 mx-auto" />
            <div className="font-bold text-slate-200">Voice Input</div>
            <div className="text-[10px] text-slate-500">Web Audio API</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <Zap className="w-5 h-5 text-cyan-400 mx-auto" />
            <div className="font-bold text-slate-200">STT</div>
            <div className="text-[10px] text-slate-500">Sarvam Saaras v3</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <Database className="w-5 h-5 text-blue-400 mx-auto" />
            <div className="font-bold text-slate-200">Hybrid Search</div>
            <div className="text-[10px] text-slate-500">FAISS + BM25</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <Sparkles className="w-5 h-5 text-purple-400 mx-auto" />
            <div className="font-bold text-slate-200">Reranker</div>
            <div className="text-[10px] text-slate-500">Feature Scoring</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <Sparkles className="w-5 h-5 text-pink-400 mx-auto" />
            <div className="font-bold text-slate-200">Generation</div>
            <div className="text-[10px] text-slate-500">Sarvam Chat LLM</div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto" />
            <div className="font-bold text-slate-200">Verified</div>
            <div className="text-[10px] text-slate-500">6 Guardrails</div>
          </div>
        </div>
      </div>

      {/* Feature Cards Grid (6 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
        {/* Card 1: Voice AI */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
            <Mic className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Voice AI & Transcription</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Native browser audio capture with real-time waveform visualization, integrated directly into Sarvam Saaras v3 STT.
          </p>
        </div>

        {/* Card 2: Hybrid Retrieval */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">FAISS + BM25 Hybrid Fusion</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Combines dense vector similarity with sparse BM25 lexical token matching using weighted reciprocal score normalization.
          </p>
        </div>

        {/* Card 3: Multilingual RAG */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Globe className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">10+ Indic Languages</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Native support for Hindi, Marathi, Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, and English from AI4Bharat/MSMARCO-XI.
          </p>
        </div>

        {/* Card 4: Grounded Answers */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">Grounded Answer Generation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Strict context-injected prompts with numbered source citations and automatic factual grounding verification.
          </p>
        </div>

        {/* Card 5: Real-Time Analytics */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
            <LineChart className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">P50 / P70 / P100 Analytics</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Live empirical latency measurement tracking sub-200ms retrieval budgets across individual pipeline stages.
          </p>
        </div>

        {/* Card 6: 6-Layer Guardrails */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 border border-slate-800/80 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 text-pink-400 border border-pink-500/30 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-100">6-Layer Guardrails</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Multi-stage safety filters for empty queries, off-topic prompts, low retrieval scores, hallucination, and API resilience.
          </p>
        </div>
      </div>
    </div>
  );
};
