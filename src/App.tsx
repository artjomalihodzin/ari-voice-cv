import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Radio,
  FileText,
  QrCode,
  Volume2,
  VolumeX,
  AlertCircle,
  Sparkles,
  Award,
  Briefcase,
  GraduationCap,
  Languages,
  CheckCircle,
} from 'lucide-react';
import {
  LiveAudioPlayer,
  floatTo16BitPCM,
  arrayBufferToBase64,
  downsampleTo16k,
} from './utils/audio';
import { AudioVisualizer } from './components/AudioVisualizer';
import { TranscriptPanel, ChatMessage } from './components/TranscriptPanel';
import { SuggestedChips } from './components/SuggestedChips';
import { QrModal, CvSummaryModal } from './components/InfoModals';

type ConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isMutedOutput, setIsMutedOutput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Transcripts
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingAriText, setStreamingAriText] = useState<string>('');

  // Modals
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isCvOpen, setIsCvOpen] = useState(false);

  // Audio References
  const playerRef = useRef<LiveAudioPlayer | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const isMicMutedRef = useRef(false);
  isMicMutedRef.current = isMicMuted;

  // Initialize Audio Player on mount
  useEffect(() => {
    playerRef.current = new LiveAudioPlayer((speaking) => {
      setIsAiSpeaking(speaking);
    });

    return () => {
      disconnect();
      playerRef.current?.close();
    };
  }, []);

  const getWsUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/live`;
  };

  const addMessage = useCallback((sender: 'ari' | 'user', text: string) => {
    if (!text.trim()) return;
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        sender,
        text,
        timestamp,
      },
    ]);
  }, []);

  const disconnect = useCallback(() => {
    // Stop microphone stream
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      try {
        inputAudioCtxRef.current.close();
      } catch {
        // ignore
      }
      inputAudioCtxRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    // Stop audio player
    if (playerRef.current) {
      playerRef.current.stop();
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }

    // If Ari had ongoing streaming text, save it
    setStreamingAriText((prev) => {
      if (prev.trim()) {
        addMessage('ari', prev.trim());
      }
      return '';
    });

    setConnectionState('idle');
    setIsAiSpeaking(false);
  }, [addMessage]);

  const connectVoice = async (initialQuery?: string) => {
    try {
      setErrorMessage(null);
      setConnectionState('connecting');

      // 1. Initialize & resume output audio context (handles mobile browser autoplay restrictions)
      if (playerRef.current) {
        const outCtx = playerRef.current.getContext();
        if (outCtx.state === 'suspended') {
          await outCtx.resume();
        }
      }

      // 2. Request user microphone permissions
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        micStreamRef.current = stream;
      } catch (err: any) {
        console.error('Microphone access denied or unavailable:', err);
        setErrorMessage('Microphone access denied. Please allow microphone permissions to speak with Ari.');
        setConnectionState('error');
        return;
      }

      // 3. Establish WebSocket connection to backend Live API proxy
      const ws = new WebSocket(getWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Client] Connected to voice server');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'ready') {
            setConnectionState('connected');

            // If initial query provided (e.g. from chip click), send it; otherwise trigger opening greeting
            if (initialQuery) {
              addMessage('user', initialQuery);
              ws.send(JSON.stringify({ type: 'text', text: initialQuery }));
            } else {
              ws.send(JSON.stringify({ type: 'start_greeting' }));
            }

            // Start sending microphone audio frames to server
            startMicAudioStreaming(stream, ws);
          } else if (data.type === 'audio' && data.audio) {
            if (!isMutedOutput && playerRef.current) {
              playerRef.current.playChunk(data.audio);
            }
          } else if (data.type === 'output_transcription' && data.text) {
            setStreamingAriText((prev) => prev + data.text);
          } else if (data.type === 'input_transcription' && data.text) {
            // Visitor spoke a question
            addMessage('user', data.text);
          } else if (data.type === 'interrupted') {
            console.log('[Client] Model interrupted');
            if (playerRef.current) {
              playerRef.current.stop();
            }
            setStreamingAriText((prev) => {
              if (prev.trim()) {
                addMessage('ari', prev.trim() + ' [interrupted]');
              }
              return '';
            });
          } else if (data.type === 'turn_complete') {
            setStreamingAriText((prev) => {
              if (prev.trim()) {
                addMessage('ari', prev.trim());
              }
              return '';
            });
          } else if (data.type === 'error') {
            console.error('[Client] Server error:', data.message);
            setErrorMessage(data.message || 'Voice connection encountered an error');
          }
        } catch (err) {
          console.error('[Client] Error parsing incoming WS message:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[Client] WebSocket error:', err);
        setErrorMessage('WebSocket connection error. Please try again.');
        disconnect();
      };

      ws.onclose = () => {
        console.log('[Client] WebSocket closed');
        disconnect();
      };
    } catch (err: any) {
      console.error('Failed to start voice conversation:', err);
      setErrorMessage(err?.message || 'Failed to start conversation');
      setConnectionState('error');
      disconnect();
    }
  };

  const startMicAudioStreaming = (stream: MediaStream, ws: WebSocket) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new AudioCtxClass();
      inputAudioCtxRef.current = inputCtx;

      const source = inputCtx.createMediaStreamSource(stream);
      // 4096 buffer size provides smooth ~90ms chunks
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (e) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        if (isMicMutedRef.current) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);
        // Resample browser microphone to 16000Hz PCM required by Gemini Live
        const downsampled = downsampleTo16k(inputChannelData, inputCtx.sampleRate);
        const pcm16 = floatTo16BitPCM(downsampled);
        const base64 = arrayBufferToBase64(pcm16);

        ws.send(JSON.stringify({ type: 'audio', audio: base64 }));
      };
    } catch (err) {
      console.error('Error starting audio processor:', err);
    }
  };

  const handleMicButtonClick = () => {
    if (connectionState === 'connected' || connectionState === 'connecting') {
      disconnect();
    } else {
      connectVoice();
    }
  };

  const handleSelectQuestion = (question: string) => {
    if (connectionState === 'connected' && wsRef.current) {
      addMessage('user', question);
      wsRef.current.send(JSON.stringify({ type: 'text', text: question }));
    } else {
      // Connect and ask immediately
      connectVoice(question);
    }
  };

  const handleTextQuerySubmit = (text: string) => {
    if (connectionState === 'connected' && wsRef.current) {
      addMessage('user', text);
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
    } else {
      connectVoice(text);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Background Ambience Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-cyan-600/15 via-indigo-600/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-violet-600/10 blur-3xl rounded-full" />
        <div className="absolute bottom-10 -left-32 w-80 h-80 bg-cyan-600/10 blur-3xl rounded-full" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-4xl mx-auto px-4 py-5 sm:py-7 flex flex-col flex-1">
        {/* Navigation / Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-800/60">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
              <span className="text-xs font-mono font-medium tracking-widest text-cyan-400 uppercase">
                AI Voice CV • Talking Portfolio
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400">
                Tallinn, Estonia
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              Artjom Alihodzin
            </h1>
            <p className="text-sm font-medium text-neutral-400 mt-0.5">
              Business student, sales leader, founder
            </p>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => setIsCvOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 transition active:scale-95 shadow-sm"
              title="View CV highlights & verified numbers"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>CV Overview</span>
            </button>

            <button
              onClick={() => setIsQrOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-medium text-neutral-200 transition active:scale-95 shadow-sm"
              title="Show QR Code for scanning on mobile"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-400" />
              <span>Share QR</span>
            </button>
          </div>
        </header>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-rose-100 font-mono text-xs px-2 py-1 rounded bg-rose-900/40"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Central Voice Hero */}
        <section className="my-6 sm:my-8 flex flex-col items-center text-center">
          {/* Agent Persona Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/90 border border-neutral-800 backdrop-blur-md shadow-lg shadow-black/40 mb-5">
            <div className="relative flex items-center justify-center">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  connectionState === 'connected'
                    ? isAiSpeaking
                      ? 'bg-cyan-400 animate-ping'
                      : 'bg-emerald-400'
                    : connectionState === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-neutral-600'
                }`}
              />
              <span
                className={`absolute w-2.5 h-2.5 rounded-full ${
                  connectionState === 'connected' ? 'bg-cyan-400' : 'bg-neutral-500'
                }`}
              />
            </div>
            <span className="text-xs font-semibold text-neutral-200">Ari</span>
            <span className="text-neutral-600">•</span>
            <span className="text-xs text-neutral-400">
              {connectionState === 'connected'
                ? isAiSpeaking
                  ? 'Ari is speaking...'
                  : 'Ari is listening...'
                : connectionState === 'connecting'
                ? 'Connecting to Gemini Live...'
                : 'Artjom’s AI Assistant'}
            </span>
          </div>

          {/* Big Round Microphone Button & Glowing Wave Aura */}
          <div className="relative flex items-center justify-center my-2 sm:my-4">
            {/* Ambient Pulse Rings */}
            {connectionState === 'connected' && (
              <>
                <div
                  className={`absolute w-44 h-44 sm:w-52 sm:h-52 rounded-full border transition-all duration-700 ${
                    isAiSpeaking
                      ? 'border-cyan-500/40 animate-ping'
                      : 'border-emerald-500/30 animate-pulse'
                  }`}
                />
                <div
                  className={`absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full transition-all duration-500 blur-xl ${
                    isAiSpeaking
                      ? 'bg-gradient-to-r from-cyan-500/30 to-violet-500/30'
                      : 'bg-emerald-500/20'
                  }`}
                />
              </>
            )}

            {/* The Main Round Button */}
            <button
              onClick={handleMicButtonClick}
              className={`relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 group focus:outline-none ${
                connectionState === 'connected'
                  ? isAiSpeaking
                    ? 'bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 text-white shadow-cyan-500/30 border-4 border-cyan-400/40 ring-4 ring-cyan-500/20'
                    : 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-600 text-white shadow-emerald-500/30 border-4 border-emerald-400/40 ring-4 ring-emerald-500/20'
                  : connectionState === 'connecting'
                  ? 'bg-neutral-800 text-amber-400 border-4 border-amber-500/40 animate-pulse ring-4 ring-amber-500/10'
                  : 'bg-gradient-to-b from-neutral-800 to-neutral-900 text-neutral-200 hover:text-white border-2 border-neutral-700/80 hover:border-cyan-500/60 hover:shadow-cyan-500/10 hover:shadow-2xl'
              }`}
              title={
                connectionState === 'connected'
                  ? 'Tap to stop voice conversation'
                  : 'Tap to start voice conversation'
              }
            >
              {connectionState === 'connected' ? (
                <>
                  <div className="relative">
                    <Mic className="w-9 h-9 sm:w-11 sm:h-11 transition-transform group-hover:scale-110" />
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-wider mt-1 text-white/90">
                    {isAiSpeaking ? 'Speaking' : 'Listening'}
                  </span>
                </>
              ) : connectionState === 'connecting' ? (
                <>
                  <Radio className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
                  <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                    Connecting
                  </span>
                </>
              ) : (
                <>
                  <Mic className="w-9 h-9 sm:w-11 sm:h-11 text-neutral-300 group-hover:text-cyan-400 transition-colors group-hover:scale-110" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider mt-1 text-neutral-400 group-hover:text-neutral-200">
                    Tap to Talk
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Action Helper Hint */}
          <div className="mt-3 flex items-center justify-center gap-3">
            <p className="text-xs text-neutral-400 font-medium">
              {connectionState === 'connected' ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live voice active • Tap microphone anytime to end
                </span>
              ) : connectionState === 'connecting' ? (
                <span className="text-amber-400 font-semibold">
                  Connecting to Ari's voice session...
                </span>
              ) : (
                <span>
                  Tap the button to talk with Ari in real-time, or tap any question below.
                </span>
              )}
            </p>

            {/* Quick Mute Controls when connected */}
            {connectionState === 'connected' && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setIsMicMuted(!isMicMuted)}
                  className={`p-1.5 rounded-lg border text-xs transition ${
                    isMicMuted
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                  title={isMicMuted ? 'Unmute microphone' : 'Mute microphone'}
                >
                  {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => {
                    if (!isMutedOutput) {
                      playerRef.current?.stop();
                    }
                    setIsMutedOutput(!isMutedOutput);
                  }}
                  className={`p-1.5 rounded-lg border text-xs transition ${
                    isMutedOutput
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                  title={isMutedOutput ? 'Unmute audio output' : 'Mute audio output'}
                >
                  {isMutedOutput ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>

          {/* Multilingual Support Pill */}
          <div className="mt-2 text-[11px] text-neutral-500 flex items-center gap-1.5">
            <Languages className="w-3 h-3 text-cyan-400" />
            <span>Ari speaks <strong>English</strong>, <strong>Eesti</strong> (Estonian), and <strong>Русский</strong> (Russian).</span>
          </div>
        </section>

        {/* Animated Audio Visualizer */}
        <section className="mb-6">
          <AudioVisualizer
            analyser={playerRef.current?.getAnalyser() || null}
            isAiSpeaking={isAiSpeaking}
            isListening={connectionState === 'connected' && !isAiSpeaking}
            isConnected={connectionState === 'connected'}
          />
        </section>

        {/* Suggested Question Chips (3-4 prominent topics) */}
        <section className="mb-6">
          <SuggestedChips
            onSelectQuestion={handleSelectQuestion}
            disabled={connectionState === 'connecting'}
          />
        </section>

        {/* Live Transcript Panel */}
        <section className="flex-1 mb-6 min-h-[300px]">
          <TranscriptPanel
            messages={messages}
            currentStreamingText={streamingAriText}
            onClear={() => setMessages([])}
            onSendTextQuery={handleTextQuerySubmit}
            isConnected={connectionState === 'connected'}
            isAiSpeaking={isAiSpeaking}
          />
        </section>

        {/* Quick Credential Cards / Talking CV Snapshot */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-neutral-800/60 text-xs">
          <div className="p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/60">
            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
              <Award className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-neutral-300">Southwestern</span>
            </div>
            <p className="font-bold text-white text-sm">$300,000+</p>
            <p className="text-[10px] text-neutral-500">5 Summers • Rural MN, USA</p>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/60">
            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
              <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-neutral-300">G4S Direct Project</span>
            </div>
            <p className="font-bold text-white text-sm">500+ Subscriptions</p>
            <p className="text-[10px] text-neutral-500">10 Weeks • 10-Rep Team Lead</p>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/60">
            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-semibold text-neutral-300">Education</span>
            </div>
            <p className="font-bold text-white text-sm">EBS 3rd Year</p>
            <p className="text-[10px] text-neutral-500">Intl Business Administration</p>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-900/40 border border-neutral-800/60">
            <div className="flex items-center gap-1.5 text-neutral-400 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-neutral-300">Company</span>
            </div>
            <p className="font-bold text-white text-sm">Sautin OÜ</p>
            <p className="text-[10px] text-neutral-500">Owner & Manager • Estonia</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-8 pt-4 pb-2 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-neutral-900">
          <p>© {new Date().getFullYear()} Artjom Alihodzin • Powered by Gemini Live Real-Time Native Audio</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsCvOpen(true)}
              className="text-neutral-400 hover:text-cyan-400 transition"
            >
              Verified CV
            </button>
            <span>•</span>
            <button
              onClick={() => setIsQrOpen(true)}
              className="text-neutral-400 hover:text-cyan-400 transition"
            >
              Scan QR Code
            </button>
          </div>
        </footer>
      </div>

      {/* Info Modals */}
      <QrModal isOpen={isQrOpen} onClose={() => setIsQrOpen(false)} />
      <CvSummaryModal isOpen={isCvOpen} onClose={() => setIsCvOpen(false)} />
    </div>
  );
}
