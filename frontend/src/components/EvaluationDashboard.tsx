import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Play,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { ragApi } from '../services/api';
import type { EvaluationSummary, BenchmarkItem } from '../types/rag';

export const EvaluationDashboard: React.FC = () => {
  const [summary, setSummary] = useState<EvaluationSummary | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [sampleLimit, setSampleLimit] = useState(12);

  const fetchSummary = async () => {
    try {
      const data = await ragApi.getEvaluationSummary();
      setSummary(data);
    } catch (e) {
      console.error('Error fetching evaluation summary:', e);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleRunEvaluation = async () => {
    setIsRunning(true);
    try {
      const data = await ragApi.runEvaluation(sampleLimit);
      setSummary(data);
    } catch (e) {
      console.error('Error executing benchmark:', e);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800/80 space-y-6 shadow-2xl">
      {/* Header & Run Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <LineChart className="w-5 h-5 text-indigo-400" />
            <span>Benchmark Evaluation & Quality Dashboard</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated test harness evaluating multilingual retrieval precision, grounding rates, and latency distributions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={sampleLimit}
            onChange={(e) => setSampleLimit(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value={5}>5 Test Queries</option>
            <option value={10}>10 Test Queries</option>
            <option value={15}>15 Test Queries (All Indic)</option>
          </select>

          <button
            onClick={handleRunEvaluation}
            disabled={isRunning}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Running Benchmark...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Run Evaluation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Scorecards Grid */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Total Queries */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Queries Tested</span>
            <div className="text-xl font-extrabold text-slate-100 mt-1">{summary.total_queries}</div>
            <span className="text-[10px] text-slate-500">across languages</span>
          </div>

          {/* Retrieval Success Rate */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Success Rate</span>
            <div className="text-xl font-extrabold text-emerald-300 mt-1">
              {Math.round((summary.successful_queries / Math.max(1, summary.total_queries)) * 100)}%
            </div>
            <span className="text-[10px] text-emerald-400">{summary.successful_queries} passed</span>
          </div>

          {/* Grounding % */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Grounded Rate</span>
            <div className="text-xl font-extrabold text-cyan-300 mt-1">
              {summary.grounded_percentage}%
            </div>
            <span className="text-[10px] text-cyan-400">verified facts</span>
          </div>

          {/* Average Latency */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 text-[11px]">Avg Latency</span>
            <div className="text-xl font-extrabold text-indigo-300 mt-1">
              {summary.avg_latency_ms} <span className="text-xs font-normal">ms</span>
            </div>
            <span className="text-[10px] text-slate-500">core: {summary.avg_retrieval_core_ms}ms</span>
          </div>

          {/* P50 Latency */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 text-[11px]">P50 Latency</span>
            <div className="text-xl font-extrabold text-purple-300 mt-1">
              {summary.p50_latency_ms} <span className="text-xs font-normal">ms</span>
            </div>
            <span className="text-[10px] text-slate-500">median run</span>
          </div>

          {/* P70 Latency */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <span className="text-slate-400 text-[11px]">P70 Latency</span>
            <div className="text-xl font-extrabold text-pink-300 mt-1">
              {summary.p70_latency_ms} <span className="text-xs font-normal">ms</span>
            </div>
            <span className="text-[10px] text-slate-500">P100: {summary.p100_latency_ms}ms</span>
          </div>
        </div>
      )}

      {/* Multilingual Benchmark Queries Results Table */}
      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between">
          <span>Multilingual Evaluation Run Results</span>
          <span className="text-xs font-mono text-slate-500">
            {summary?.query_samples?.length ?? 0} Sampled Queries
          </span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800 bg-slate-900/60">
              <tr>
                <th className="p-2.5">ID</th>
                <th className="p-2.5">Language</th>
                <th className="p-2.5">Query</th>
                <th className="p-2.5">Sources</th>
                <th className="p-2.5">Top Score</th>
                <th className="p-2.5">Core Latency</th>
                <th className="p-2.5">Total Latency</th>
                <th className="p-2.5">Grounding</th>
                <th className="p-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850">
              {summary?.query_samples?.map((item: BenchmarkItem) => (
                <tr key={item.query_id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="p-2.5 font-mono text-slate-400">{item.query_id}</td>
                  <td className="p-2.5">
                    <span className="px-1.5 py-0.5 rounded uppercase font-bold text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {item.expected_language}
                    </span>
                  </td>
                  <td className="p-2.5 text-slate-200 max-w-xs truncate">{item.query}</td>
                  <td className="p-2.5 font-mono text-cyan-300">{item.sources_retrieved}</td>
                  <td className="p-2.5 font-mono text-indigo-300">{item.top_score.toFixed(3)}</td>
                  <td className="p-2.5 font-mono text-emerald-400">{item.retrieval_core_ms} ms</td>
                  <td className="p-2.5 font-mono text-slate-300">{item.latency_ms} ms</td>
                  <td className="p-2.5">
                    {item.grounded ? (
                      <span className="flex items-center space-x-1 text-emerald-400 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="text-amber-400 text-[11px]">Fallback</span>
                    )}
                  </td>
                  <td className="p-2.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'PASSED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
