import React from 'react';
import {
  Compass,
  Mic,
  GitMerge,
  Layers,
  LineChart,
  BarChart3,
  Server,
  Sliders,
  ShieldCheck,
  Languages,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
}

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: Compass, badge: null },
  { id: 'workspace', label: 'Voice Query', icon: Mic, badge: 'Live' },
  { id: 'retrieval', label: 'Retrieval Visualizer', icon: GitMerge, badge: null },
  { id: 'sources', label: 'Sources Provenance', icon: Layers, badge: null },
  { id: 'evaluation', label: 'Evaluation & Benchmarks', icon: LineChart, badge: null },
  { id: 'latency', label: 'Latency Analytics', icon: BarChart3, badge: '<200ms' },
  { id: 'system', label: 'System Health', icon: Server, badge: null },
  { id: 'settings', label: 'Settings & Strategies', icon: Sliders, badge: null },
];

const LANGUAGES = [
  { code: 'auto', label: 'Auto Detect' },
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  selectedLanguage,
  setSelectedLanguage,
}) => {
  return (
    <aside className="w-64 border-r border-slate-800 bg-[#070b14]/90 backdrop-blur-md flex flex-col justify-between p-4 shrink-0 h-[calc(100vh-4rem)] sticky top-16 hidden lg:flex">
      <div className="space-y-6">
        {/* Navigation */}
        <div className="space-y-1">
          <p className="px-3 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
            Platform Navigation
          </p>
          <nav className="space-y-1 mt-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/30 to-indigo-500/10 text-cyan-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/10'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-850'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        item.badge === 'Live'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Language Selector */}
        <div className="pt-4 border-t border-slate-800/80">
          <div className="flex items-center space-x-2 px-3 mb-2">
            <Languages className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Target Language
            </span>
          </div>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-800/80">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[11px]">6-Layer Guardrails Active</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">
          FAISS • BM25 • Sarvam AI • MSMARCO-XI
        </p>
      </div>
    </aside>
  );
};
