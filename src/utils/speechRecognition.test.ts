import { describe, expect, it } from 'vitest';
import { speechRecognitionLocale } from './speechRecognition';

describe('speechRecognitionLocale', () => {
  it('maps ru locale to ru-RU', () => {
    expect(speechRecognitionLocale('ru')).toBe('ru-RU');
    expect(speechRecognitionLocale('ru-RU')).toBe('ru-RU');
  });

  it('maps en locale to en-US', () => {
    expect(speechRecognitionLocale('en')).toBe('en-US');
    expect(speechRecognitionLocale('en-GB')).toBe('en-US');
  });

  it('falls back to en-US for unknown locales', () => {
    expect(speechRecognitionLocale('')).toBe('en-US');
  });
});
