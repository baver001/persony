import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createInferenceRun,
  findInferenceRunById,
  updateInferenceRunEconomics,
} from './inference-run-repository';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('inference-run-repository', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  async function seedUser() {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO users (id, auth_provider_id, created_at, updated_at)
         VALUES ('u1', 'clerk_1', ?, ?)`
      )
      .bind(now, now)
      .run();
    await db
      .prepare(
        `INSERT INTO personas (
          id, owner_user_id, name, slug, status, visibility, voice, category, created_at, updated_at
        ) VALUES ('p1', 'u1', 'Test', 'test', 'active', 'public', 'Puck', 'custom', ?, ?)`
      )
      .bind(now, now)
      .run();
  }

  it('does not overwrite settled cost fields on subsequent economics updates', async () => {
    await seedUser();
    const run = await createInferenceRun(db, {
      userId: 'u1',
      conversationId: 'c1',
      clientRequestId: 'req-1',
      personaId: 'p1',
      personaVersion: 1,
      provider: 'google',
      model: 'gemini-3.8-flash',
    });

    await updateInferenceRunEconomics(db, run.id, {
      energyReserved: 10,
      actualProvider: 'google',
      actualModel: 'gemini-3.8-flash',
    });

    await updateInferenceRunEconomics(db, run.id, {
      inputTokens: 100,
      outputTokens: 50,
      usageEstimated: false,
      providerCostMicrousd: 1_500_000,
      costConfidence: 'actual',
      pricingVersion: '2026-09-18-v2',
      pricingEntryId: 'gemini-3.8-flash:text_input:default',
      costCalculatedAt: '2026-09-18T12:00:00.000Z',
      costBreakdownJson: JSON.stringify({ lines: [], totalMicrousd: 1_500_000 }),
      energyCharged: 8,
      latencyMs: 420,
    });

    await updateInferenceRunEconomics(db, run.id, {
      providerCostMicrousd: 9_999_999,
      costConfidence: 'unpriced',
      inputTokens: 1,
      outputTokens: 1,
      energyCharged: 99,
      latencyMs: 999,
    });

    const settled = await findInferenceRunById(db, run.id);
    expect(settled?.providerCostMicrousd).toBe(1_500_000);
    expect(settled?.costConfidence).toBe('actual');
    expect(settled?.inputTokens).toBe(100);
    expect(settled?.outputTokens).toBe(50);
    expect(settled?.energyCharged).toBe(99);
    expect(settled?.latencyMs).toBe(999);
  });
});
