import i18n from '../i18n';
import { ChatMessage } from '../types';

export interface CallTranscriptTurn {
  id: string;
  sender: 'user' | 'character';
  text: string;
}

function formatCallDuration(secs: number): string {
  const mins = Math.floor(secs / 60);
  const remainder = secs % 60;
  return `${mins}:${remainder.toString().padStart(2, '0')}`;
}

/**
 * Builds chat messages for a completed voice call: one summary marker + dialogue turns.
 */
export function buildCallHistoryMessages(
  personaId: string,
  sessionId: string,
  durationSecs: number,
  transcripts: CallTranscriptTurn[],
  baseTimestamp = Date.now()
): ChatMessage[] {
  const messages: ChatMessage[] = [];

  if (durationSecs > 0 || transcripts.length > 0) {
    messages.push({
      id: `call_summary_${sessionId}`,
      characterId: personaId,
      sender: 'system',
      text: `📞 ${i18n.t('chat:voiceCallSummary')} · ${formatCallDuration(durationSecs)}`,
      timestamp: baseTimestamp,
      isCallSummary: true,
      callDurationSecs: durationSecs,
      voiceCallSessionId: sessionId,
    });
  }

  let ts = baseTimestamp + 1;
  for (const turn of transcripts) {
    const text = turn.text.trim();
    if (!text) continue;

    messages.push({
      id: `call_${sessionId}_${turn.id}`,
      characterId: personaId,
      sender: turn.sender,
      text,
      timestamp: ts++,
      isFromVoiceCall: true,
      voiceCallSessionId: sessionId,
    });
  }

  return messages;
}

/** Skip if this call session was already persisted. */
export function isCallSessionAlreadySaved(
  messages: ChatMessage[],
  sessionId: string
): boolean {
  return messages.some(
    (m) =>
      m.voiceCallSessionId === sessionId ||
      m.id === `call_summary_${sessionId}`
  );
}
