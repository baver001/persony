import type { ChatMessage } from '../types';

const LEGACY_VOICE_WITH_TRANSCRIPT =
  /^\[Пользователь отправил голосовое аудиосообщение\]: "([^"]+)"/;
const LEGACY_VOICE_SILENCE =
  /^\[Пользователь отправил голосовое аудиосообщение длительностью (\d+)/;
const DISPLAY_VOICE_WITH_TRANSCRIPT = /^🎤 "(.+)"$/;

export function buildVoiceNoteDisplayText(transcript: string): string {
  return `🎤 "${transcript}"`;
}

export function buildVoiceNoteModelText(
  transcript: string | undefined,
  audioDuration?: number
): string {
  if (transcript?.trim()) {
    return `(Голосовое сообщение пользователя): «${transcript.trim()}»`;
  }
  return `(Голосовое сообщение без распознанной речи, ~${audioDuration || 3} с)`;
}

/** Normalize stored/cloud text so internal prompts never reach the UI. */
export function normalizeUserMessageForDisplay(text: string): {
  text: string;
  isVoiceNote?: boolean;
  transcript?: string;
} {
  const legacyWithTranscript = text.match(LEGACY_VOICE_WITH_TRANSCRIPT);
  if (legacyWithTranscript) {
    const transcript = legacyWithTranscript[1];
    return {
      text: buildVoiceNoteDisplayText(transcript),
      isVoiceNote: true,
      transcript,
    };
  }

  if (LEGACY_VOICE_SILENCE.test(text)) {
    return {
      text: '🎤 Голосовое сообщение',
      isVoiceNote: true,
    };
  }

  const displayVoice = text.match(DISPLAY_VOICE_WITH_TRANSCRIPT);
  if (displayVoice) {
    return {
      text,
      isVoiceNote: true,
      transcript: displayVoice[1],
    };
  }

  if (text.startsWith('🎤')) {
    return { text, isVoiceNote: true };
  }

  return { text };
}

export function cloudMessageToChat(
  message: {
    id: string;
    senderType: 'user' | 'persona';
    text: string;
    createdAt: string;
  },
  personaId: string
): ChatMessage {
  const sender = message.senderType === 'user' ? 'user' : 'character';
  const normalized =
    sender === 'user'
      ? normalizeUserMessageForDisplay(message.text)
      : { text: message.text };

  return {
    id: message.id,
    characterId: personaId,
    sender,
    text: normalized.text,
    timestamp: new Date(message.createdAt).getTime(),
    status: 'sent',
    isVoiceNote: normalized.isVoiceNote,
    transcript: normalized.transcript,
  };
}
