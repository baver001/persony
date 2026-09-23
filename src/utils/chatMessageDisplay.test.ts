import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../i18n', () => ({
  default: { t: (key: string) => (key === 'chat:voiceMessage' ? 'Voice message' : key) },
}));

import {
  buildVoiceNoteDisplayText,
  cloudMessageToChat,
  normalizeUserMessageForDisplay,
  stripTranscriptQuotes,
} from './chatMessageDisplay';

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
    clear: () => undefined,
    key: () => null,
    length: 0,
  });
});

describe('stripTranscriptQuotes', () => {
  it('removes wrapping quotes and guillemets', () => {
    expect(stripTranscriptQuotes('«hello»')).toBe('hello');
    expect(stripTranscriptQuotes('"test"')).toBe('test');
  });
});

describe('normalizeUserMessageForDisplay', () => {
  it('maps legacy voice transcript prompt to mic display', () => {
    const result = normalizeUserMessageForDisplay(
      '[Пользователь отправил голосовое аудиосообщение]: "Привет мир"'
    );
    expect(result.isVoiceNote).toBe(true);
    expect(result.transcript).toBe('Привет мир');
    expect(result.text).toBe('🎤 "Привет мир"');
  });

  it('maps legacy silent voice note', () => {
    const result = normalizeUserMessageForDisplay(
      '[Пользователь отправил голосовое аудиосообщение длительностью 4 сек]'
    );
    expect(result.isVoiceNote).toBe(true);
    expect(result.text).toBe('🎤 Voice message');
  });

  it('passes through already normalized voice display', () => {
    const result = normalizeUserMessageForDisplay('🎤 "already"');
    expect(result.isVoiceNote).toBe(true);
    expect(result.transcript).toBe('already');
  });

  it('leaves plain text unchanged', () => {
    expect(normalizeUserMessageForDisplay('hello')).toEqual({ text: 'hello' });
  });
});

describe('buildVoiceNoteDisplayText', () => {
  it('wraps transcript in mic prefix', () => {
    expect(buildVoiceNoteDisplayText('Hi')).toBe('🎤 "Hi"');
  });
});

describe('cloudMessageToChat', () => {
  it('normalizes user cloud messages for UI', () => {
    const msg = cloudMessageToChat(
      {
        id: 'm1',
        senderType: 'user',
        text: '[Пользователь отправил голосовое аудиосообщение]: "test"',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      'p1'
    );
    expect(msg.isVoiceNote).toBe(true);
    expect(msg.text).toBe('🎤 "test"');
    expect(msg.sender).toBe('user');
  });

  it('does not rewrite persona messages', () => {
    const msg = cloudMessageToChat(
      {
        id: 'm2',
        senderType: 'persona',
        text: 'Hello there',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
      'p1'
    );
    expect(msg.text).toBe('Hello there');
    expect(msg.isVoiceNote).toBeUndefined();
  });
});
