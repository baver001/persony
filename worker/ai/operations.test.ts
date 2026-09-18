import { describe, expect, it } from 'vitest';
import {
  normalizeInferenceOperation,
  operationTypeVariants,
} from './operations';

describe('normalizeInferenceOperation', () => {
  it('keeps canonical operation types', () => {
    expect(normalizeInferenceOperation('chat_text')).toBe('chat_text');
    expect(normalizeInferenceOperation('voice_call')).toBe('voice_call');
  });

  it('maps legacy aliases to canonical types', () => {
    expect(normalizeInferenceOperation('text_chat')).toBe('chat_text');
    expect(normalizeInferenceOperation('live_voice')).toBe('voice_call');
    expect(normalizeInferenceOperation('summarize_call')).toBe('call_summary');
    expect(normalizeInferenceOperation('generate_avatar')).toBe('avatar_generation');
  });
});

describe('operationTypeVariants', () => {
  it('includes legacy values for chat_text filters', () => {
    expect(operationTypeVariants('chat_text')).toEqual(
      expect.arrayContaining(['chat_text', 'text_chat'])
    );
  });
});
