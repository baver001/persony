import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_BATTERY_CONFIG } from '../billing/battery-config';
import { findInferenceRunById } from '../repositories/inference-run-repository';
import { setSystemSetting } from '../repositories/settings-repository';
import { ensureEnergyWallet } from './energy-service';
import { runAvatarWithInference } from './avatar-inference-service';
import { createTestD1 } from '../test/sqlite-d1';

vi.mock('../lib/gemini', () => ({
  handleGenerateAvatar: vi.fn(async () => ({
    imageDataUrl: 'data:image/png;base64,abc',
    model: 'gemini-3.1-flash-image',
    usage: { inputTokens: 50, outputTokens: 0 },
    usageEstimated: false,
    latencyMs: 2100,
  })),
}));

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('avatar-inference-service', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  it('records avatar_generation inference with per-image COGS', async () => {
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

    const result = await runAvatarWithInference(db, 'u1', 'test-key', {
      prompt: 'cyberpunk portrait',
      personaId: 'p1',
      clientRequestId: 'avatar-req-1',
    });

    expect(result.imageDataUrl).toContain('data:image/png');
    const run = await findInferenceRunById(db, result.inferenceRunId);
    expect(run?.operationType).toBe('avatar_generation');
    expect(run?.status).toBe('completed');
    expect(run?.providerCostMicrousd).toBe(4_000_000);
    expect(run?.costConfidence).toBe('actual');
  });
});
