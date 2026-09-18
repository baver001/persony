import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BATTERY_CONFIG } from '../billing/battery-config';
import { findInferenceRunById } from '../repositories/inference-run-repository';
import { ensureEnergyWallet } from './energy-service';
import { runTranscribeWithInference } from './transcribe-inference-service';
import { createTestD1 } from '../test/sqlite-d1';

vi.mock('../lib/gemini', () => ({
  handleTranscribe: vi.fn(async () => ({
    transcript: 'привет smoke',
    model: 'gemini-3.5-transcribe',
    usage: { inputTokens: 120, outputTokens: 8 },
    usageEstimated: false,
    latencyMs: 340,
  })),
}));

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('transcribe-inference-service', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  it('records voice_transcription inference with priced COGS when usage is reported', async () => {
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

    const result = await runTranscribeWithInference(db, 'u1', 'test-key', {
      audioBase64: 'UklGRiQAAABXQVZFZm10',
      mimeType: 'audio/wav',
      personaId: 'p1',
      clientRequestId: 'req-voice:transcribe',
      conversationId: 'conv-1',
    });

    expect(result.transcript).toBe('привет smoke');
    const run = await findInferenceRunById(db, result.inferenceRunId);
    expect(run?.operationType).toBe('voice_transcription');
    expect(run?.status).toBe('completed');
    expect(run?.usageEstimated).toBe(false);
    expect(run?.costConfidence).toBe('actual');
    expect(run?.providerCostMicrousd).toBeGreaterThan(0);
    expect(run?.inputTokens).toBe(120);
    expect(run?.outputTokens).toBe(8);
  });
});
