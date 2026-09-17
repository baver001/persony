import { describe, expect, it, vi } from 'vitest';

vi.mock('../i18n', () => ({
  default: { t: (key: string) => key },
}));
import {
  buildCallHistoryMessages,
  collectCallTranscripts,
  getOfferedCallInsights,
} from './callTranscriptPersistence';

describe('callTranscriptPersistence', () => {
  it('offers call insights when dialogue exists', () => {
    const messages = buildCallHistoryMessages('p1', 'sess1', 42, [
      { id: 't1', sender: 'user', text: 'Hi' },
      { id: 't2', sender: 'character', text: 'Hello there' },
    ]);

    const summary = messages.find((m) => m.isCallSummary);
    expect(summary?.callInsightsStatus).toBe('offered');
    expect(summary?.callTranscripts).toHaveLength(2);
    expect(getOfferedCallInsights(messages)?.id).toBe('call_summary_sess1');
  });

  it('collects transcripts from voice-call turns', () => {
    const messages = buildCallHistoryMessages('p1', 'sess2', 10, [
      { id: 'a', sender: 'user', text: 'Question' },
    ]);
    const collected = collectCallTranscripts(messages, 'sess2');
    expect(collected).toHaveLength(1);
    expect(collected[0].text).toBe('Question');
  });
});
