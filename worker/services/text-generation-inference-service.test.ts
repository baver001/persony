import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BATTERY_CONFIG } from '../billing/battery-config';
import { setSystemSetting } from '../repositories/settings-repository';
import { findInferenceRunById } from '../repositories/inference-run-repository';
import { ensureEnergyWallet } from './energy-service';
import {
  PERSONA_DRAFT_INFERENCE_ID,
  runCallSummaryWithInference,
  runPersonaGenerationWithInference,
} from './text-generation-inference-service';
import { createTestD1 } from '../test/sqlite-d1';

vi.mock('../lib/gemini', () => ({
  handleGenerateCharacter: vi.fn(async () => ({
    character: { name: 'Nova', tagline: 'test' },
    model: 'gemini-3.8-flash',
    usage: { inputTokens: 400, outputTokens: 220 },
    usageEstimated: false,
    latencyMs: 820,
  })),
  handleSummarizeCall: vi.fn(async () => ({
    summary: 'We agreed to follow up tomorrow.',
    model: 'gemini-3.8-flash',
    usage: { inputTokens: 300, outputTokens: 90 },
    usageEstimated: false,
    latencyMs: 510,
  })),
}));

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('text-generation-inference-service', () => {
  let db: D1Database;

  beforeEach(async () => {
    db = createTestD1(migrationsDir);
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO users (id, auth_provider_id, created_at, updated_at)
         VALUES ('u1', 'clerk_u1', ?, ?)`
      )
      .bind(now, now)
      .run();
    await db
      .prepare(
        `INSERT INTO personas (
          id, owner_user_id, name, slug, status, visibility, voice, category, created_at, updated_at
        ) VALUES ('p1', 'u1', 'Athena', 'athena', 'active', 'public', 'Puck', 'custom', ?, ?)`
      )
      .bind(now, now)
      .run();
    await ensureEnergyWallet(db, 'u1', DEFAULT_BATTERY_CONFIG);
    await setSystemSetting(db, 'battery_enabled', false, 'test');
  });

  it('records persona_generation inference with priced COGS', async () => {
    const result = await runPersonaGenerationWithInference(db, 'u1', 'test-key', {
      prompt: 'wise mentor',
      clientRequestId: 'req-persona-gen-1',
    });

    expect(result.character.name).toBe('Nova');
    const run = await findInferenceRunById(db, result.inferenceRunId);
    expect(run?.operationType).toBe('persona_generation');
    expect(run?.personaId).toBe(PERSONA_DRAFT_INFERENCE_ID);
    expect(run?.status).toBe('completed');
    expect(run?.costConfidence).toBe('actual');
    expect(run?.providerCostMicrousd).toBeGreaterThan(0);
    expect(run?.inputTokens).toBe(400);
    expect(run?.outputTokens).toBe(220);
  });

  it('records call_summary inference with priced COGS', async () => {
    const result = await runCallSummaryWithInference(db, 'u1', 'test-key', {
      personaId: 'p1',
      clientRequestId: 'req-call-summary-1',
      personaName: 'Athena',
      durationSecs: 120,
      transcripts: [
        { sender: 'user', text: 'Hello' },
        { sender: 'character', text: 'Hi there' },
      ],
    });

    expect(result.summary).toContain('follow up');
    const run = await findInferenceRunById(db, result.inferenceRunId);
    expect(run?.operationType).toBe('call_summary');
    expect(run?.personaId).toBe('p1');
    expect(run?.status).toBe('completed');
    expect(run?.costConfidence).toBe('actual');
    expect(run?.providerCostMicrousd).toBeGreaterThan(0);
  });
});
