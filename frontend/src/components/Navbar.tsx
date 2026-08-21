import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  backendOnline: boolean;
  onOpenDemo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  backendOnline,
  onOpenDemo,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#070b14]/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Mic className="w-5 h-5 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                Vaani<span className="text-cyan-400">RAG</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                HH Goa 2026
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multilingual Voice-Enabled Retrieval Intelligence
            </p>
          </div>
        </div>

        {/* Action Controls & Status */}
        <div className="flex items-center space-x-3">
          {/* Quick Demo Mode Button */}
          <button
            onClick={onOpenDemo}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600/30 to-cyan-500/30 hover:from-indigo-600/50 hover:to-cyan-500/50 text-cyan-300 border border-cyan-500/40 text-xs font-semibold shadow-sm transition-all duration-200"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-spin-slow" />
            <span>Demo Mode</span>
          </button>

          {/* Quick Navigation to Voice */}
          <button
            onClick={() => setActiveTab('workspace')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'workspace'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            Workspace
          </button>

          {/* Backend Status Pill */}
          <div className="flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                backendOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
              }`}
            />
            <span className="text-slate-300 text-[11px] font-medium hidden md:inline">
              {backendOnline ? 'System Online' : 'Connecting...'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
