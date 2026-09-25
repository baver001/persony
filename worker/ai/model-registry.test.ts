import { describe, expect, it } from 'vitest';
import {
  AI_MODEL_REGISTRY,
  assertModelSupportsOperation,
  listOwnerRoutingMatrix,
  modelIdsForOperation,
} from './model-registry';

describe('model-registry', () => {
  it('has unique provider+modelId pairs', () => {
    const keys = AI_MODEL_REGISTRY.map((m) => `${m.provider}:${m.modelId}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('exposes chat models for google', () => {
    const ids = modelIdsForOperation('google', 'chat_text');
    expect(ids).toContain('gemini-3.8-flash');
    expect(ids).toContain('gemini-3.5-flash-lite');
  });

  it('rejects incompatible voice_call assignment', () => {
    expect(assertModelSupportsOperation('google', 'gemini-3.8-flash', 'voice_call')).toBe(false);
    expect(assertModelSupportsOperation('google', 'gemini-3.8-live', 'voice_call')).toBe(true);
  });

  it('routes avatar_generation to Workers AI FLUX.2 klein 9B', () => {
    const avatar = AI_MODEL_REGISTRY.filter(
      (m) => m.enabled && m.operations.includes('avatar_generation')
    );
    expect(avatar.map((m) => m.modelId)).toEqual(['@cf/black-forest-labs/flux-2-klein-9b']);
  });

  it('exports owner routing matrix aligned with registry', () => {
    const matrix = listOwnerRoutingMatrix();
    expect(matrix.length).toBe(AI_MODEL_REGISTRY.length);
    expect(matrix.some((row) => row.operations.includes('voice_call'))).toBe(true);
  });
});
