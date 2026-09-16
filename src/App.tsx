import React, { useState, useEffect, useRef } from 'react';
import { Persona, ChatMessage } from './types';
import { DEFAULT_PERSONAS } from './data/defaultPersonas';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { LiveVoiceCallModal } from './components/LiveVoiceCallModal';
import { CreatePersonaModal } from './components/CreatePersonaModal';
import { PersonaProfileDrawer } from './components/PersonaProfileDrawer';
import { PwaInstallBanner } from './components/PwaInstallBanner';
import { soundFX } from './utils/soundEffects';
import {
  buildCallHistoryMessages,
  isCallSessionAlreadySaved,
} from './utils/callTranscriptPersistence';
import { SseStreamParser } from './lib/sseParser';
import { getApiHeaders } from './lib/api/headers';
import {
  createPersonaOnCloud,
  deletePersonaOnCloud,
  fetchMyPersonas,
  updatePersonaOnCloud,
} from './lib/api/personas';
import {
  ensureDirectConversation,
  fetchConversationMessages,
  sendConversationMessage,
  type CloudMessage,
} from './lib/api/conversations';
import {
  hasLegacyLocalData,
  importLocalDataToCloud,
  remapMessagesByPersona,
  remapPersonaIds,
} from './lib/cloudMigration';
import { AuthMenu } from './components/AuthMenu';
import { ImportLocalDataModal } from './components/ImportLocalDataModal';
import { usePersonyAuth } from './components/PersonyAuthProvider';

const STORAGE_KEY_PERSONAS = 'persony_personas_v1';
const STORAGE_KEY_MESSAGES = 'persony_messages_v1';
const STORAGE_KEY_THEME = 'persony_theme_v1';
const STORAGE_KEY_SOUND = 'persony_sound_v1';

const LEGACY_STORAGE_KEYS: Record<string, string> = {
  personagram_personas_v1: STORAGE_KEY_PERSONAS,
  personagram_messages_v1: STORAGE_KEY_MESSAGES,
  personagram_theme_v1: STORAGE_KEY_THEME,
  personagram_sound_v1: STORAGE_KEY_SOUND,
};

function migrateLegacyStorageKeys() {
  for (const [legacyKey, newKey] of Object.entries(LEGACY_STORAGE_KEYS)) {
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, legacyValue);
    }
    if (legacyValue) {
      localStorage.removeItem(legacyKey);
    }
  }
}

// Format and unwrap model error messages cleanly for the client
function cleanModelError(err: any): string {
  if (!err) return 'Произошла ошибка при обращении к модели.';
  let msg = typeof err === 'string' ? err : err.message || String(err);

  for (let depth = 0; depth < 4; depth++) {
    if (typeof msg === 'string') {
      const trimmed = msg.trim();
      const start = trimmed.indexOf('{');
      const end = trimmed.lastIndexOf('}');
      if (start !== -1 && end !== -1 && end > start) {
        try {
          const parsed = JSON.parse(trimmed.slice(start, end + 1));
          if (parsed.error?.message) {
            msg = parsed.error.message;
            continue;
          }
          if (parsed.message) {
            msg = parsed.message;
            continue;
          }
        } catch {
          // not valid json
        }
      }
    }
    break;
  }

  const lower = String(msg).toLowerCase();
  if (lower.includes('503') || lower.includes('high demand') || lower.includes('unavailable') || lower.includes('service unavailable')) {
    return 'Модель временно перегружена запросами. Нажмите «Повторить запрос» через пару секунд.';
  }
  if (lower.includes('quota') || lower.includes('429') || lower.includes('rate limit')) {
    return 'Превышен лимит запросов. Подождите немного и повторите отправку.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Ошибка связи с сервером. Проверьте интернет-соединение.';
  }

  // Strip raw JSON artifacts if any remain
  if (msg.includes('{"error":') || msg.includes('"code":')) {
    return 'Сервис временно недоступен из-за высокой нагрузки. Повторите попытку.';
  }

  return msg.length > 250 ? msg.slice(0, 250) + '...' : msg;
}

function cloudMessageToChat(message: CloudMessage, personaId: string): ChatMessage {
  return {
    id: message.id,
    characterId: personaId,
    sender: message.senderType === 'user' ? 'user' : 'character',
    text: message.text,
    timestamp: new Date(message.createdAt).getTime(),
    status: 'sent',
  };
}

export default function App() {
  migrateLegacyStorageKeys();
  const { isLoaded: isAuthLoaded, isSignedIn, clerkEnabled, authRequired } = usePersonyAuth();

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem(STORAGE_KEY_THEME) as 'dark' | 'light') || 'dark';
  });

  // Sound FX state
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_SOUND);
    return saved !== null ? saved === 'true' : true;
  });

  // Personas state
  const [personas, setPersonas] = useState<Persona[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PERSONAS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge defaults with saved custom ones
          const customOnly = parsed.filter((p) => p.isCustom);
          return [...DEFAULT_PERSONAS, ...customOnly];
        }
      }
    } catch {
      // ignore
    }
    return DEFAULT_PERSONAS;
  });

  const [selectedPersona, setSelectedPersona] = useState<Persona>(() => personas[0] || DEFAULT_PERSONAS[0]);

  // Messages per persona
  const [messagesByPersona, setMessagesByPersona] = useState<Record<string, ChatMessage[]>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MESSAGES);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  });

  // Text Chat Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');

  // Modals & Panels
  const [isCallOpen, setIsCallOpen] = useState(false);
  const [callingPersona, setCallingPersona] = useState<Persona>(selectedPersona);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);
  const [profilePersona, setProfilePersona] = useState<Persona | null>(null);

  // Mobile layout state: 'list' (sidebar) or 'chat'
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  // Collapsible sidebar state (ChatGPT-style)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [conversationIds, setConversationIds] = useState<Record<string, string>>({});
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cloudPersonasLoaded, setCloudPersonasLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || cloudPersonasLoaded) return;

    void (async () => {
      const cloudPersonas = await fetchMyPersonas();
      if (cloudPersonas.length > 0) {
        setPersonas((prev) => {
          const builtins = prev.filter((p) => !p.isCustom);
          return [...builtins, ...cloudPersonas];
        });
      }
      setCloudPersonasLoaded(true);
      if (hasLegacyLocalData()) {
        setIsImportModalOpen(true);
      }
    })();
  }, [isAuthLoaded, isSignedIn, cloudPersonasLoaded]);

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || !selectedPersona) return;

    void (async () => {
      const existingId = conversationIds[selectedPersona.id];
      const conversation =
        existingId
          ? { id: existingId }
          : await ensureDirectConversation(selectedPersona.id);

      if (!conversation?.id) return;

      setConversationIds((prev) =>
        prev[selectedPersona.id] === conversation.id
          ? prev
          : { ...prev, [selectedPersona.id]: conversation.id }
      );

      const cloudMessages = await fetchConversationMessages(conversation.id);
      if (cloudMessages.length === 0) return;

      setMessagesByPersona((prev) => ({
        ...prev,
        [selectedPersona.id]: cloudMessages.map((m) =>
          cloudMessageToChat(m, selectedPersona.id)
        ),
      }));
    })();
  }, [isAuthLoaded, isSignedIn, selectedPersona.id]);

  // Sync theme to root class
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_THEME, theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [theme]);

  // Sync sound settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SOUND, String(soundEnabled));
    soundFX.enabled = soundEnabled;
  }, [soundEnabled]);

  // Save custom personas to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_PERSONAS, JSON.stringify(personas));
    } catch (e) {
      console.warn('Failed to save personas:', e);
    }
  }, [personas]);

  // Save messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MESSAGES, JSON.stringify(messagesByPersona));
    } catch (e) {
      console.warn('Failed to save messages:', e);
    }
  }, [messagesByPersona]);

  // Register PWA service worker
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.log('SW registration note:', err);
      });
    }
  }, []);

  // Compute last message for each persona
  const lastMessages: Record<string, ChatMessage | undefined> = {};
  for (const p of personas) {
    const list = messagesByPersona[p.id];
    if (list && list.length > 0) {
      lastMessages[p.id] = list[list.length - 1];
    }
  }

  // Handle sending a text message or voice note to Gemini with automatic speech transcription
  const handleSendMessage = async (
    text: string,
    isVoiceNote = false,
    audioBlobUrl?: string,
    audioDuration?: number,
    audioBase64?: string,
    initialTranscript?: string
  ) => {
    if ((!text.trim() && !audioBase64) || isStreaming) return;

    if (!isAuthLoaded) return;

    if (authRequired && !isSignedIn) {
      const errMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        characterId: selectedPersona.id,
        sender: 'character',
        text: clerkEnabled
          ? 'Войдите в аккаунт, чтобы отправлять сообщения.'
          : 'Сервис авторизации не настроен. Обратитесь к администратору.',
        timestamp: Date.now(),
        isError: true,
      };
      setMessagesByPersona((prev) => ({
        ...prev,
        [selectedPersona.id]: [...(prev[selectedPersona.id] || []), errMessage],
      }));
      return;
    }

    const msgId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const userMessage: ChatMessage = {
      id: msgId,
      characterId: selectedPersona.id,
      sender: 'user',
      text: isVoiceNote
        ? initialTranscript
          ? `🎤 "${initialTranscript}"`
          : '🎤 Голосовое сообщение'
        : text.trim(),
      timestamp: Date.now(),
      status: 'sent',
      isVoiceNote,
      audioBlobUrl,
      audioDuration,
      isTranscribing: isVoiceNote && !initialTranscript && !!audioBase64,
      transcript: initialTranscript || '',
    };

    const currentHistory = messagesByPersona[selectedPersona.id] || [];
    const updatedHistory = [...currentHistory, userMessage];

    setMessagesByPersona((prev) => ({
      ...prev,
      [selectedPersona.id]: updatedHistory,
    }));

    setIsStreaming(true);
    setStreamingText('');

    try {
      let transcriptText = initialTranscript || '';

      // If this is a voice message with audio data, transcribe it with Gemini
      if (isVoiceNote && audioBase64) {
        try {
          const transRes = await fetch('/api/transcribe', {
            method: 'POST',
            headers: await getApiHeaders(),
            body: JSON.stringify({
              audioBase64,
              mimeType: 'audio/wav',
            }),
          });
          if (transRes.ok) {
            const transData = (await transRes.json()) as { transcript?: string };
            if (transData.transcript && transData.transcript.trim()) {
              transcriptText = transData.transcript.trim();
            }
          }
        } catch (transErr) {
          console.error('Failed to transcribe voice note with Gemini:', transErr);
        }

        // Update the voice note message with its verbatim transcript
        setMessagesByPersona((prev) => {
          const charMessages = prev[selectedPersona.id] || [];
          return {
            ...prev,
            [selectedPersona.id]: charMessages.map((m) =>
              m.id === msgId
                ? {
                    ...m,
                    isTranscribing: false,
                    transcript: transcriptText,
                    text: transcriptText ? `🎤 "${transcriptText}"` : m.text,
                  }
                : m
            ),
          };
        });
      }

      const outboundText =
        isVoiceNote
          ? transcriptText
            ? `[Пользователь отправил голосовое аудиосообщение]: "${transcriptText}". Ответь на слова пользователя развернуто и естественно в твоем характерном стиле персонажа.`
            : `[Пользователь отправил голосовое аудиосообщение длительностью ${audioDuration || 3} сек, но в записи была тишина или слова не распознаны]. Обрати на это внимание собеседника в стиле своего персонажа.`
          : text.trim();

      let conversationId = conversationIds[selectedPersona.id];
      if (!conversationId) {
        const conversation = await ensureDirectConversation(selectedPersona.id);
        if (!conversation?.id) {
          if (authRequired && !isSignedIn) {
            throw new Error('Войдите в аккаунт, чтобы отправлять сообщения.');
          }
          throw new Error('Не удалось открыть облачный диалог. Проверьте вход в аккаунт.');
        }
        conversationId = conversation.id;
        setConversationIds((prev) => ({ ...prev, [selectedPersona.id]: conversationId }));
      }

      const response = await sendConversationMessage(conversationId, outboundText, msgId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No readable stream returned');

      const decoder = new TextDecoder('utf-8');
      const sseParser = new SseStreamParser();
      let accumulated = '';
      let hasChimed = false;
      let errorReceived = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const event of sseParser.push(chunk)) {
          try {
            const data = JSON.parse(event.data);
            if (data.text) {
              if (!hasChimed) {
                soundFX.playReceive();
                hasChimed = true;
              }
              accumulated += data.text;
              setStreamingText(accumulated);
            }
            if (data.error) {
              console.error('Chat stream error:', data.error);
              errorReceived = cleanModelError(data.error);
            }
          } catch {
            // malformed event payload — skip
          }
        }
      }

      // Commit finalized message or clean error card
      if (accumulated.trim()) {
        const charMessage: ChatMessage = {
          id: `char_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          characterId: selectedPersona.id,
          sender: 'character',
          text: accumulated.trim(),
          timestamp: Date.now(),
          status: 'sent',
        };

        setMessagesByPersona((prev) => ({
          ...prev,
          [selectedPersona.id]: [...(prev[selectedPersona.id] || []), charMessage],
        }));
      } else if (errorReceived) {
        const errMessage: ChatMessage = {
          id: `err_${Date.now()}`,
          characterId: selectedPersona.id,
          sender: 'character',
          text: errorReceived,
          timestamp: Date.now(),
          isError: true,
        };
        setMessagesByPersona((prev) => ({
          ...prev,
          [selectedPersona.id]: [...(prev[selectedPersona.id] || []), errMessage],
        }));
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      const cleanErr = cleanModelError(err);
      const errMessage: ChatMessage = {
        id: `err_${Date.now()}`,
        characterId: selectedPersona.id,
        sender: 'character',
        text: cleanErr,
        timestamp: Date.now(),
        isError: true,
      };
      setMessagesByPersona((prev) => ({
        ...prev,
        [selectedPersona.id]: [...(prev[selectedPersona.id] || []), errMessage],
      }));
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

  // Re-submit the last user message when an error occurred
  const handleRetryLastMessage = () => {
    const chatMsgs = messagesByPersona[selectedPersona.id] || [];
    const lastUserMsg = [...chatMsgs].reverse().find((m) => m.sender === 'user');
    if (lastUserMsg) {
      // Remove any trailing error message from the chat history
      setMessagesByPersona((prev) => ({
        ...prev,
        [selectedPersona.id]: (prev[selectedPersona.id] || []).filter((m) => !m.isError),
      }));
      // Resend prompt to the resilient model cascade
      if (lastUserMsg.isVoiceNote) {
        handleSendMessage(
          lastUserMsg.text,
          true,
          lastUserMsg.audioBlobUrl,
          lastUserMsg.audioDuration,
          undefined,
          lastUserMsg.transcript
        );
      } else {
        handleSendMessage(lastUserMsg.text);
      }
    }
  };

  // Launch Gemini 3.1 Flash Live Realtime Voice Call
  const handleStartCall = (persona: Persona) => {
    setCallingPersona(persona);
    setIsCallOpen(true);
  };

  const handleSelectPersona = (persona: Persona) => {
    setSelectedPersona(persona);
    setMobileView('chat');
  };

  const handleSavePersona = async (newPersona: Persona) => {
    let saved: Persona = { ...newPersona, isCustom: true };

    if (isSignedIn) {
      if (editingPersona?.isCustom && editingPersona.id) {
        const updated = await updatePersonaOnCloud(saved);
        if (updated) saved = { ...updated, isCustom: true };
      } else {
        const created = await createPersonaOnCloud(saved);
        if (created) saved = { ...created, isCustom: true };
      }
    }

    setPersonas((prev) => {
      const idx = prev.findIndex((p) => p.id === saved.id);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    setSelectedPersona(saved);
    setMobileView('chat');
  };

  const handleDeletePersona = (id: string) => {
    if (isSignedIn) {
      void deletePersonaOnCloud(id);
    }
    setPersonas((prev) => prev.filter((p) => p.id !== id));
    if (selectedPersona.id === id) {
      setSelectedPersona(DEFAULT_PERSONAS[0]);
    }
  };

  const handleImportLocalData = async () => {
    const result = await importLocalDataToCloud(personas, messagesByPersona);
    if (!result) throw new Error('Import failed');

    const remappedPersonas = remapPersonaIds(personas, result.personaIdMap);
    const remappedMessages = remapMessagesByPersona(messagesByPersona, result.personaIdMap);

    setPersonas((prev) => {
      const builtins = prev.filter((p) => !p.isCustom);
      const custom = remappedPersonas.filter((p) => p.isCustom);
      return [...builtins, ...custom];
    });
    setMessagesByPersona(remappedMessages);
    setConversationIds({});
    setCloudPersonasLoaded(false);
  };

  const handleClearChat = (characterId: string) => {
    setMessagesByPersona((prev) => ({
      ...prev,
      [characterId]: [],
    }));
  };

  const handleResetDefaults = () => {
    setPersonas(DEFAULT_PERSONAS);
    setSelectedPersona(DEFAULT_PERSONAS[0]);
    localStorage.removeItem(STORAGE_KEY_PERSONAS);
  };

  const activeMessages = messagesByPersona[selectedPersona.id] || [];

  return (
    <div
      id="app-root"
      className="fixed inset-0 flex flex-col overflow-hidden font-sans transition-colors bg-py-app text-py-text py-safe-top"
    >
      {/* PWA Install Banner */}
      <PwaInstallBanner />

      {/* Main Container */}
      <div className="flex-1 flex w-full h-full overflow-hidden relative">
        {/* Left Sidebar: Collapsible ChatGPT style */}
        <div
          className={`h-full transition-all duration-200 shrink-0 border-r border-py-border ${
            !isSidebarOpen
              ? 'hidden'
              : mobileView === 'chat'
              ? 'hidden sm:flex sm:w-[300px] md:w-[320px] lg:w-[360px]'
              : 'flex w-full sm:w-[300px] md:w-[320px] lg:w-[360px]'
          }`}
        >
          <Sidebar
            personas={personas}
            selectedPersona={selectedPersona}
            onSelectPersona={handleSelectPersona}
            onOpenCreateModal={() => {
              setEditingPersona(null);
              setIsCreateModalOpen(true);
            }}
            onStartCall={handleStartCall}
            lastMessages={lastMessages}
            theme={theme}
            onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            soundEnabled={soundEnabled}
            onToggleSound={() => setSoundEnabled(!soundEnabled)}
            onResetDefaults={handleResetDefaults}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            authMenu={<AuthMenu />}
          />
        </div>

        {/* Right Chat Area */}
        <div
          className={`w-full flex-1 h-full flex flex-col min-w-0 transition-transform duration-200 ${
            mobileView === 'list' ? 'hidden sm:flex' : 'flex'
          }`}
        >
          <ChatArea
            character={selectedPersona}
            messages={activeMessages}
            isStreaming={isStreaming}
            streamingText={streamingText}
            onSendMessage={handleSendMessage}
            onStartCall={handleStartCall}
            onOpenProfile={(char) => {
              setProfilePersona(char);
              setIsProfileDrawerOpen(true);
            }}
            onBackToList={() => setMobileView('list')}
            theme={theme}
            isCallingActive={isCallOpen && callingPersona.id === selectedPersona.id}
            onExpandCall={() => setIsCallOpen(true)}
            onEndActiveCall={() => setIsCallOpen(false)}
            isSidebarOpen={isSidebarOpen}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            onRetryMessage={handleRetryLastMessage}
          />
        </div>
      </div>

      {/* Live Voice Call Modal (Gemini 3.1 Flash Live) */}
      <LiveVoiceCallModal
        character={callingPersona}
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        recentMessages={messagesByPersona[callingPersona.id] || []}
        onEndCallSummary={(durationSecs, transcripts, sessionId) => {
          if (!sessionId || (durationSecs <= 0 && transcripts.length === 0)) return;

          setMessagesByPersona((prev) => {
            const existing = prev[callingPersona.id] || [];
            if (isCallSessionAlreadySaved(existing, sessionId)) return prev;

            const callMessages = buildCallHistoryMessages(
              callingPersona.id,
              sessionId,
              durationSecs,
              transcripts
            );
            if (callMessages.length === 0) return prev;

            return {
              ...prev,
              [callingPersona.id]: [...existing, ...callMessages],
            };
          });
        }}
      />

      {/* Create / Edit Persona Modal */}
      <CreatePersonaModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPersona(null);
        }}
        onSave={handleSavePersona}
        initialPersona={editingPersona}
      />

      <ImportLocalDataModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onConfirm={handleImportLocalData}
      />

      {/* Persona Profile & Dossier Drawer */}
      <PersonaProfileDrawer
        character={profilePersona}
        isOpen={isProfileDrawerOpen}
        onClose={() => setIsProfileDrawerOpen(false)}
        onCall={handleStartCall}
        onEdit={(char) => {
          setIsProfileDrawerOpen(false);
          setEditingPersona(char);
          setIsCreateModalOpen(true);
        }}
        onDelete={handleDeletePersona}
        onClearChat={handleClearChat}
      />
    </div>
  );
}
