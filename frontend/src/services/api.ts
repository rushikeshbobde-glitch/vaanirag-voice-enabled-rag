import type {
  RAGResponse,
  TextQueryPayload,
  VoiceQueryPayload,
  EvaluationSummary,
  SystemStatus,
} from '../types/rag';

const BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || '';
const API_BASE = BASE_URL ? `${BASE_URL.replace(/\/+$/, '')}/api` : '/api';

export const ragApi = {
  // Health check
  getHealth: async (): Promise<{ status: string; service: string; version: string; event: string }> => {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  // Submit Text Query
  submitQuery: async (payload: TextQueryPayload): Promise<RAGResponse> => {
    const res = await fetch(`${API_BASE}/rag/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Query execution failed');
    }
    return res.json();
  },

  // Submit Voice Audio Base64 / Query
  submitVoiceQuery: async (payload: VoiceQueryPayload): Promise<RAGResponse> => {
    const res = await fetch(`${API_BASE}/rag/voice-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Voice query failed');
    }
    return res.json();
  },

  // Transcribe Audio File directly
  transcribeAudio: async (audioBlob: Blob, language: string = 'auto'): Promise<{ transcript: string; language: string; latency_ms: number }> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'recording.wav');
    formData.append('language', language);

    const res = await fetch(`${API_BASE}/voice/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Transcription failed');
    }
    return res.json();
  },

  // Latency metrics
  getLatencyMetrics: async () => {
    const res = await fetch(`${API_BASE}/latency`);
    if (!res.ok) throw new Error('Failed to fetch latency metrics');
    return res.json();
  },

  // Evaluation summary
  getEvaluationSummary: async (): Promise<EvaluationSummary> => {
    const res = await fetch(`${API_BASE}/evaluation/summary`);
    if (!res.ok) throw new Error('Failed to fetch evaluation summary');
    return res.json();
  },

  // Run benchmark evaluation
  runEvaluation: async (sampleLimit: number = 15): Promise<EvaluationSummary> => {
    const res = await fetch(`${API_BASE}/evaluation/run?sample_limit=${sampleLimit}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Evaluation run failed');
    return res.json();
  },

  // System status
  getSystemStatus: async (): Promise<SystemStatus> => {
    const res = await fetch(`${API_BASE}/system/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  // Reload index
  reloadIndex: async () => {
    const res = await fetch(`${API_BASE}/index/reload`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to reload index');
    return res.json();
  },

  // Rebuild index
  buildIndex: async (limit: number = 500) => {
    const res = await fetch(`${API_BASE}/index/build?limit=${limit}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to build index');
    return res.json();
  },
};
