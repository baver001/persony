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
import { getClerkToken } from './lib/api/auth';
import {
  createPersonaOnCloud,
  deletePersonaOnCloud,
  fetchMyPersonas,
  updatePersonaOnCloud,
} from './lib/api/personas';
import {
  deleteConversation,
  ensureDirectConversation,
  fetchConversationMessages,
  sendConversationMessage,
} from './lib/api/conversations';
import {
  buildVoiceNoteDisplayText,
  buildVoiceNoteModelText,
  cloudMessageToChat,
} from './utils/chatMessageDisplay';
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
const MESSAGE_PAGE_SIZE = 50;

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
  if (lower.includes('524') || lower.includes('timeout') || lower.includes('timed out')) {
    return 'Сервер не успел ответить вовремя. Повторите запрос — обычно со второй попытки срабатывает.';
  }

  // Strip raw JSON artifacts if any remain
  if (msg.includes('{"error":') || msg.includes('"code":')) {
    return 'Сервис временно недоступен из-за высокой нагрузки. Повторите попытку.';
  }

  return msg.length > 250 ? msg.slice(0, 250) + '...' : msg;
}

async function consumeChatStream(
  response: Response,
  onText: (text: string) => void
): Promise<{ text: string; error?: string; personaMessageId?: string }> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream returned');

  const decoder = new TextDecoder('utf-8');
  const sseParser = new SseStreamParser();
  let accumulated = '';
  let errorReceived = '';
  let personaMessageId: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    for (const event of sseParser.push(chunk)) {
      try {
        const data = JSON.parse(event.data) as {
          text?: string;
          error?: string;
          done?: boolean;
          personaMessageId?: string;
        };
        if (data.text) {
          accumulated += data.text;
          onText(accumulated);
        }
        if (data.error) {
          errorReceived = cleanModelError(data.error);
        }
        if (data.done && data.personaMessageId) {
          personaMessageId = data.personaMessageId;
        }
      } catch {
        // malformed event payload — skip
      }
    }
  }

  return {
    text: accumulated.trim(),
    error: errorReceived || undefined,
    personaMessageId,
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
  const [hasOlderMessages, setHasOlderMessages] = useState<Record<string, boolean>>({});
  const [isLoadingOlderMessages, setIsLoadingOlderMessages] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [cloudPersonasLoaded, setCloudPersonasLoaded] = useState(false);

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || !clerkEnabled || cloudPersonasLoaded) return;

    void (async () => {
      const token = await getClerkToken();
      if (!token) return;

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
  }, [isAuthLoaded, isSignedIn, clerkEnabled, cloudPersonasLoaded]);

  useEffect(() => {
    if (!isAuthLoaded || !isSignedIn || !clerkEnabled || !selectedPersona) return;

    void (async () => {
      const token = await getClerkToken();
      if (!token) return;

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

      const cloudMessages = await fetchConversationMessages(conversation.id, {
        limit: MESSAGE_PAGE_SIZE,
      });

      setHasOlderMessages((prev) => ({
        ...prev,
        [selectedPersona.id]: cloudMessages.length >= MESSAGE_PAGE_SIZE,
      }));

      if (cloudMessages.length === 0) return;

      setMessagesByPersona((prev) => ({
        ...prev,
        [selectedPersona.id]: cloudMessages.map((m) =>
          cloudMessageToChat(m, selectedPersona.id)
        ),
      }));
    })();
  }, [isAuthLoaded, isSignedIn, clerkEnabled, selectedPersona.id]);

  const handleLoadOlderMessages = async () => {
    const personaId = selectedPersona.id;
    const conversationId = conversationIds[personaId];
    const currentMessages = messagesByPersona[personaId] || [];
    if (!conversationId || !hasOlderMessages[personaId] || isLoadingOlderMessages) return;
    const oldest = currentMessages[0];
    if (!oldest?.id) return;

    setIsLoadingOlderMessages(true);
    try {
      const older = await fetchConversationMessages(conversationId, {
        before: oldest.id,
        limit: MESSAGE_PAGE_SIZE,
      });
      if (older.length === 0) {
        setHasOlderMessages((prev) => ({ ...prev, [personaId]: false }));
        return;
      }

      const mapped = older.map((m) => cloudMessageToChat(m, personaId));
      const existingIds = new Set(currentMessages.map((m) => m.id));
      const deduped = mapped.filter((m) => !existingIds.has(m.id));

      setMessagesByPersona((prev) => ({
        ...prev,
        [personaId]: [...deduped, ...currentMessages],
      }));

      if (older.length < MESSAGE_PAGE_SIZE) {
        setHasOlderMessages((prev) => ({ ...prev, [personaId]: false }));
      }
    } finally {
      setIsLoadingOlderMessages(false);
    }
  };

  const handleDeleteMessage = (messageId: string) => {
    setMessagesByPersona((prev) => ({
      ...prev,
      [selectedPersona.id]: (prev[selectedPersona.id] || []).filter((m) => m.id !== messageId),
    }));
  };

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

  const appendInferenceError = (personaId: string, message: string) => {
    const errMessage: ChatMessage = {
      id: `err_${Date.now()}`,
      characterId: personaId,
      sender: 'character',
      text: message,
      timestamp: Date.now(),
      isError: true,
    };
    setMessagesByPersona((prev) => ({
      ...prev,
      [personaId]: [...(prev[personaId] || []), errMessage],
    }));
  };

  const runChatInference = async (
    personaId: string,
    clientRequestId: string,
    displayText: string,
    modelText?: string
  ) => {
    setIsStreaming(true);
    setStreamingText('');

    try {
      let conversationId = conversationIds[personaId];
      const conversation = conversationId
        ? { id: conversationId }
        : await ensureDirectConversation(personaId);

      if (!conversation?.id) {
        throw new Error('Не удалось открыть облачный диалог. Проверьте вход в аккаунт.');
      }

      conversationId = conversation.id;
      if (conversationIds[personaId] !== conversationId) {
        setConversationIds((prev) => ({ ...prev, [personaId]: conversationId }));
      }

      const response = await sendConversationMessage(
        conversationId,
        displayText,
        clientRequestId,
        modelText
      );

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      let hasChimed = false;
      const result = await consumeChatStream(response, (streamText) => {
        if (!hasChimed && streamText) {
          soundFX.playReceive();
          hasChimed = true;
        }
        setStreamingText(streamText);
      });

      setMessagesByPersona((prev) => ({
        ...prev,
        [personaId]: (prev[personaId] || []).filter((m) => !m.isError),
      }));

      if (result.text) {
        const charMessage: ChatMessage = {
          id: result.personaMessageId || `char_${Date.now()}`,
          characterId: personaId,
          sender: 'character',
          text: result.text,
          timestamp: Date.now(),
          status: 'sent',
        };
        setMessagesByPersona((prev) => ({
          ...prev,
          [personaId]: [...(prev[personaId] || []), charMessage],
        }));
      } else if (result.error) {
        appendInferenceError(personaId, result.error);
      }
    } catch (err: unknown) {
      console.error('Failed to run chat inference:', err);
      appendInferenceError(personaId, cleanModelError(err));
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  };

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
      appendInferenceError(
        selectedPersona.id,
        clerkEnabled
          ? 'Войдите в аккаунт, чтобы отправлять сообщения.'
          : 'Сервис авторизации не настроен. Обратитесь к администратору.'
      );
      return;
    }

    const clientRequestId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const userMessage: ChatMessage = {
      id: clientRequestId,
      clientRequestId,
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

    setMessagesByPersona((prev) => ({
      ...prev,
      [selectedPersona.id]: [...(prev[selectedPersona.id] || []), userMessage],
    }));

    try {
      let transcriptText = initialTranscript || '';

      const transcribePromise =
        isVoiceNote && audioBase64
          ? fetch('/api/transcribe', {
              method: 'POST',
              headers: await getApiHeaders(),
              body: JSON.stringify({
                audioBase64,
                mimeType: 'audio/wav',
              }),
            })
              .then(async (transRes) => {
                if (!transRes.ok) return '';
                const transData = (await transRes.json()) as { transcript?: string };
                return transData.transcript?.trim() || '';
              })
              .catch((transErr) => {
                console.error('Failed to transcribe voice note with Gemini:', transErr);
                return '';
              })
          : Promise.resolve('');

      const transcribed = await transcribePromise;
      if (transcribed) transcriptText = transcribed;

      if (isVoiceNote) {
        setMessagesByPersona((prev) => ({
          ...prev,
          [selectedPersona.id]: (prev[selectedPersona.id] || []).map((m) =>
            m.clientRequestId === clientRequestId
              ? {
                  ...m,
                  isTranscribing: false,
                  transcript: transcriptText,
                  text: transcriptText
                    ? buildVoiceNoteDisplayText(transcriptText)
                    : m.text,
                }
              : m
          ),
        }));
      }

      const displayText = isVoiceNote
        ? transcriptText
          ? buildVoiceNoteDisplayText(transcriptText)
          : '🎤 Голосовое сообщение'
        : text.trim();

      const modelText = isVoiceNote
        ? buildVoiceNoteModelText(transcriptText, audioDuration)
        : undefined;

      await runChatInference(selectedPersona.id, clientRequestId, displayText, modelText);
    } catch (err: unknown) {
      console.error('Failed to send message:', err);
      appendInferenceError(selectedPersona.id, cleanModelError(err));
    }
  };

  const handleRetryLastMessage = () => {
    const chatMsgs = messagesByPersona[selectedPersona.id] || [];
    const lastUserMsg = [...chatMsgs].reverse().find((m) => m.sender === 'user');
    const clientRequestId = lastUserMsg?.clientRequestId || lastUserMsg?.id;
    if (!lastUserMsg || !clientRequestId) return;

    setMessagesByPersona((prev) => ({
      ...prev,
      [selectedPersona.id]: (prev[selectedPersona.id] || []).filter((m) => !m.isError),
    }));

    void runChatInference(
      selectedPersona.id,
      clientRequestId,
      lastUserMsg.text,
      lastUserMsg.isVoiceNote
        ? buildVoiceNoteModelText(lastUserMsg.transcript, lastUserMsg.audioDuration)
        : undefined
    );
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

  const handleClearChat = async (characterId: string) => {
    const convId = conversationIds[characterId];
    if (convId && isSignedIn && clerkEnabled) {
      await deleteConversation(convId);
    }

    setConversationIds((prev) => {
      const next = { ...prev };
      delete next[characterId];
      return next;
    });
    setHasOlderMessages((prev) => {
      const next = { ...prev };
      delete next[characterId];
      return next;
    });
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
            onDeleteMessage={handleDeleteMessage}
            hasOlderMessages={hasOlderMessages[selectedPersona.id] ?? false}
            isLoadingOlderMessages={isLoadingOlderMessages}
            onLoadOlderMessages={handleLoadOlderMessages}
          />
        </div>
      </div>

      {/* Live Voice Call Modal (Gemini 3.1 Flash Live) */}
      <LiveVoiceCallModal
        character={callingPersona}
        isOpen={isCallOpen}
        onClose={() => setIsCallOpen(false)}
        conversationId={conversationIds[callingPersona.id]}
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
