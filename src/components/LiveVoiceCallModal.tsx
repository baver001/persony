import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  VolumeX,
  Subtitles,
  AlertCircle,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { Persona, CallStatus, ChatMessage } from '../types';
import { AudioStreamer } from '../utils/audioStreamer';
import { soundFX } from '../utils/soundEffects';
import { callDiagnostics } from '../utils/callDiagnostics';
import { isMobileDevice } from '../utils/pcmAudio';

interface LiveVoiceCallModalProps {
  character: Persona;
  isOpen: boolean;
  onClose: () => void;
  onNewMessageFromCall?: (text: string, sender: 'user' | 'character') => void;
  recentMessages?: ChatMessage[];
  onEndCallSummary?: (
    durationSecs: number,
    transcripts: Array<{ id: string; sender: 'user' | 'character'; text: string }>,
    sessionId: string
  ) => void;
}

export const LiveVoiceCallModal: React.FC<LiveVoiceCallModalProps> = ({
  character,
  isOpen,
  onClose,
  onNewMessageFromCall,
  recentMessages,
  onEndCallSummary,
}) => {
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  // Audio levels for animated visualizer
  const [modelAudioLevel, setModelAudioLevel] = useState<number>(0);
  const [userAudioLevel, setUserAudioLevel] = useState<number>(0);

  const isModelSpeaking = modelAudioLevel > 0.06;
  const isUserSpeaking = userAudioLevel > 0.06;

  // Live subtitles
  const [transcripts, setTranscripts] = useState<Array<{ id: string; sender: 'user' | 'character'; text: string }>>([]);
  const transcriptsRef = useRef<Array<{ id: string; sender: 'user' | 'character'; text: string }>>([]);
  const durationRef = useRef(0);
  const statusRef = useRef<CallStatus>('connecting');
  const sessionIdRef = useRef('');
  const finalizedRef = useRef(false);

  const wsRef = useRef<WebSocket | null>(null);
  const audioStreamerRef = useRef<AudioStreamer | null>(null);
  const timerRef = useRef<number | null>(null);
  const ringtoneTimerRef = useRef<number | null>(null);
  const isMutedRef = useRef<boolean>(false);
  const isSpeakerMutedRef = useRef<boolean>(false);
  const interruptTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const appendTranscript = (sender: 'user' | 'character', text: string) => {
    setTranscripts((prev) => {
      const last = prev[prev.length - 1];
      let next: Array<{ id: string; sender: 'user' | 'character'; text: string }>;
      if (last && last.sender === sender) {
        const updated = [...prev];
        updated[updated.length - 1] = { ...last, text: `${last.text} ${text}`.trim() };
        next = updated;
      } else {
        next = [...prev, { id: Math.random().toString(36).slice(2, 10), sender, text }];
      }
      transcriptsRef.current = next;
      return next;
    });
  };

  isMutedRef.current = isMuted;
  isSpeakerMutedRef.current = isSpeakerMuted;

  // Format call duration MM:SS
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  const finalizeCall = () => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    onEndCallSummary?.(durationRef.current, [...transcriptsRef.current], sessionIdRef.current);
  };

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  useEffect(() => {
    if (!isOpen) {
      if (durationRef.current > 0 || transcriptsRef.current.length > 0) {
        finalizeCall();
      }
      cleanupCall();
      return;
    }

    finalizedRef.current = false;
    sessionIdRef.current = `call_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    transcriptsRef.current = [];
    durationRef.current = 0;
    statusRef.current = 'connecting';

    callDiagnostics.reset();
    callDiagnostics.startConsoleLogging();
    startCall();
    requestWakeLock();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMinimized(true);
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        audioStreamerRef.current?.resumeContexts();
      }
    };

    const handlePageShow = () => {
      audioStreamerRef.current?.resumeContexts();
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('focus', handlePageShow);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('focus', handlePageShow);
      releaseWakeLock();
      callDiagnostics.stopConsoleLogging();
      cleanupCall();
    };
  }, [isOpen, character.id]);

  const requestWakeLock = async () => {
    if (!isMobileDevice() || !('wakeLock' in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen');
    } catch {
      // permission denied or unsupported
    }
  };

  const releaseWakeLock = async () => {
    try {
      await wakeLockRef.current?.release();
    } catch {
      // ignore
    }
    wakeLockRef.current = null;
  };

  const cleanupCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (ringtoneTimerRef.current) {
      clearInterval(ringtoneTimerRef.current);
      ringtoneTimerRef.current = null;
    }
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {
        // ignore
      }
      wsRef.current = null;
    }
    if (interruptTimerRef.current) {
      clearTimeout(interruptTimerRef.current);
      interruptTimerRef.current = null;
    }
    if (audioStreamerRef.current) {
      audioStreamerRef.current.stop();
      audioStreamerRef.current = null;
    }
    setModelAudioLevel(0);
    setUserAudioLevel(0);
  };

  const startCall = async () => {
    setStatus('connecting');
    setErrorMessage(null);
    setDuration(0);
    setTranscripts([]);
    transcriptsRef.current = [];
    durationRef.current = 0;

    // Play initial call ringtone
    soundFX.playCallingTone();
    ringtoneTimerRef.current = window.setInterval(() => {
      soundFX.playCallingTone();
    }, 3000);

    const streamer = new AudioStreamer();
    audioStreamerRef.current = streamer;

    streamer.onSpeakerVolumeChange = (lvl) => {
      if (isSpeakerMutedRef.current) return;
      setModelAudioLevel(lvl);
    };
    streamer.onMicVolumeChange = (lvl) => {
      if (isMutedRef.current) return;
      setUserAudioLevel(lvl);
    };

    try {
      // 1. Microphone capture setup
      await streamer.startRecording((pcm16Base64) => {
        if (isMutedRef.current) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'audio',
              data: pcm16Base64,
            })
          );
        }
      });

      // 2. Setup WebSocket connection to server Live API endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // Send initialization payload with character identity, voice config, and recent chat history
        ws.send(
          JSON.stringify({
            type: 'init',
            characterName: character.name,
            systemPrompt: character.systemPrompt,
            voiceName: character.voice,
            recentChatContext: recentMessages?.slice(-6),
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'connected') {
            if (ringtoneTimerRef.current) {
              clearInterval(ringtoneTimerRef.current);
              ringtoneTimerRef.current = null;
            }
            soundFX.playCallConnect();
            setStatus('connected');
            statusRef.current = 'connected';
            void streamer.resumeContexts();
            streamer.initPlayback();

            // Start duration timer
            timerRef.current = window.setInterval(() => {
              setDuration((prev) => {
                const next = prev + 1;
                durationRef.current = next;
                return next;
              });
            }, 1000);
          } else if (msg.type === 'audio') {
            if (interruptTimerRef.current) {
              clearTimeout(interruptTimerRef.current);
              interruptTimerRef.current = null;
            }
            if (!isSpeakerMutedRef.current) {
              streamer.playChunk(msg.data);
            }
          } else if (msg.type === 'interrupted') {
            // Debounce: mobile echo/noise can trigger false interrupts
            if (interruptTimerRef.current) {
              clearTimeout(interruptTimerRef.current);
            }
            interruptTimerRef.current = window.setTimeout(() => {
              streamer.stopAllPlayback();
              setModelAudioLevel(0);
              interruptTimerRef.current = null;
            }, isMobileDevice() ? 120 : 60);
          } else if (msg.type === 'model_transcript') {
            if (msg.text) {
              appendTranscript('character', msg.text);
              onNewMessageFromCall?.(msg.text, 'character');
            }
          } else if (msg.type === 'user_transcript') {
            if (msg.text) {
              appendTranscript('user', msg.text);
              onNewMessageFromCall?.(msg.text, 'user');
            }
          } else if (msg.type === 'error') {
            setErrorMessage(msg.message || 'Ошибка соединения с Gemini Live');
            setStatus('error');
          } else if (msg.type === 'session_closed') {
            handleEndCall();
          }
        } catch (err) {
          console.error('Error handling WebSocket message in Call Modal:', err);
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket Live API error:', e);
        if (ringtoneTimerRef.current) {
          clearInterval(ringtoneTimerRef.current);
          ringtoneTimerRef.current = null;
        }
        setErrorMessage('Не удалось подключиться к серверу Live API. Проверьте микрофон и ключ API.');
        setStatus('error');
      };

      ws.onclose = () => {
        if (statusRef.current === 'connected') {
          handleEndCall();
        }
      };
    } catch (err: any) {
      console.error('Error initiating call:', err);
      if (ringtoneTimerRef.current) {
        clearInterval(ringtoneTimerRef.current);
        ringtoneTimerRef.current = null;
      }
      setErrorMessage(err.name === 'NotAllowedError' ? 'Доступ к микрофону заблокирован в браузере' : err.message);
      setStatus('error');
    }
  };

  const handleEndCall = () => {
    if (finalizedRef.current) {
      cleanupCall();
      setTimeout(() => onClose(), 100);
      return;
    }
    soundFX.playCallEnd();
    cleanupCall();
    setStatus('ended');
    statusRef.current = 'ended';
    finalizeCall();
    setTimeout(() => {
      onClose();
    }, 400);
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
    if (!isMuted) {
      setUserAudioLevel(0);
    }
  };

  const handleToggleSpeaker = () => {
    const next = !isSpeakerMuted;
    setIsSpeakerMuted(next);
    if (next && audioStreamerRef.current) {
      audioStreamerRef.current.stopAllPlayback();
      setModelAudioLevel(0);
    }
  };

  const sendQuickLivePrompt = (text: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'text', text }));
      setTranscripts((prev) => [...prev, { id: Math.random().toString(), sender: 'user', text }]);
      onNewMessageFromCall?.(text, 'user');
    }
  };

  const liveCue = transcripts.length > 0 ? transcripts[transcripts.length - 1] : null;
  const liveCueSpeakerLabel =
    liveCue?.sender === 'user' ? 'Вы' : character.name.split(' ')[0];

  if (!isOpen) return null;

  if (isMinimized) {
    return (
      <div
        id="minimized-call-pill"
        className="fixed left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1rem)] max-w-md pointer-events-auto top-[calc(env(safe-area-inset-top,0px)+0.75rem)]"
      >
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          className="bg-[#18181b]/95 backdrop-blur-md border border-zinc-700 rounded-2xl shadow-2xl p-2.5 flex items-center justify-between gap-3 select-none text-white ring-1 ring-black/40"
        >
          {/* Avatar with pulsing green ring */}
          <div className="relative shrink-0 cursor-pointer" onClick={() => setIsMinimized(false)}>
            <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-emerald-500">
              <img src={character.avatar} alt={character.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-[#18181b]" />
          </div>

          {/* Details & mini wave */}
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setIsMinimized(false)}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold truncate">{character.name}</span>
              <span className="text-[10px] text-zinc-400 font-mono font-medium">{formatDuration(duration)}</span>
            </div>
            <div className="flex items-center gap-1 h-3 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-[10px] text-white/50 truncate">
                {status === 'connected' ? 'Звонок активен' : 'Соединение...'}
              </span>
            </div>
          </div>

          {/* Controls: Mute, Expand, Hangup */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-full transition-colors ${
                isMuted ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
              title={isMuted ? 'Включить микрофон' : 'Выключить микрофон'}
            >
              {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsMinimized(false)}
              className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
              title="Развернуть звонок"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleEndCall}
              className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md transition-colors"
              title="Завершить звонок"
            >
              <PhoneOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <div
        id="live-call-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md transition-all duration-300"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 280 }}
          className="relative w-full h-[100dvh] sm:h-auto sm:max-h-[92vh] sm:max-w-xl bg-gradient-to-b from-zinc-900 via-[#18181b] to-zinc-950 sm:rounded-3xl border-0 sm:border border-zinc-800 shadow-2xl flex flex-col justify-between overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6 pb-2 z-10">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
              </span>
              <span className="text-xs text-white/60 font-medium">
                {status === 'connected' ? 'Голосовой звонок' : 'Вызов...'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="toggle-subtitles-btn"
                onClick={() => setShowSubtitles(!showSubtitles)}
                className={`p-2 rounded-full transition-colors text-xs flex items-center gap-1 cursor-pointer ${
                  showSubtitles
                    ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
                title="Субтитры разговора"
              >
                <Subtitles className="w-4 h-4" />
              </button>

              <button
                id="toggle-minimize-btn"
                onClick={() => setIsMinimized(true)}
                className="flex p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                title="Свернуть звонок"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Visualizer Stage */}
          <div className="relative flex-1 flex flex-col items-center justify-center px-6 py-6 select-none overflow-hidden">
            {/* Gentle ambient glow behind avatar */}
            <div className="relative flex items-center justify-center my-4">
              <div
                className="absolute inset-0 rounded-full blur-2xl pointer-events-none transition-opacity duration-700"
                style={{
                  backgroundColor: character.color || '#71717a',
                  opacity: status === 'connected' ? (isModelSpeaking ? 0.35 : 0.16) : 0.08,
                  transform: 'scale(1.2)',
                }}
              />

              {/* Character Avatar with subtle glow */}
              <div
                className={`relative z-10 w-36 h-36 sm:w-40 sm:h-40 rounded-full p-1 bg-white/10 transition-all duration-300 shadow-2xl ${
                  isModelSpeaking
                    ? 'shadow-[0_0_30px_rgba(255,255,255,0.15)] ring-2 ring-zinc-500/50'
                    : 'shadow-[0_0_20px_rgba(0,0,0,0.5)] ring-1 ring-white/10'
                }`}
              >
                <img
                  src={character.avatar}
                  alt={character.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>

            {/* Character Info */}
            <div className="mt-4 text-center z-10">
              <h2 className="text-2xl font-bold text-white tracking-tight">{character.name}</h2>
              <p className="text-sm text-white/60 mt-1 max-w-sm line-clamp-1">{character.tagline}</p>

              {/* Stable Status Pill (No jumping or jitter during speech) */}
              <div className="inline-flex items-center justify-center min-w-[90px] h-7 mt-3 px-3 rounded-full bg-white/5 border border-white/10 text-xs select-none">
                {status === 'connecting' && <span className="text-amber-300">Соединение...</span>}
                {status === 'connected' && (
                  <span className="font-mono text-emerald-400 font-medium tracking-wider">
                    {formatDuration(duration)}
                  </span>
                )}
                {status === 'ended' && <span className="text-rose-400">Звонок завершён</span>}
                {status === 'error' && <span className="text-rose-400">Ошибка вызова</span>}
              </div>

              {errorMessage && (
                <div className="mt-3 text-xs text-rose-300 bg-rose-950/40 border border-rose-800/40 px-3 py-2 rounded-xl max-w-md mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-left">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{errorMessage}</span>
                  </div>
                  <button
                    onClick={startCall}
                    className="px-2.5 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-white text-[11px] font-semibold shrink-0 transition-colors border border-rose-700/50 cursor-pointer"
                  >
                    Повторить
                  </button>
                </div>
              )}
            </div>

            {/* Live subtitle — only the current utterance; full history saved to chat after call */}
            {showSubtitles && liveCue && (
              <div
                id="live-call-subtitle"
                className="relative w-full max-w-md mt-4 h-[4.25rem] overflow-hidden rounded-xl bg-black/30 border border-white/5"
                aria-live="polite"
              >
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-[#18181b]/90 to-transparent"
                  aria-hidden
                />
                <div className="relative h-full px-3.5 pb-2.5 pt-1">
                  <AnimatePresence initial={false}>
                    <motion.div
                      key={liveCue.id}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -24, opacity: 0 }}
                      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                      className={`absolute inset-x-3.5 bottom-2.5 text-xs leading-relaxed line-clamp-3 ${
                        liveCue.sender === 'user' ? 'text-emerald-300 text-right' : 'text-zinc-100 text-left'
                      }`}
                    >
                      <span className="font-semibold opacity-80">{liveCueSpeakerLabel}</span>
                      <span className="mx-1 opacity-40">·</span>
                      <span className="text-white/90">{liveCue.text}</span>
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Quick Starters in Call (clean, minimal) */}
            {status === 'connected' && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 mt-5 max-w-md">
                <button
                  onClick={() => sendQuickLivePrompt('Привет! Расскажи о себе.')}
                  className="px-3 py-1 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
                >
                  Привет! Расскажи о себе
                </button>
                <button
                  onClick={() => sendQuickLivePrompt('Как настроение?')}
                  className="px-3 py-1 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors border border-white/5"
                >
                  Как настроение?
                </button>
              </div>
            )}
          </div>

          {/* Bottom Call Controls Bar */}
          <div className="px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-center gap-6 z-10">
            {/* Mute Microphone */}
            <button
              id="call-mute-btn"
              onClick={handleToggleMute}
              className={`p-4 rounded-full transition-all duration-200 flex items-center justify-center ${
                isMuted
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 ring-2 ring-rose-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
              title={isMuted ? 'Включить микрофон' : 'Отключить микрофон'}
            >
              {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>

            {/* End Call Button (Big Red) */}
            <button
              id="call-hangup-btn"
              onClick={handleEndCall}
              className="p-5 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white shadow-xl shadow-rose-900/40 transition-all duration-200 flex items-center justify-center"
              title="Завершить звонок"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            {/* Speaker Mute */}
            <button
              id="call-speaker-btn"
              onClick={handleToggleSpeaker}
              className={`p-4 rounded-full transition-all duration-200 flex items-center justify-center ${
                isSpeakerMuted
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 ring-2 ring-amber-500/30'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
              }`}
              title={isSpeakerMuted ? 'Включить звук' : 'Заглушить динамик'}
            >
              {isSpeakerMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
