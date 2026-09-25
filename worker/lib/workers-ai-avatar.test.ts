import { describe, expect, it } from 'vitest';
import { workersAiImageToDataUrl } from './workers-ai-avatar';

describe('workersAiImageToDataUrl', () => {
  it('wraps a raw base64 string', () => {
    expect(workersAiImageToDataUrl('abc')).toBe('data:image/jpeg;base64,abc');
  });

  it('keeps an existing data URL', () => {
    expect(workersAiImageToDataUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('reads image field from an object payload', () => {
    expect(workersAiImageToDataUrl({ image: 'xyz' })).toBe('data:image/jpeg;base64,xyz');
  });
});
