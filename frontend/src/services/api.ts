import type {
  RAGResponse,
  TextQueryPayload,
  VoiceQueryPayload,
  EvaluationSummary,
  SystemStatus,
} from '../types/rag';

export const DEFAULT_PRODUCTION_BACKEND = 'https://vaanirag-voice-enabled-rag-2.onrender.com';

export const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('vaanirag_backend_url');
    if (custom && custom.trim()) {
      return `${custom.trim().replace(/\/+$/, '')}/api`;
    }
  }
  const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
  if (envUrl && envUrl.trim()) {
    return `${envUrl.trim().replace(/\/+$/, '')}/api`;
  }
  // On cloud deployments (Netlify/Vercel), default permanently to live Render backend
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `${DEFAULT_PRODUCTION_BACKEND}/api`;
  }
  return '/api';
};

export const ragApi = {
  // Get active backend API URL
  getBackendUrl: (): string => {
    if (typeof window !== 'undefined') {
      const custom = localStorage.getItem('vaanirag_backend_url');
      if (custom && custom.trim()) return custom.trim();
    }
    const envUrl = (import.meta as any).env?.VITE_API_BASE_URL;
    if (envUrl && envUrl.trim()) return envUrl.trim();
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return DEFAULT_PRODUCTION_BACKEND;
    }
    return typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:8000';
  },

  // Set custom backend URL
  setBackendUrl: (url: string) => {
    if (typeof window !== 'undefined') {
      if (!url || !url.trim() || url.trim() === DEFAULT_PRODUCTION_BACKEND) {
        localStorage.setItem('vaanirag_backend_url', DEFAULT_PRODUCTION_BACKEND);
      } else {
        localStorage.setItem('vaanirag_backend_url', url.trim());
      }
    }
  },

  // Health check
  getHealth: async (): Promise<{ status: string; service: string; version: string; event: string }> => {
    const res = await fetch(`${getApiBase()}/health`, {
      method: 'GET',
      mode: 'cors',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  // Submit Text Query
  submitQuery: async (payload: TextQueryPayload): Promise<RAGResponse> => {
    const res = await fetch(`${getApiBase()}/rag/query`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
    const res = await fetch(`${getApiBase()}/rag/voice-query`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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

    const res = await fetch(`${getApiBase()}/voice/transcribe`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Transcription failed');
    }
    return res.json();
  },

  // Fetch latency statistics
  getLatency: async () => {
    const res = await fetch(`${getApiBase()}/latency`);
    if (!res.ok) throw new Error('Failed to fetch latency statistics');
    return res.json();
  },

  getLatencyMetrics: async () => {
    const res = await fetch(`${getApiBase()}/latency`);
    if (!res.ok) throw new Error('Failed to fetch latency metrics');
    return res.json();
  },

  // Run benchmark evaluation
  runBenchmark: async (limit: number = 10): Promise<EvaluationSummary> => {
    const res = await fetch(`${getApiBase()}/evaluation/run?limit=${limit}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Benchmark execution failed');
    return res.json();
  },

  runEvaluation: async (limit: number = 10): Promise<EvaluationSummary> => {
    const res = await fetch(`${getApiBase()}/evaluation/run?limit=${limit}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Evaluation execution failed');
    return res.json();
  },

  // Get evaluation summary
  getEvaluationSummary: async (): Promise<EvaluationSummary> => {
    const res = await fetch(`${getApiBase()}/evaluation/summary`);
    if (!res.ok) throw new Error('Failed to fetch evaluation summary');
    return res.json();
  },

  // System Status
  getSystemStatus: async (): Promise<SystemStatus> => {
    const res = await fetch(`${getApiBase()}/system/status`);
    if (!res.ok) throw new Error('Failed to fetch system status');
    return res.json();
  },

  // Reload Index
  reloadIndex: async () => {
    const res = await fetch(`${getApiBase()}/index/reload`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Index reload failed');
    return res.json();
  },

  // Rebuild Index
  rebuildIndex: async (limit: number = 500) => {
    const res = await fetch(`${getApiBase()}/index/build?limit=${limit}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Index rebuild failed');
    return res.json();
  },

  buildIndex: async (limit: number = 500) => {
    const res = await fetch(`${getApiBase()}/index/build?limit=${limit}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Index build failed');
    return res.json();
  },

  // Update Sarvam API Key
  updateApiKey: async (apiKey: string) => {
    const res = await fetch(`${getApiBase()}/system/api-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!res.ok) throw new Error('Failed to update API key');
    return res.json();
  },
};
