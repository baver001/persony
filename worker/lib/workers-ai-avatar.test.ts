import { describe, expect, it, vi } from 'vitest';
import {
  generateAvatarWithWorkersAi,
  WORKERS_AI_AVATAR_MODEL,
  WORKERS_AI_AVATAR_STEPS,
  workersAiImageToDataUrl,
} from './workers-ai-avatar';

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

describe('generateAvatarWithWorkersAi', () => {
  it('calls FLUX.1 schnell with prompt and steps', async () => {
    const run = vi.fn(async () => ({ image: 'imgb64' }));
    const ai = { run } as unknown as Ai;

    const result = await generateAvatarWithWorkersAi(ai, 'portrait hint', 'Athena');

    expect(run).toHaveBeenCalledWith(WORKERS_AI_AVATAR_MODEL, {
      prompt: expect.stringContaining('portrait hint'),
      steps: WORKERS_AI_AVATAR_STEPS,
    });
    expect(result.model).toBe(WORKERS_AI_AVATAR_MODEL);
    expect(result.imageDataUrl).toBe('data:image/jpeg;base64,imgb64');
  });
});
