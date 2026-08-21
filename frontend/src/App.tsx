import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { HeroLanding } from './components/HeroLanding';
import { VoiceRecorder } from './components/VoiceRecorder';
import { AnswerCard } from './components/AnswerCard';
import { SourceCard } from './components/SourceCard';
import { RetrievalVisualizer } from './components/RetrievalVisualizer';
import { LatencyDashboard } from './components/LatencyDashboard';
import { EvaluationDashboard } from './components/EvaluationDashboard';
import { SystemStatusView } from './components/SystemStatusView';
import { SettingsView } from './components/SettingsView';
import { DemoModeModal } from './components/DemoModeModal';
import { ragApi } from './services/api';
import type { RAGResponse, ChunkStrategy } from './types/rag';
import { Layers } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('auto');
  const [chunkStrategy, setChunkStrategy] = useState<ChunkStrategy>('metadata_aware');
  const [semanticWeight, setSemanticWeight] = useState<number>(0.7);
  const [topK, setTopK] = useState<number>(5);
  const [rerankEnabled, setRerankEnabled] = useState<boolean>(true);

  const [currentResponse, setCurrentResponse] = useState<RAGResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [isDemoOpen, setIsDemoOpen] = useState<boolean>(false);

  // Poll backend health on startup
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await ragApi.getHealth();
        if (res.status === 'healthy') {
          setBackendOnline(true);
        }
      } catch (e) {
        setBackendOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Query Submission from Voice or Text
  const handleQuerySubmit = async (query: string, audioBase64?: string) => {
    setIsLoading(true);
    try {
      let response: RAGResponse;
      if (audioBase64) {
        response = await ragApi.submitVoiceQuery({
          query: query,
          audio_base64: audioBase64,
          language: selectedLanguage,
          top_k: topK,
          chunk_strategy: chunkStrategy,
          semantic_weight: semanticWeight,
          bm25_weight: parseFloat((1.0 - semanticWeight).toFixed(2)),
          rerank: rerankEnabled,
        });
      } else {
        response = await ragApi.submitQuery({
          query: query,
          language: selectedLanguage,
          top_k: topK,
          chunk_strategy: chunkStrategy,
          semantic_weight: semanticWeight,
          bm25_weight: parseFloat((1.0 - semanticWeight).toFixed(2)),
          rerank: rerankEnabled,
        });
      }
      setCurrentResponse(response);
    } catch (err: any) {
      console.error('Error submitting query:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Launch pre-configured query from Demo Modal
  const handleSelectDemoQuery = (query: string, language: string, strategy: ChunkStrategy) => {
    setSelectedLanguage(language);
    setChunkStrategy(strategy);
    setActiveTab('workspace');
    handleQuerySubmit(query);
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        backendOnline={backendOnline}
        onOpenDemo={() => setIsDemoOpen(true)}
      />

      {/* Main Content Area with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedLanguage={selectedLanguage}
          setSelectedLanguage={setSelectedLanguage}
        />

        {/* Dynamic Main Workspace View */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-5xl mx-auto space-y-8">
          {/* Tab 1: Overview / Landing Hero */}
          {activeTab === 'overview' && (
            <HeroLanding
              onStartVoice={() => setActiveTab('workspace')}
              onExplore={() => setActiveTab('system')}
              onOpenDemo={() => setIsDemoOpen(true)}
            />
          )}

          {/* Tab 2: Main Voice RAG Workspace */}
          {activeTab === 'workspace' && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <VoiceRecorder
                onQuerySubmit={handleQuerySubmit}
                isLoading={isLoading}
                selectedLanguage={selectedLanguage}
                chunkStrategy={chunkStrategy}
              />

              {/* Answer Presentation Card */}
              {(currentResponse || isLoading) && (
                <AnswerCard response={currentResponse} isLoading={isLoading} />
              )}

              {/* Source Chunks Inspector Section */}
              {currentResponse && currentResponse.sources && currentResponse.sources.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Retrieved Context Sources ({currentResponse.sources.length})</span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      Grounded provenance verified
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {currentResponse.sources.map((src) => (
                      <SourceCard key={src.id} source={src} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Retrieval Visualizer */}
          {activeTab === 'retrieval' && (
            <div className="animate-in fade-in duration-300">
              <RetrievalVisualizer response={currentResponse} />
            </div>
          )}

          {/* Tab 4: Sources Provenance */}
          {activeTab === 'sources' && (
            <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-indigo-400" />
                  <span>Source Documents & Passage Traceability</span>
                </h2>
                <span className="text-xs text-slate-400">
                  {currentResponse?.sources?.length ?? 0} active citations
                </span>
              </div>

              {currentResponse && currentResponse.sources.length > 0 ? (
                <div className="space-y-3">
                  {currentResponse.sources.map((src) => (
                    <SourceCard key={src.id} source={src} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm space-y-2">
                  <p>No active search query sources loaded yet.</p>
                  <p className="text-xs">Run a query in the Voice Workspace to view retrieved passages.</p>
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Evaluation & Benchmarks */}
          {activeTab === 'evaluation' && (
            <div className="animate-in fade-in duration-300">
              <EvaluationDashboard />
            </div>
          )}

          {/* Tab 6: Latency Analytics */}
          {activeTab === 'latency' && (
            <div className="animate-in fade-in duration-300">
              <LatencyDashboard currentLatency={currentResponse?.latency} />
            </div>
          )}

          {/* Tab 7: System Health */}
          {activeTab === 'system' && (
            <div className="animate-in fade-in duration-300">
              <SystemStatusView />
            </div>
          )}

          {/* Tab 8: Settings & Strategies */}
          {activeTab === 'settings' && (
            <div className="animate-in fade-in duration-300">
              <SettingsView
                chunkStrategy={chunkStrategy}
                setChunkStrategy={setChunkStrategy}
                semanticWeight={semanticWeight}
                setSemanticWeight={setSemanticWeight}
                topK={topK}
                setTopK={setTopK}
                rerankEnabled={rerankEnabled}
                setRerankEnabled={setRerankEnabled}
              />
            </div>
          )}
        </main>
      </div>

      {/* Demo Mode Modal */}
      <DemoModeModal
        isOpen={isDemoOpen}
        onClose={() => setIsDemoOpen(false)}
        onSelectQuery={handleSelectDemoQuery}
      />
    </div>
  );
}

export default App;
