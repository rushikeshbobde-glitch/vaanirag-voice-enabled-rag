import React from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import type { ChunkStrategy } from '../types/rag';

interface DemoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery: (query: string, language: string, strategy: ChunkStrategy) => void;
}

const DEMO_PRESETS = [
  {
    language: 'en',
    langLabel: 'English',
    title: 'Solar Photovoltaic Energy',
    query: 'What is the primary function of solar photovoltaic cells and why are they environmentally beneficial?',
    strategy: 'metadata_aware' as ChunkStrategy,
    category: 'Renewable Tech',
  },
  {
    language: 'hi',
    langLabel: 'Hindi (हिन्दी)',
    title: 'सौर ऊर्जा और पर्यावरण',
    query: 'सौर ऊर्जा क्या है और यह स्वच्छ पर्यावरण के लिए कैसे उपयोगी है?',
    strategy: 'metadata_aware' as ChunkStrategy,
    category: 'ऊर्जा विज्ञान',
  },
  {
    language: 'mr',
    langLabel: 'Marathi (मराठी)',
    title: 'सौर ऊर्जा आणि शाश्वत विकास',
    query: 'सौर ऊर्जेचे मुख्य फायदे काय आहेत आणि कार्बन उत्सर्जन कसे कमी होते?',
    strategy: 'sentence_aware' as ChunkStrategy,
    category: 'तंत्रज्ञान',
  },
  {
    language: 'bn',
    langLabel: 'Bengali (বাংলা)',
    title: 'উদ্ভিদের সালোকসংশ্লেষ প্রক্রিয়া',
    query: 'সালোকসংশ্লেষ প্রক্রিয়ায় কীভাবে সূর্যালোক ও জল ব্যবহার করে খাদ্য তৈরি হয়?',
    strategy: 'passage_aware' as ChunkStrategy,
    category: 'জীববিজ্ঞান',
  },
  {
    language: 'ta',
    langLabel: 'Tamil (தமிழ்)',
    title: 'சூரிய ஆற்றலின் தொழில்நுட்பம்',
    query: 'சூரிய ஆற்றலின் முக்கிய நன்மைகள் மற்றும் மின்சார உற்பத்தி முறை என்ன?',
    strategy: 'semantic' as ChunkStrategy,
    category: 'அறிவியல்',
  },
  {
    language: 'te',
    langLabel: 'Telugu (తెలుగు)',
    title: 'సౌర విద్యుత్ సాంకేతికత',
    query: 'సౌర శక్తి ఎలా పనిచేస్తుంది మరియు దాని ప్రయోజనాలు ఏమిటి?',
    strategy: 'fixed_size' as ChunkStrategy,
    category: 'సాంకేతికత',
  },
  {
    language: 'gu',
    langLabel: 'Gujarati (ગુજરાતી)',
    title: 'સૌર ઊર્જા અને પર્યાવરણ',
    query: 'સૌર ઊર્જાના મુખ્ય ફાયદા શું છે અને તે કેવી રીતે કાર્ય કરે છે?',
    strategy: 'metadata_aware' as ChunkStrategy,
    category: 'વિજ્ઞાન',
  },
  {
    language: 'kn',
    langLabel: 'Kannada (ಕನ್ನಡ)',
    title: 'ಸೌರ ಶಕ್ತಿಯ ಪ್ರಯೋಜನಗಳು',
    query: 'ಸೌರ ಶಕ್ತಿಯ ಪ್ರಮುಖ ಪ್ರಯೋಜನಗಳು ಮತ್ತು ವಿದ್ಯುತ್ ಉತ್ಪಾದನೆ ಹೇಗೆ?',
    strategy: 'sentence_aware' as ChunkStrategy,
    category: 'ವಿಜ್ಞಾನ',
  },
  {
    language: 'ml',
    langLabel: 'Malayalam (മലയാളം)',
    title: 'സൗരോർജ്ജവും പുനരുപയോഗ ഊർജ്ജവും',
    query: 'സൗരോർജ്ജത്തിന്റെ പ്രധാന ഗുണങ്ങൾ എന്തൊക്കെയാണ്?',
    strategy: 'passage_aware' as ChunkStrategy,
    category: 'ഊർജ്ജം',
  },
  {
    language: 'pa',
    langLabel: 'Punjabi (ਪੰਜਾਬੀ)',
    title: 'ਸੌਰ ਊਰਜਾ ਅਤੇ ਸਾਫ਼ ਵਾਤਾਵਰਣ',
    query: 'ਸੌਰ ਊਰਜਾ ਦੇ ਮੁੱਖ ਫਾਇਦੇ ਕੀ ਹਨ ਅਤੇ ਇਹ ਕਿਵੇਂ ਬਿਜਲੀ ਪੈਦਾ ਕਰਦੀ ਹੈ?',
    strategy: 'semantic' as ChunkStrategy,
    category: 'ਵਿਗਿਆਨ',
  },
];

const PIPELINE_STEPS = [
  'Voice / Audio Input Captured',
  'Transcribed with Sarvam Saaras v3',
  'Multilingual Query Embedding',
  'FAISS Vector DB Dense Search',
  'BM25 Okapi Sparse Search',
  'Hybrid Weighted Score Fusion',
  'Feature & Context Reranker',
  'Relevance & Score Guardrails',
  'Sarvam AI Grounded LLM Generation',
  'Hallucination & Provenance Verification',
];

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  onClose,
  onSelectQuery,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="glass-panel w-full max-w-3xl rounded-2xl p-6 sm:p-8 border border-slate-700/80 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[6px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                <span>Interactive Live Demo Suite</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  HH Goa 2026
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Choose any pre-validated multilingual query from the MSMARCO-XI dataset to test the full live pipeline
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Pipeline Shape Preview */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
          <div className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>End-to-End Live Execution Pipeline</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] text-slate-400 font-mono">
            {PIPELINE_STEPS.map((step, idx) => (
              <div key={step} className="p-2 rounded bg-slate-900/80 border border-slate-855">
                <span className="text-indigo-400 font-bold">#{idx + 1}</span> {step}
              </div>
            ))}
          </div>
        </div>

        {/* Multilingual Query Cards Grid */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Select a Dataset-Grounded Query to Launch:
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DEMO_PRESETS.map((preset) => (
              <div
                key={preset.title}
                onClick={() => {
                  onSelectQuery(preset.query, preset.language, preset.strategy);
                  onClose();
                }}
                className="glass-panel glass-panel-hover p-4 rounded-xl border border-slate-800 cursor-pointer flex flex-col justify-between space-y-2.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {preset.langLabel}
                  </span>
                  <span className="text-[10px] font-medium text-slate-500">
                    {preset.category}
                  </span>
                </div>

                <p className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                  "{preset.query}"
                </p>

                <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                  <span>Strategy: {preset.strategy}</span>
                  <span className="text-cyan-400 font-medium flex items-center space-x-1">
                    <span>Run Query</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
