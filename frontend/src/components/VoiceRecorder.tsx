import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Send,
  RotateCcw,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Radio,
  Volume2,
  Activity,
  Info,
} from 'lucide-react';
import type { VoiceState, ChunkStrategy } from '../types/rag';
import { ragApi } from '../services/api';

interface VoiceRecorderProps {
  onQuerySubmit: (query: string, audioBase64?: string) => Promise<void>;
  isLoading: boolean;
  selectedLanguage: string;
  chunkStrategy: ChunkStrategy;
}

const LANG_CODE_MAP: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  mr: 'mr-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  auto: 'en-US',
};

const QUICK_TEST_PROMPTS = [
  { label: 'Solar Energy', query: 'What is solar photovoltaic technology and how does it work?' },
  { label: 'Photosynthesis', query: 'How do plants convert sunlight into chemical energy during photosynthesis?' },
  { label: 'Renewable Power', query: 'What are the key environmental benefits of renewable energy?' },
  { label: 'हिन्दी (Hindi)', query: 'सौर ऊर्जा क्या है और इसके मुख्य लाभ क्या हैं?' },
  { label: 'मराठी (Marathi)', query: 'सौर ऊर्जेचे मुख्य फायदे आणि महत्त्व काय आहे?' },
  { label: 'বাংলা (Bengali)', query: 'সালোকসংশ্লেষ প্রক্রিয়ায় কীভাবে খাদ্য তৈরি হয়?' },
];

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onQuerySubmit,
  isLoading,
  selectedLanguage,
  chunkStrategy,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('IDLE');
  const [transcript, setTranscript] = useState<string>('');
  const [textInput, setTextInput] = useState<string>('');
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [micVolume, setMicVolume] = useState<number>(0);

  const recognitionRef = useRef<any>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const latestTranscriptRef = useRef<string>('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Synchronize loading state
  useEffect(() => {
    if (isLoading && voiceState !== 'RECORDING') {
      setVoiceState('PROCESSING');
    } else if (!isLoading && voiceState === 'PROCESSING') {
      setVoiceState('COMPLETED');
    }
  }, [isLoading]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAllAudio();
    };
  }, []);

  const stopAllAudio = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    setMicVolume(0);
  };

  // Start live audio volume metering
  const startVolumeMeter = async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const analyser = ctx.createAnalyser();
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        analyser.fftSize = 256;
        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const data = new Uint8Array(analyser.frequencyBinCount);
        const loop = () => {
          analyser.getByteFrequencyData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            sum += data[i];
          }
          const avg = sum / data.length;
          const pct = Math.min(100, Math.round((avg / 100) * 100));
          setMicVolume(pct);
          animFrameRef.current = requestAnimationFrame(loop);
        };
        loop();
      }
      return stream;
    } catch (err: any) {
      console.warn('Microphone permission error:', err);
      setErrorMessage(
        'Microphone permission blocked or unavailable. Please check your browser/Windows microphone permissions, or type below.'
      );
      return null;
    }
  };

  // Start Voice Recording
  const startRecording = async () => {
    setErrorMessage(null);
    setTranscript('');
    latestTranscriptRef.current = '';
    setAudioBase64(null);

    // 1. Start volume meter to verify physical audio input
    const stream = await startVolumeMeter();

    // 2. Initialize MediaRecorder for backend audio encoding
    if (stream) {
      try {
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            setAudioBase64(reader.result as string);
          };

          // Call backend STT if speech recognition produced no words
          try {
            const sttRes = await ragApi.transcribeAudio(audioBlob, selectedLanguage);
            if (sttRes && sttRes.transcript) {
              setTranscript((prev) => prev.trim() || sttRes.transcript.trim());
            }
          } catch (e) {
            console.warn('Backend STT fallback notice:', e);
          }
        };

        mediaRecorder.start();
      } catch (recErr) {
        console.warn('MediaRecorder notice:', recErr);
      }
    }

    // 3. Initialize Browser Web Speech API
    const SpeechRecClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecClass) {
      try {
        const recognition = new SpeechRecClass();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        const targetLang = LANG_CODE_MAP[selectedLanguage] || 'en-US';
        recognition.lang = targetLang;

        recognition.onresult = (event: any) => {
          let fullText = '';
          for (let i = 0; i < event.results.length; i++) {
            fullText += event.results[i][0].transcript + ' ';
          }
          const cleaned = fullText.trim();
          if (cleaned) {
            latestTranscriptRef.current = cleaned;
            setTranscript(cleaned);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition notice:', event.error);
          if (event.error === 'not-allowed') {
            setErrorMessage('Microphone access was denied in your browser settings.');
          }
        };

        recognition.onend = () => {
          const finalVal = latestTranscriptRef.current.trim();
          if (finalVal) {
            setTranscript(finalVal);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      } catch (err: any) {
        console.warn('SpeechRecognition startup notice:', err);
      }
    }

    setVoiceState('RECORDING');
    setRecordingTime(0);
    timerIntervalRef.current = window.setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  // Stop Recording
  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
    }

    // Synchronize latest transcript
    const captured = latestTranscriptRef.current.trim();
    if (captured) {
      setTranscript(captured);
    }

    setVoiceState('IDLE');
    setMicVolume(0);
  };

  // Handle Submission to RAG Pipeline
  const handleSubmit = async (overrideText?: string) => {
    const queryToSend = (overrideText || transcript.trim() || textInput.trim()).trim();
    if (!queryToSend) {
      setErrorMessage('Please speak a question or select a test question below.');
      return;
    }

    setErrorMessage(null);
    setVoiceState('PROCESSING');
    try {
      await onQuerySubmit(queryToSend, audioBase64 || undefined);
      setVoiceState('COMPLETED');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error executing RAG pipeline.');
      setVoiceState('ERROR');
    }
  };

  const handleClear = () => {
    setTranscript('');
    latestTranscriptRef.current = '';
    setTextInput('');
    setAudioBase64(null);
    setErrorMessage(null);
    setVoiceState('IDLE');
    setRecordingTime(0);
    stopAllAudio();
  };

  return (
    <div className="glass-panel rounded-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden border border-slate-800/80 shadow-2xl">
      {/* Background glow */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <span>Voice Retrieval Console</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Live Speech AI
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Speak naturally into your microphone or launch instant test questions
          </p>
        </div>

        {/* State Badges */}
        <div className="flex items-center space-x-2">
          {voiceState === 'IDLE' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              READY
            </span>
          )}
          {voiceState === 'RECORDING' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1.5 animate-pulse">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>RECORDING ({recordingTime}s)</span>
            </span>
          )}
          {voiceState === 'PROCESSING' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300 animate-spin" />
              <span>SEARCHING RAG...</span>
            </span>
          )}
          {voiceState === 'COMPLETED' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>ANSWER READY</span>
            </span>
          )}
          {voiceState === 'ERROR' && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center space-x-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>ERROR</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Microphone Button Arena with Real-time dB Sound Meter */}
      <div className="flex flex-col items-center justify-center py-4 space-y-4">
        <div className="relative flex items-center justify-center">
          {/* Animated reactive sound rings */}
          {voiceState === 'RECORDING' && (
            <>
              <div
                className="absolute rounded-full bg-rose-500/20 transition-all duration-75 pointer-events-none"
                style={{
                  width: `${112 + micVolume * 1.2}px`,
                  height: `${112 + micVolume * 1.2}px`,
                }}
              />
              <div className="absolute w-44 h-44 rounded-full bg-indigo-500/10 animate-pulse pointer-events-none" />
            </>
          )}

          <button
            onClick={voiceState === 'RECORDING' ? stopRecording : startRecording}
            disabled={isLoading}
            className={`w-28 h-28 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl z-10 ${
              voiceState === 'RECORDING'
                ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white scale-110 shadow-rose-500/50 ring-4 ring-rose-500/30'
                : 'bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 text-white hover:scale-105 hover:shadow-indigo-500/50 shadow-indigo-500/30'
            }`}
          >
            {voiceState === 'RECORDING' ? (
              <Square className="w-10 h-10 fill-current" />
            ) : (
              <Mic className="w-10 h-10" />
            )}
            <span className="text-[11px] font-bold mt-1 uppercase tracking-wider">
              {voiceState === 'RECORDING' ? 'Stop' : 'Speak'}
            </span>
          </button>
        </div>

        {/* Live Audio Amplitude Feedback Meter */}
        <div className="w-full max-w-md bg-slate-950/80 rounded-xl p-3 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Activity className={`w-3.5 h-3.5 ${voiceState === 'RECORDING' ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
              <span className="text-slate-300 font-medium">
                {voiceState === 'RECORDING'
                  ? 'Microphone Listening — Speak now'
                  : 'Click Speak to record or choose a question'}
              </span>
            </div>
            <span className="font-mono text-[10px] text-cyan-300">
              {voiceState === 'RECORDING' ? `${micVolume}% volume` : selectedLanguage.toUpperCase()}
            </span>
          </div>

          {/* Real-time Dynamic Volume Bar */}
          {voiceState === 'RECORDING' && (
            <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-800">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  micVolume > 5 ? 'bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-400' : 'bg-slate-700'
                }`}
                style={{ width: `${Math.max(6, micVolume)}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Live Transcribed Speech Box */}
      {(transcript || voiceState === 'RECORDING') && (
        <div className="space-y-2 animate-in fade-in duration-200">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold flex items-center space-x-1.5 text-cyan-300">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>Transcribed Speech Query</span>
            </span>
            <span className="text-[11px] text-slate-500">Live Voice Transcription</span>
          </div>

          <div className="relative">
            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                latestTranscriptRef.current = e.target.value;
              }}
              placeholder={
                voiceState === 'RECORDING'
                  ? 'Listening... Speak your question now...'
                  : 'Your transcribed question appears here'
              }
              rows={2}
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner font-sans leading-relaxed"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-1">
            <button
              onClick={handleClear}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
            <button
              onClick={startRecording}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Speak Again</span>
            </button>
            <button
              onClick={() => handleSubmit()}
              disabled={isLoading || !transcript.trim()}
              className="flex items-center space-x-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Get Grounded Answer</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Test Voice Question Presets */}
      <div className="space-y-2.5 pt-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
          <span className="flex items-center space-x-1.5 text-slate-300">
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Dataset Test Questions (1-Click Instant Evaluation):</span>
          </span>
          <span className="text-slate-500">10+ Indic Languages</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {QUICK_TEST_PROMPTS.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                setTranscript(item.query);
                latestTranscriptRef.current = item.query;
                handleSubmit(item.query);
              }}
              className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-left transition-all hover:scale-[1.02] flex flex-col justify-between space-y-1 group"
            >
              <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">
                {item.label}
              </div>
              <div className="text-xs text-slate-200 group-hover:text-white line-clamp-2">
                "{item.query}"
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Direct Fallback Text Search Input */}
      <div className="pt-4 border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span>Or type your question directly:</span>
          <span className="text-[11px] text-slate-500">Strategy: {chunkStrategy}</span>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="e.g., What is solar photovoltaic technology?"
            className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={isLoading || (!textInput.trim() && !transcript.trim())}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center space-x-1.5 transition-all shadow-lg shadow-indigo-600/30"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>
      </div>

      {/* Troubleshooting Tip Banner */}
      <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start space-x-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Voice Tip:</strong> Speak close to your microphone. You can also click any of the <strong>Dataset Test Questions</strong> above to instantly evaluate the complete multilingual RAG pipeline.
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="flex items-center space-x-2 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
