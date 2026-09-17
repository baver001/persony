import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Send,
  ArrowUp,
  Mic,
  MoreVertical,
  Check,
  CheckCheck,
  Sparkles,
  Smile,
  Copy,
  Volume2,
  RefreshCw,
  Info,
  Square,
  Play,
  Pause,
  Maximize2,
  PhoneOff,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  PanelLeftOpen,
  PanelLeft,
  AlertCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Persona, ChatMessage } from '../types';
import { soundFX } from '../utils/soundEffects';
import { getLocalizedPersonaPresentation } from '../utils/personaPresentation';
import { audioBlobToWav } from '../utils/audioUtils';
import {
  copyTextToClipboard,
  formatDialogCopyText,
  formatMessageCopyText,
} from '../utils/chatClipboard';
import {
  MessageContextMenu,
  messageMenuIcons,
  type MessageContextMenuItem,
} from './MessageContextMenu';
import { normalizeUserMessageForDisplay } from '../utils/chatMessageDisplay';

interface ChatAreaProps {
  character: Persona;
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  onSendMessage: (
    text: string,
    isVoiceNote?: boolean,
    audioBlobUrl?: string,
    audioDuration?: number,
    audioBase64?: string,
    initialTranscript?: string
  ) => void;
  onStartCall: (character: Persona) => void;
  onOpenProfile: (character: Persona) => void;
  onBackToList?: () => void;
  theme: 'dark' | 'light';
  isCallingActive?: boolean;
  onExpandCall?: () => void;
  onEndActiveCall?: () => void;
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  onRetryMessage?: () => void;
  onDeleteMessage?: (messageId: string) => void;
  hasOlderMessages?: boolean;
  isLoadingOlderMessages?: boolean;
  onLoadOlderMessages?: () => void;
}

const EMOJI_LIST = ['👍', '🔥', '❤️', '💡', '⚡', '🚀', '👏', '😂', '🤔', '🎉', '👋', '☕'];

// Persony message markdown renderer
const PersonyMarkdown: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: content.substring(lastIndex, match.index) });
    }
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({ type: 'text', value: content.substring(lastIndex) });
  }

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const renderInline = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      const cleanLine = isBullet ? line.trim().substring(2) : line;
      const inlineSegments = cleanLine.split(/(`[^`]+`)/g);

      const formattedLine = inlineSegments.map((seg, sIdx) => {
        if (seg.startsWith('`') && seg.endsWith('`') && seg.length > 2) {
          return (
            <code
              key={sIdx}
              className={`px-1.5 py-0.5 rounded text-[12px] font-mono ${
                isUser ? 'bg-black/25 text-white' : 'bg-black/10 dark:bg-black/40 text-zinc-700 dark:text-zinc-200'
              }`}
            >
              {seg.slice(1, -1)}
            </code>
          );
        }

        const boldSegments = seg.split(/(\*\*[^*]+\*\*)/g);
        return boldSegments.map((bSeg, bIdx) => {
          if (bSeg.startsWith('**') && bSeg.endsWith('**') && bSeg.length > 4) {
            return <strong key={bIdx} className="font-bold">{bSeg.slice(2, -2)}</strong>;
          }
          return bSeg;
        });
      });

      return (
        <React.Fragment key={lineIdx}>
          {isBullet ? (
            <div className="flex items-start gap-1.5 my-0.5">
              <span className="text-zinc-400 shrink-0 leading-relaxed">•</span>
              <span>{formattedLine}</span>
            </div>
          ) : (
            <div>{formattedLine}</div>
          )}
        </React.Fragment>
      );
    });
  };

  return (
    <div className="space-y-1.5">
      {parts.map((p, idx) => {
        if (p.type === 'code') {
          return (
            <div
              key={idx}
              className="my-2 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 text-neutral-200 text-xs font-mono"
            >
              <div className="flex items-center justify-between px-3 py-1 bg-black/40 border-b border-white/5 text-[11px] text-white/50">
                <span className="uppercase">{p.language}</span>
                <button
                  onClick={() => copyCode(p.code || '', idx)}
                  className="flex items-center gap-1 hover:text-white transition-colors"
                >
                  {copiedIndex === idx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Скопировано</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Копировать</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[12px] leading-relaxed">
                <code>{p.code}</code>
              </pre>
            </div>
          );
        }
        return <div key={idx}>{renderInline(p.value || '')}</div>;
      })}
    </div>
  );
};

const VOICE_WAVE_HEIGHTS = [4, 8, 14, 8, 16, 12, 6, 14, 18, 10, 8, 14, 6, 12, 16, 8, 10, 14, 8, 6];

const VoiceWaveform: React.FC<{
  live?: boolean;
  isPlaying?: boolean;
  barClassName?: string;
}> = ({ live = false, isPlaying = false, barClassName }) => (
  <div className={`py-voice-waveform${live ? ' py-voice-waveform--live' : ''}`}>
    {VOICE_WAVE_HEIGHTS.map((h, i) => (
      <span
        key={i}
        className={`py-voice-waveform-bar ${isPlaying && !live ? 'animate-pulse' : ''} ${barClassName ?? ''}`}
        style={{
          height: isPlaying && !live ? `${((i % 5) + 2) * 3.5}px` : `${h}px`,
          animationDelay: live ? `${(i % 7) * 0.09}s` : undefined,
        }}
      />
    ))}
  </div>
);

// Voice Note Audio Bubble with Transcription
const VoiceNoteBubble: React.FC<{
  audioUrl?: string;
  duration?: number;
  isUser: boolean;
  transcript?: string;
  isTranscribing?: boolean;
}> = ({
  audioUrl,
  duration = 3,
  isUser,
  transcript,
  isTranscribing,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current && audioUrl) {
      audioRef.current = new Audio(audioUrl);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="flex flex-col py-1 w-full max-w-[min(85vw,20rem)] sm:max-w-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform active:scale-95 shadow-sm shrink-0 cursor-pointer ${
            isUser
              ? 'bg-white text-zinc-900'
              : 'bg-zinc-700 hover:bg-zinc-600 dark:bg-zinc-700 dark:text-zinc-100 text-white'
          }`}
          title={isPlaying ? 'Пауза' : 'Воспроизвести'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <div className="flex-1 min-w-0">
          <VoiceWaveform
            isPlaying={isPlaying}
            barClassName={
              isPlaying
                ? 'bg-emerald-400/90'
                : isUser
                  ? '!bg-white/75'
                  : '!bg-white/40'
            }
          />
          <div className="flex items-center justify-between text-[10px] opacity-75 mt-0.5">
            <span>{isPlaying ? 'Воспроизведение...' : 'Голосовое сообщение'}</span>
            <span>0:{duration.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {/* Transcription block */}
      {(isTranscribing || transcript) && (
        <div className="mt-2.5 pt-2 border-t border-white/10 text-xs">
          {isTranscribing ? (
            <div className="flex items-center gap-1.5 opacity-80 text-[11px] animate-pulse">
              <Sparkles className="w-3.5 h-3.5 text-zinc-300" />
              <span>Расшифровка речи...</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] opacity-60">
                <span className="font-semibold uppercase tracking-wider">Расшифровка</span>
                <button
                  type="button"
                  onClick={() => setShowTranscript(!showTranscript)}
                  className="hover:underline text-[10px] cursor-pointer"
                >
                  {showTranscript ? 'Скрыть' : 'Показать'}
                </button>
              </div>
              {showTranscript && (
                <p className={`text-[12px] leading-relaxed italic px-2.5 py-1.5 rounded-lg border ${
                  isUser
                    ? 'text-white/95 bg-black/20 border-white/10'
                    : 'text-neutral-900 dark:text-white/95 bg-black/5 dark:bg-black/25 border-neutral-200 dark:border-white/5'
                }`}>
                  «{transcript}»
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ChatArea: React.FC<ChatAreaProps> = ({
  character,
  messages,
  isStreaming,
  streamingText,
  onSendMessage,
  onStartCall,
  onOpenProfile,
  onBackToList,
  theme,
  isCallingActive,
  onExpandCall,
  onEndActiveCall,
  isSidebarOpen = true,
  onToggleSidebar,
  onRetryMessage,
  onDeleteMessage,
  hasOlderMessages = false,
  isLoadingOlderMessages = false,
  onLoadOlderMessages,
}) => {
  const { t, i18n } = useTranslation(['chat', 'common']);
  const localized = getLocalizedPersonaPresentation(character, i18n.language);
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    messageId: string;
  } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchInChat, setSearchInChat] = useState('');

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  const speechRecognitionRef = useRef<any>(null);
  const localTranscriptRef = useRef<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [character.id]);

  const lastMessageId = messages[messages.length - 1]?.id;

  useEffect(() => {
    if (pendingScrollRestoreRef.current !== null) return;
    scrollToBottom(true);
  }, [lastMessageId, streamingText, isStreaming]);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el || pendingScrollRestoreRef.current === null) return;
    const previousHeight = pendingScrollRestoreRef.current;
    pendingScrollRestoreRef.current = null;
    el.scrollTop = el.scrollHeight - previousHeight;
  }, [messages]);

  const handleMessagesScroll = () => {
    const el = scrollContainerRef.current;
    if (!el || !onLoadOlderMessages || !hasOlderMessages || isLoadingOlderMessages) return;
    if (el.scrollTop <= 48) {
      pendingScrollRestoreRef.current = el.scrollHeight;
      onLoadOlderMessages();
    }
  };

  // Autosize textarea without unwanted scrollbars and smoothly expand upwards
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const minH = 20;
    const maxH = 160;
    const scrollH = textarea.scrollHeight;
    const targetH = Math.min(Math.max(scrollH, minH), maxH);
    textarea.style.height = `${targetH}px`;
    textarea.style.overflowY = scrollH > maxH ? 'auto' : 'hidden';
  }, [inputText]);

  const handleSend = () => {
    if (!inputText.trim() || isStreaming) return;
    const text = inputText.trim();
    setInputText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '20px';
      textareaRef.current.style.overflowY = 'hidden';
    }
    soundFX.playSend();
    onSendMessage(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingStartTimeRef.current = Date.now();
      localTranscriptRef.current = '';

      // Optional real-time browser speech recognition for instant transcript
      const SpeechRecClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecClass) {
        try {
          const rec = new SpeechRecClass();
          rec.lang = 'ru-RU';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (evt: any) => {
            let combined = '';
            for (let i = 0; i < evt.results.length; i++) {
              combined += evt.results[i][0].transcript;
            }
            if (combined.trim()) {
              localTranscriptRef.current = combined.trim();
            }
          };
          rec.onerror = () => {};
          rec.start();
          speechRecognitionRef.current = rec;
        } catch (recErr) {
          console.log('SpeechRec not available:', recErr);
        }
      }

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const elapsedSecs = Math.max(
          1,
          Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
        );

        // Convert audio Blob into clean 16kHz mono WAV for 100% reliable Gemini transcription
        try {
          const { wavBlob, wavBase64, duration } = await audioBlobToWav(audioBlob);
          const audioUrl = URL.createObjectURL(wavBlob);
          const finalDuration = duration > 0 ? duration : elapsedSecs;
          onSendMessage(
            '🎤 [Голосовое сообщение]',
            true,
            audioUrl,
            finalDuration,
            wavBase64,
            localTranscriptRef.current
          );
        } catch (wavErr) {
          console.warn('WAV conversion fallback:', wavErr);
          const audioUrl = URL.createObjectURL(audioBlob);
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = () => {
            const resultStr = reader.result as string;
            const base64Data = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
            onSendMessage(
              '🎤 [Голосовое сообщение]',
              true,
              audioUrl,
              elapsedSecs,
              base64Data,
              localTranscriptRef.current
            );
          };
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start(100);
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        const currentElapsed = Math.max(
          1,
          Math.round((Date.now() - recordingStartTimeRef.current) / 1000)
        );
        setRecordingSeconds(currentElapsed);
      }, 1000);
    } catch (err) {
      console.error('Microphone error for voice note:', err);
      onStartCall(character);
    }
  };

  const stopVoiceRecording = (cancel = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      speechRecognitionRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      if (cancel) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      } else {
        mediaRecorderRef.current.stop();
      }
    }
    setIsRecordingVoice(false);
  };

  const showCopyFeedback = (label: string) => {
    setCopyFeedback(label);
    window.setTimeout(() => setCopyFeedback(null), 1600);
  };

  const openMessageMenu = (clientX: number, clientY: number, messageId: string) => {
    setContextMenu({ x: clientX, y: clientY, messageId });
  };

  const handleMessageContextMenu = (
    event: React.MouseEvent,
    messageId: string
  ) => {
    event.preventDefault();
    openMessageMenu(event.clientX, event.clientY, messageId);
  };

  const handleMessageTouchStart = (
    event: React.TouchEvent,
    messageId: string
  ) => {
    const touch = event.touches[0];
    if (!touch) return;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      openMessageMenu(touch.clientX, touch.clientY, messageId);
    }, 480);
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleCopyMessage = async (message: ChatMessage) => {
    const ok = await copyTextToClipboard(formatMessageCopyText(message));
    if (ok) showCopyFeedback('Сообщение скопировано');
  };

  const handleCopyDialog = async () => {
    const ok = await copyTextToClipboard(formatDialogCopyText(messages, character.name));
    if (ok) showCopyFeedback('Диалог скопирован');
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isDark = theme === 'dark';
  const showMobileBack = Boolean(onBackToList);
  const showDesktopExpand = Boolean(onToggleSidebar && !isSidebarOpen);
  const showNavSlot = showMobileBack || showDesktopExpand;

  const displayedMessages = searchInChat.trim()
    ? messages.filter((m) => m.text.toLowerCase().includes(searchInChat.toLowerCase()))
    : messages;

  return (
    <div
      id="chat-area-container"
      className="relative flex-1 flex flex-col h-full overflow-hidden py-chat-bg min-h-0 min-w-0"
    >

      {/* Header */}
      <div
        id="chat-header"
        className="relative z-10 flex items-center justify-between gap-2 px-2 sm:px-4 py-2 sm:py-2.5 border-b border-py-border bg-py-sidebar text-py-text transition-colors shadow-xs shrink-0"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          {/* Nav: mobile back OR desktop expand — never duplicate sidebar collapse */}
          <div
            className={`py-header-nav-slot transition-[width] duration-150 ${
              showNavSlot ? '' : 'w-0 min-w-0 overflow-hidden'
            }`}
          >
            {showMobileBack && (
              <button
                type="button"
                onClick={onBackToList}
                className="py-header-icon-btn py-header-icon-btn--muted inline-flex sm:hidden cursor-pointer"
                title={t('chat:backToChats')}
                aria-label={t('chat:backToChats')}
              >
                <PanelLeft className="w-4 h-4" />
              </button>
            )}
            {showDesktopExpand && (
              <button
                id="chat-sidebar-toggle-btn"
                type="button"
                onClick={onToggleSidebar}
                className="py-header-icon-btn py-header-icon-btn--muted hidden sm:inline-flex cursor-pointer"
                title={t('chat:expandSidebar')}
                aria-label={t('chat:expandSidebar')}
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Contact Avatar */}
          <div
            onClick={() => onOpenProfile(character)}
            className="relative cursor-pointer group shrink-0"
          >
            <div
              className={`w-10 h-10 rounded-full overflow-hidden transition-all group-hover:opacity-90 ${
                isCallingActive ? 'ring-2 ring-py-accent' : 'ring-1 ring-py-border'
              }`}
            >
              <img
                src={character.avatar}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-py-sidebar ${
                isCallingActive ? 'bg-py-accent animate-pulse' : 'bg-py-online'
              }`}
            />
          </div>

          {/* Contact Details */}
          <div
            onClick={() => onOpenProfile(character)}
            className="cursor-pointer min-w-0 flex-1"
          >
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold truncate leading-tight tracking-tight">
                {character.name}
              </h2>
              {character.badge && (
                <span className={`hidden min-[400px]:inline-flex text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                  isDark
                    ? 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                    : 'bg-neutral-100 text-neutral-700 border border-neutral-200'
                }`}>
                  {character.badge}
                </span>
              )}
            </div>
            <p className="text-[11px] sm:text-xs text-py-text-secondary truncate leading-tight mt-0.5">
              {isCallingActive ? (
                <span className="text-py-accent font-medium">в звонке</span>
              ) : isStreaming ? (
                <span className="text-py-text animate-pulse font-medium">печатает...</span>
              ) : (
                `в сети • голос ${character.voice}`
              )}
            </p>
          </div>
        </div>

        {/* Header Right Action Icons */}
        <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
          {/* Search in Chat Button — desktop only */}
          <button
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`py-header-icon-btn hidden sm:inline-flex cursor-pointer ${
              isSearchOpen ? 'py-header-icon-btn--accent' : 'py-header-icon-btn--muted'
            }`}
            title={t('chat:searchInChat')}
            aria-label={t('chat:searchInChat')}
          >
            <Search className="w-4 h-4" />
          </button>

          <button
            id="chat-call-btn"
            onClick={() => (isCallingActive ? onExpandCall?.() : onStartCall(character))}
            className={`py-header-icon-btn cursor-pointer ${
              isCallingActive
                ? 'py-header-icon-btn--accent'
                : 'py-header-icon-btn--muted'
            }`}
            title={isCallingActive ? t('chat:expandCall') : t('chat:voiceCall')}
            aria-label={isCallingActive ? t('chat:expandCall') : t('chat:voiceCall')}
          >
            {isCallingActive ? <Maximize2 className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
          </button>

          <button
            id="chat-profile-btn"
            onClick={() => onOpenProfile(character)}
            className="py-header-icon-btn py-header-icon-btn--muted hidden sm:inline-flex cursor-pointer"
            title={t('chat:personaInfo')}
            aria-label={t('chat:personaInfo')}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-Chat Search Bar Toggle */}
      {isSearchOpen && (
        <div
          className={`px-4 py-2 border-b flex items-center gap-2 ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-neutral-50 border-neutral-200'
          }`}
        >
          <Search className={`w-4 h-4 ${isDark ? 'text-zinc-500' : 'text-neutral-400'}`} />
          <input
            type="text"
            value={searchInChat}
            onChange={(e) => setSearchInChat(e.target.value)}
            placeholder="Поиск сообщений в этом чате..."
            className={`flex-1 bg-transparent text-xs focus:outline-none ${
              isDark ? 'text-zinc-100 placeholder-zinc-500' : 'text-neutral-900 placeholder-neutral-400'
            }`}
            autoFocus
          />
          {searchInChat && (
            <button
              onClick={() => setSearchInChat('')}
              className={`py-touch-target p-1 rounded-md transition-colors ${
                isDark ? 'text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800' : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200'
              }`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => {
              setIsSearchOpen(false);
              setSearchInChat('');
            }}
            className={`text-xs hover:underline font-medium ${isDark ? 'text-zinc-300' : 'text-neutral-700'}`}
          >
            Закрыть
          </button>
        </div>
      )}

      {/* 3. Messages Stream */}
      <div
        id="messages-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleMessagesScroll}
        className={`flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 min-h-0 ${
          isCallingActive ? 'py-call-pill-offset' : ''
        }`}
      >
        <div className="py-chat-thread py-3 sm:py-6 space-y-3.5 min-h-full">
        {/* Date Badge */}
        <div className="flex justify-center my-2 select-none">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium shadow-xs ${
              isDark
                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700/60'
                : 'bg-white/90 text-neutral-700 border border-neutral-200'
            }`}
          >
            {new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
          </span>
        </div>

        {/* If no messages, render character intro */}
        {messages.length === 0 && (
          <div className="max-w-md mx-auto my-8 sm:my-10 text-center space-y-5">
            <div
              className={`w-[4.5rem] h-[4.5rem] rounded-full mx-auto overflow-hidden shadow-md ${
                isCallingActive
                  ? 'ring-2 ring-py-accent ring-offset-2 ring-offset-py-chat'
                  : 'ring-1 ring-py-border'
              }`}
            >
              <img
                src={character.avatar}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-1.5 px-2">
              <h3 className="text-base font-semibold tracking-tight text-py-text">{character.name}</h3>
              <p className="text-sm text-py-text-secondary max-w-sm mx-auto leading-relaxed">
                {localized.description}
              </p>
            </div>

            {isCallingActive && (
              <div className="py-surface-card p-4 text-left">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-py-accent animate-pulse" />
                  <span className="text-xs font-semibold text-py-text">{t('chat:callInProgress')}</span>
                </div>
                <p className="text-xs text-py-text-secondary leading-relaxed">
                  {t('chat:callInProgressHint')}
                </p>
                <button
                  type="button"
                  onClick={() => onExpandCall?.()}
                  className="mt-3 w-full px-3 py-2 rounded-xl bg-py-accent/15 hover:bg-py-accent/25 text-py-accent text-xs font-semibold flex items-center justify-center gap-1.5 border border-py-accent/30 cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> {t('chat:expandCall')}
                </button>
              </div>
            )}

            {!isCallingActive && localized.starterMessages && localized.starterMessages.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <span className="text-[11px] font-medium text-py-text-muted uppercase tracking-wider flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3 h-3" /> {t('chat:startConversation')}
                </span>
                <div className="flex flex-col gap-2">
                  {localized.starterMessages.map((msg, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => onSendMessage(msg)}
                      className="py-starter-chip group cursor-pointer"
                    >
                      <span>{msg}</span>
                      <Send className="w-3.5 h-3.5 text-py-text-muted opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-py-text-muted pt-1">
                  {t('chat:voiceHint')}
                </p>
              </div>
            )}
          </div>
        )}

        {isLoadingOlderMessages && (
          <div className="flex justify-center py-2 text-xs text-zinc-500">
            Загрузка истории…
          </div>
        )}

        {/* Render Message List */}
        {displayedMessages.map((msg) => {
          const isUser = msg.sender === 'user';
          const displayMsg =
            isUser && !msg.isVoiceNote
              ? (() => {
                  const normalized = normalizeUserMessageForDisplay(msg.text);
                  return normalized.isVoiceNote ? { ...msg, ...normalized } : msg;
                })()
              : msg;
          const isCallSummary = msg.isCallSummary;

          if (isCallSummary) {
            const hasTranscripts = msg.callTranscripts && msg.callTranscripts.length > 0;
            const isExpanded = expandedCallId === msg.id;

            return (
              <div
                key={msg.id}
                className="flex justify-end my-2"
                onContextMenu={(e) => handleMessageContextMenu(e, msg.id)}
                onTouchStart={(e) => handleMessageTouchStart(e, msg.id)}
                onTouchEnd={handleMessageTouchEnd}
                onTouchCancel={handleMessageTouchEnd}
              >
                <div className={`rounded-2xl p-3 shadow-md w-full max-w-md ml-auto border ${
                  isDark
                    ? 'bg-zinc-800 text-white border-zinc-700'
                    : 'bg-neutral-800 text-white border-neutral-700'
                }`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-full bg-white/15 text-white">
                        <PhoneCall className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold block leading-tight">
                          Голосовой звонок
                        </span>
                        <span className="text-[11px] text-white/70 block mt-0.5">
                          Длительность: {Math.floor((msg.callDurationSecs || 0) / 60)}:
                          {((msg.callDurationSecs || 0) % 60).toString().padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <button
                        onClick={() => onStartCall(character)}
                        className="px-2 py-1 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-[11px] font-medium transition-colors flex items-center gap-1 border border-zinc-600 cursor-pointer"
                      >
                        <Phone className="w-3 h-3" /> Перезвонить
                      </button>
                      <span className="text-[10px] text-white/60 mt-1">
                        {formatTime(msg.timestamp)} ↙
                      </span>
                    </div>
                  </div>

                  {/* Transcripts toggle */}
                  {hasTranscripts && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <button
                        onClick={() => setExpandedCallId(isExpanded ? null : msg.id)}
                        className="text-[11px] text-white/80 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {isExpanded ? 'Скрыть стенограмму' : 'Показать стенограмму'}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto text-xs p-2 rounded-xl bg-black/40 border border-white/5 scrollbar-thin">
                          {msg.callTranscripts?.map((t, tIdx) => (
                            <div
                              key={tIdx}
                              className={`flex gap-1.5 ${
                                t.sender === 'user' ? 'text-emerald-300' : 'text-zinc-300'
                              }`}
                            >
                              <strong className="shrink-0">{t.sender === 'user' ? 'Вы:' : `${character.name}:`}</strong>
                              <span className="text-white/90">{t.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
              onContextMenu={(e) => handleMessageContextMenu(e, msg.id)}
              onTouchStart={(e) => handleMessageTouchStart(e, msg.id)}
              onTouchEnd={handleMessageTouchEnd}
              onTouchCancel={handleMessageTouchEnd}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mb-1 ring-1 ring-white/10">
                  <img
                    src={character.avatar}
                    alt={character.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`relative text-sm leading-relaxed transition-all ${
                  isUser
                    ? 'max-w-[min(100%,28rem)] px-4 py-2.5 py-bubble-out'
                    : displayMsg.isVoiceNote || msg.isError
                      ? 'max-w-[min(100%,28rem)] px-4 py-2.5 py-bubble-in'
                      : 'w-full max-w-full px-0 sm:px-1 py-1'
                }`}
              >
                {!isUser && (
                  <div className="text-[11px] font-semibold text-zinc-400 mb-1">
                    {character.name}
                  </div>
                )}

                {displayMsg.isVoiceNote ? (
                  <VoiceNoteBubble
                    audioUrl={displayMsg.audioBlobUrl}
                    duration={displayMsg.audioDuration}
                    isUser={isUser}
                    transcript={displayMsg.transcript}
                    isTranscribing={displayMsg.isTranscribing}
                  />
                ) : msg.isError ? (
                  <div className="flex flex-col gap-2 py-0.5">
                    <div className="flex items-start gap-2 text-rose-300 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                      <span className="leading-relaxed text-zinc-200">{msg.text}</span>
                    </div>
                    {onRetryMessage && (
                      <button
                        onClick={onRetryMessage}
                        className="self-start px-3 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-zinc-100 text-xs font-medium transition-colors flex items-center gap-1.5 border border-zinc-700 hover:border-zinc-500 shadow-xs cursor-pointer mt-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Повторить запрос</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <PersonyMarkdown content={displayMsg.text} isUser={isUser} />
                )}

                {/* Bubble Footer */}
                <div
                  className={`flex items-center justify-end gap-1 text-[10px] mt-1 select-none ${
                    isUser ? 'text-white/70' : isDark ? 'text-zinc-400' : 'text-neutral-400'
                  }`}
                >
                  {msg.isFromVoiceCall && (
                    <span className="opacity-70" title="Из голосового звонка">🎙️</span>
                  )}
                  <span>{formatTime(msg.timestamp)}</span>
                  {isUser && <CheckCheck className="w-3.5 h-3.5 text-white" />}
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Streaming Response Bubble (Gemini 3.7 Flash) */}
        {isStreaming && (
          <div className="flex items-end gap-2 justify-start">
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 mb-1 ring-1 ring-white/10">
              <img
                src={character.avatar}
                alt={character.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative w-full max-w-full px-0 sm:px-1 py-1 text-sm leading-relaxed">
              <div className="text-[11px] font-bold text-zinc-400 mb-1 flex items-center gap-1.5">
                <span>{character.name}</span>
              </div>
              <div className="whitespace-pre-wrap break-words">
                {streamingText ? (
                  <PersonyMarkdown content={streamingText} isUser={false} />
                ) : (
                  <span className="flex items-center gap-1.5 text-zinc-400 text-xs">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-ping" />
                    печатает ответ...
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Bottom Input Bar — transparent strip, thread-width composer */}
      <div
        id="chat-input-bar"
        className="relative z-10 shrink-0 bg-transparent pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
      >
        {showEmojiPicker && (
          <div className="py-chat-thread mb-2">
            <div
              className={`flex items-center gap-2 px-1 py-2 text-lg overflow-x-auto rounded-2xl border ${
                isDark ? 'border-zinc-800/80 bg-zinc-900/40' : 'border-neutral-200 bg-neutral-50/80'
              }`}
            >
              {EMOJI_LIST.map((emo) => (
                <button
                  key={emo}
                  type="button"
                  onClick={() => {
                    setInputText((prev) => prev + emo);
                    setShowEmojiPicker(false);
                  }}
                  className="p-1 hover:scale-125 transition-transform"
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="py-chat-thread">
        <div className="py-composer-row">
          {isRecordingVoice ? (
            <div className="py-composer-recording flex-1">
              <span
                className={`font-mono text-xs tabular-nums shrink-0 ${
                  isDark ? 'text-zinc-400' : 'text-neutral-500'
                }`}
              >
                0:{recordingSeconds.toString().padStart(2, '0')}
              </span>
              <VoiceWaveform live />
              <button
                type="button"
                onClick={() => stopVoiceRecording(true)}
                className={`shrink-0 px-2 py-1 rounded-lg text-xs transition-colors cursor-pointer ${
                  isDark
                    ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/80'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => stopVoiceRecording(false)}
                className={`py-composer-send-btn active:scale-95 transition-all shadow-sm cursor-pointer ${
                  isDark
                    ? 'bg-white hover:bg-zinc-200 text-zinc-900'
                    : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                }`}
                title="Отправить голосовое"
              >
                <ArrowUp className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <>
              <div className="py-composer-input">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение..."
                  className={`flex-1 min-w-0 resize-none bg-transparent text-sm focus:outline-none overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
                    isDark
                      ? 'text-zinc-100 placeholder-zinc-500'
                      : 'text-neutral-900 placeholder-neutral-400'
                  }`}
                  style={{ height: '20px', maxHeight: '160px' }}
                />

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`py-composer-icon-btn transition-colors cursor-pointer ${
                    showEmojiPicker
                      ? isDark
                        ? 'text-zinc-200 bg-zinc-700'
                        : 'text-neutral-900 bg-neutral-200'
                      : isDark
                      ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/80'
                  }`}
                  title="Эмодзи"
                >
                  <Smile className="w-5 h-5" />
                </button>

                {inputText.trim() ? (
                  <button
                    id="send-message-btn"
                    type="button"
                    onClick={handleSend}
                    disabled={isStreaming}
                    className={`py-composer-send-btn active:scale-95 transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                      isDark
                        ? 'bg-white hover:bg-zinc-200 text-zinc-900'
                        : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                    }`}
                    title="Отправить (Enter)"
                  >
                    <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                  </button>
                ) : (
                  <button
                    id="record-voice-note-btn"
                    type="button"
                    onClick={startVoiceRecording}
                    disabled={isStreaming}
                    className={`py-composer-icon-btn transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      isDark
                        ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60'
                        : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/80'
                    }`}
                    title={isStreaming ? 'Ожидание ответа...' : 'Записать аудиосообщение'}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                )}
              </div>

              <button
                id="quick-live-call-btn"
                type="button"
                onClick={() => (isCallingActive ? onExpandCall?.() : onStartCall(character))}
                className={`py-composer-action transition-all cursor-pointer ${
                  isCallingActive
                    ? 'bg-py-accent/15 text-py-accent border border-py-accent/40 hover:bg-py-accent/25'
                    : isDark
                    ? 'bg-py-elevated hover:bg-zinc-700 text-zinc-300 hover:text-white border border-py-border'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-200'
                }`}
                title={isCallingActive ? 'Развернуть звонок' : 'Голосовой звонок'}
              >
                {isCallingActive ? <Maximize2 className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
              </button>
            </>
          )}
        </div>
        </div>
      </div>

      {contextMenu && (() => {
        const targetMessage = messages.find((m) => m.id === contextMenu.messageId);
        if (!targetMessage) return null;

        const items: MessageContextMenuItem[] = [
          {
            id: 'copy-message',
            label: 'Копировать сообщение',
            icon: messageMenuIcons.copy,
            onSelect: () => {
              void handleCopyMessage(targetMessage);
            },
          },
          {
            id: 'copy-dialog',
            label: 'Копировать диалог',
            icon: messageMenuIcons.copyDialog,
            onSelect: () => {
              void handleCopyDialog();
            },
          },
        ];

        if (onDeleteMessage) {
          items.push({
            id: 'delete-message',
            label: 'Удалить сообщение',
            icon: messageMenuIcons.delete,
            destructive: true,
            onSelect: () => onDeleteMessage(targetMessage.id),
          });
        }

        return (
          <MessageContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            items={items}
            onClose={() => setContextMenu(null)}
          />
        );
      })()}

      {copyFeedback && (
        <div
          className="pointer-events-none fixed bottom-24 left-1/2 z-[70] -translate-x-1/2 rounded-full border border-py-border bg-py-elevated/95 px-4 py-2 text-xs text-py-text shadow-lg backdrop-blur-sm"
          role="status"
        >
          {copyFeedback}
        </div>
      )}
    </div>
  );
};
