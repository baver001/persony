import React, { useState, useRef, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  Send,
  ArrowUp,
  Mic,
  MoreVertical,
  ArrowLeft,
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
  Paperclip,
  Search,
  Pin,
  X,
  PanelLeftOpen,
  PanelLeftClose,
  PanelLeft,
  AlertCircle,
} from 'lucide-react';
import { Persona, ChatMessage } from '../types';
import { soundFX } from '../utils/soundEffects';
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
          <div className="flex items-center gap-0.5 h-6">
            {[4, 8, 14, 8, 16, 12, 6, 14, 18, 10, 8, 14, 6, 12, 16, 8, 10, 14, 8, 6].map((h, i) => (
              <span
                key={i}
                className={`w-1 rounded-full transition-all ${
                  isPlaying
                    ? 'bg-emerald-400 animate-pulse'
                    : isUser
                    ? 'bg-white/75'
                    : 'bg-white/40 dark:bg-white/40 bg-neutral-400'
                }`}
                style={{ height: `${isPlaying ? ((i % 5) + 2) * 3.5 : h}px` }}
              />
            ))}
          </div>
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
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
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
  const [showPinnedMessage, setShowPinnedMessage] = useState(true);

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
    const minH = 24;
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
      textareaRef.current.style.height = '24px';
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
          {/* Back button visible ONLY on small mobile screens (<640px) */}
          {onBackToList && (
            <button
              onClick={onBackToList}
              className="sm:hidden py-touch-target px-1.5 -ml-0.5 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors shrink-0"
              title="Назад к списку"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* ChatGPT-style sidebar expand button on desktop when sidebar is collapsed */}
          {!isSidebarOpen && onToggleSidebar && (
            <button
              id="chat-open-sidebar-btn"
              onClick={onToggleSidebar}
              className={`hidden sm:inline-flex py-touch-target p-2 -ml-1 rounded-lg transition-colors ${
                isDark
                  ? 'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100'
                  : 'hover:bg-neutral-100 text-neutral-600 hover:text-neutral-900'
              }`}
              title="Развернуть боковую панель"
            >
              <PanelLeftOpen className="w-5 h-5" />
            </button>
          )}

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
            className={`hidden sm:inline-flex py-touch-target p-2 rounded-full transition-colors ${
              isSearchOpen
                ? isDark ? 'bg-zinc-700 text-white' : 'bg-neutral-800 text-white'
                : isDark
                ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white'
                : 'hover:bg-neutral-100 text-neutral-600'
            }`}
            title="Поиск в чате"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Live Voice Call Button */}
          <button
            id="chat-call-btn"
            onClick={() => (isCallingActive ? onExpandCall?.() : onStartCall(character))}
            className={`py-touch-target gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-full active:scale-95 text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              isCallingActive
                ? 'bg-py-accent/15 text-py-accent border border-py-accent/40 hover:bg-py-accent/25'
                : isDark
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 hover:border-zinc-600'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white'
            }`}
            title={isCallingActive ? 'Развернуть звонок' : 'Позвонить голосом'}
          >
            {isCallingActive ? <Maximize2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> : <Phone className="w-4 h-4 sm:w-3.5 sm:h-3.5" />}
            <span className="hidden md:inline">{isCallingActive ? 'В звонке' : 'Звонок'}</span>
          </button>

          {/* Profile Details Button — desktop only (tap avatar on mobile) */}
          <button
            id="chat-profile-btn"
            onClick={() => onOpenProfile(character)}
            className={`hidden sm:inline-flex py-touch-target p-2 rounded-full transition-colors ${
              isDark ? 'hover:bg-zinc-800 text-zinc-400 hover:text-white' : 'hover:bg-neutral-100 text-neutral-600'
            }`}
            title="Информация о персонаже"
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

      {/* Pinned Message Bar — скрываем во время активного звонка */}
      {showPinnedMessage && !isCallingActive && (
        <div
          className={`px-4 py-2 border-b flex items-center justify-between text-xs cursor-pointer transition-colors ${
            isDark
              ? 'bg-zinc-800/80 hover:bg-zinc-800 border-zinc-700/80 text-zinc-200'
              : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800 shadow-xs'
          }`}
          onClick={() => onStartCall(character)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-1 h-7 rounded-full shrink-0 ${isDark ? 'bg-zinc-400' : 'bg-neutral-800'}`} />
            <div className="min-w-0">
              <span className={`font-bold text-[11px] block leading-tight ${isDark ? 'text-zinc-300' : 'text-neutral-800'}`}>
                Закреплённое сообщение
              </span>
              <span className={`truncate block text-[11px] leading-tight mt-0.5 ${
                isDark ? 'text-zinc-400' : 'text-neutral-600'
              }`}>
                Прямой голосовой звонок. Нажмите «Звонок» вверху для разговора.
              </span>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowPinnedMessage(false);
            }}
            className={`p-1.5 rounded-lg transition-colors ml-2 shrink-0 ${
              isDark ? 'hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200' : 'hover:bg-neutral-200 text-neutral-400 hover:text-neutral-700'
            }`}
            title="Скрыть"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Messages Stream */}
      <div
        id="messages-scroll-container"
        ref={scrollContainerRef}
        onScroll={handleMessagesScroll}
        className={`flex-1 overflow-y-auto p-3 sm:p-6 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10 min-h-0 ${
          isCallingActive ? 'py-call-pill-offset' : ''
        }`}
      >
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
          <div className="max-w-md mx-auto my-6 text-center space-y-4">
            <div
              className={`w-20 h-20 rounded-full mx-auto overflow-hidden shadow-md ${
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
            <div>
              <h3 className="text-base font-bold text-py-text">{character.name}</h3>
              <p className="text-xs text-py-text-secondary mt-1 max-w-sm mx-auto leading-relaxed">
                {character.description}
              </p>
            </div>

            {isCallingActive ? (
              <div className="p-4 rounded-2xl bg-py-elevated border border-py-accent/30 text-left shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full bg-py-accent animate-pulse" />
                  <span className="text-xs font-bold text-py-text">Идёт голосовой звонок</span>
                </div>
                <p className="text-[11px] text-py-text-secondary leading-relaxed">
                  Говорите в микрофон — разговор сохранится в истории чата после завершения.
                </p>
                <button
                  onClick={() => onExpandCall?.()}
                  className="mt-3 w-full px-3 py-2 rounded-xl bg-py-accent/15 hover:bg-py-accent/25 text-py-accent text-xs font-semibold flex items-center justify-center gap-1.5 border border-py-accent/30 cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" /> Развернуть звонок
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-py-elevated border border-py-border flex items-center justify-between text-left shadow-sm">
                <div>
                  <span className="text-xs font-bold text-py-text block">Прямой голосовой вызов</span>
                  <span className="text-[11px] text-py-text-secondary">Общайтесь голосом в реальном времени</span>
                </div>
                <button
                  onClick={() => onStartCall(character)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-white'
                  }`}
                >
                  <Phone className="w-3.5 h-3.5" /> Позвонить
                </button>
              </div>
            )}

            {/* Quick Starters Chips */}
            {!isCallingActive && character.starterMessages && character.starterMessages.length > 0 && (
              <div className="pt-2 space-y-2">
                <span className="text-[11px] font-semibold text-py-text-muted uppercase tracking-wider flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3" /> Начните разговор
                </span>
                <div className="flex flex-col gap-2">
                  {character.starterMessages.map((msg, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSendMessage(msg)}
                      className={`px-3.5 py-2.5 rounded-2xl text-xs text-left transition-all flex items-center justify-between group cursor-pointer ${
                        isDark
                          ? 'bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 hover:border-zinc-500 text-zinc-200'
                          : 'bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-800'
                      }`}
                    >
                      <span>{msg}</span>
                      <Send className="w-3.5 h-3.5 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
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
                <div className={`rounded-2xl p-3 shadow-md w-full max-w-[min(90vw,20rem)] sm:max-w-sm border ${
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
                className={`relative max-w-[85%] sm:max-w-md md:max-w-lg px-4 py-2.5 text-sm leading-relaxed transition-all ${
                  isUser ? 'py-bubble-out' : 'py-bubble-in'
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
            <div
              className="relative max-w-[85%] sm:max-w-md md:max-w-lg px-4 py-2.5 text-sm leading-relaxed py-bubble-in"
            >
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

      {/* Quick Emoji Reaction Bar (Toggleable) */}
      {showEmojiPicker && (
        <div
          className={`flex items-center gap-2 px-4 py-2 border-t text-lg overflow-x-auto ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-neutral-100 border-neutral-200'
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
      )}

      {/* Bottom Input Bar */}
      <div
        id="chat-input-bar"
        className={`relative z-10 px-3 sm:px-4 py-composer-bar border-t transition-all ${
          isDark
            ? 'bg-[#18181b] border-zinc-800'
            : 'bg-white border-neutral-200'
        }`}
      >
        <div className="flex items-center gap-2 w-full">
          {isRecordingVoice ? (
            <div className="flex-1 flex items-center justify-between bg-rose-500/15 border border-rose-500/30 rounded-[22px] px-4 py-2 text-xs text-rose-400 min-h-[44px]">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-mono font-bold text-sm">
                  0:{recordingSeconds.toString().padStart(2, '0')}
                </span>
                <span className="hidden sm:inline text-white/70 text-xs">Запись аудиосообщения...</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => stopVoiceRecording(true)}
                  className="px-2.5 py-1 rounded-lg hover:bg-rose-500/20 text-white/70 hover:text-white transition-colors cursor-pointer text-xs"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={() => stopVoiceRecording(false)}
                  className="w-8 h-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-sm flex items-center justify-center cursor-pointer transition-all active:scale-95"
                  title="Отправить голосовое"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div
                className={`flex-1 flex items-center min-h-[44px] rounded-[22px] px-1.5 sm:px-2 py-1 transition-all border min-w-0 gap-0.5 ${
                  isDark
                    ? 'bg-zinc-800/90 border-zinc-700/80 focus-within:border-zinc-500'
                    : 'bg-[#f4f4f5] border-transparent focus-within:border-neutral-400'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (character.starterMessages && character.starterMessages[0]) {
                      setInputText(character.starterMessages[0]);
                    }
                  }}
                  className={`p-2 rounded-full transition-colors shrink-0 cursor-pointer ${
                    isDark
                      ? 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60'
                      : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/80'
                  }`}
                  title="Прикрепить (Подставить тему)"
                >
                  <Paperclip className="w-5 h-5" />
                </button>

                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Сообщение..."
                  className={`flex-1 min-w-0 resize-none bg-transparent text-sm leading-relaxed focus:outline-none overflow-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-1 py-1.5 ${
                    isDark
                      ? 'text-zinc-100 placeholder-zinc-500'
                      : 'text-neutral-900 placeholder-neutral-400'
                  }`}
                  style={{ height: '24px', maxHeight: '160px' }}
                />

                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`p-2 rounded-full transition-colors shrink-0 cursor-pointer ${
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
                    className={`w-9 h-9 rounded-full active:scale-95 transition-all shadow-sm flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50 ${
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
                    className={`p-2 rounded-full transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
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
                className={`w-11 h-11 rounded-full transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                  isCallingActive
                    ? 'bg-py-accent/15 text-py-accent border border-py-accent/40 hover:bg-py-accent/25'
                    : isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700'
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
