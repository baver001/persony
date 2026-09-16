import type { ChatMessage } from '../types';

export function formatMessageCopyText(message: ChatMessage): string {
  if (message.transcript?.trim()) return message.transcript.trim();
  return message.text.trim();
}

export function formatDialogCopyText(messages: ChatMessage[], personaName: string): string {
  return messages
    .filter((m) => m.sender !== 'system')
    .map((m) => {
      if (m.isCallSummary) {
        const mins = Math.floor((m.callDurationSecs ?? 0) / 60);
        const secs = (m.callDurationSecs ?? 0) % 60;
        const duration = `${mins}:${secs.toString().padStart(2, '0')}`;
        const lines =
          m.callTranscripts?.map((t) => {
            const who = t.sender === 'user' ? 'Вы' : personaName;
            return `${who}: ${t.text}`;
          }) ?? [];
        return [`[Голосовой звонок · ${duration}]`, ...lines].join('\n');
      }

      const who = m.sender === 'user' ? 'Вы' : personaName;
      return `${who}: ${formatMessageCopyText(m)}`;
    })
    .filter(Boolean)
    .join('\n\n');
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
