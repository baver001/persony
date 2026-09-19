import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createInferenceRun, updateInferenceRunEconomics } from '../repositories/inference-run-repository';
import { createTestD1 } from '../test/sqlite-d1';
import { getOwnerEconomicsSnapshot } from './economics-service';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('getOwnerEconomicsSnapshot', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  async function seedBase() {
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

  async function seedRun(
    clientRequestId: string,
    economics: {
      costConfidence: 'actual' | 'estimated' | 'unpriced';
      providerCostMicrousd: number | null;
    }
  ) {
    const run = await createInferenceRun(db, {
      userId: 'u1',
      conversationId: 'c1',
      clientRequestId,
      personaId: 'p1',
      personaVersion: 1,
      provider: 'google',
      model: 'gemini-3.8-flash',
    });
    await updateInferenceRunEconomics(db, run.id, {
      costConfidence: economics.costConfidence,
      providerCostMicrousd: economics.providerCostMicrousd,
      costCalculatedAt:
        economics.costConfidence === 'unpriced' ? undefined : new Date().toISOString(),
      pricingVersion: 'test-v1',
      pricingEntryId: economics.costConfidence === 'unpriced' ? undefined : 'test:entry',
    });
    await db
      .prepare(`UPDATE inference_runs SET status = 'completed', started_at = ? WHERE id = ?`)
      .bind(new Date().toISOString(), run.id)
      .run();
    return run;
  }

  it('excludes unpriced COGS from known totals and computes coverage', async () => {
    await seedBase();
    await seedRun('req-known', { costConfidence: 'actual', providerCostMicrousd: 500 });
    await seedRun('req-unpriced', { costConfidence: 'unpriced', providerCostMicrousd: null });

    const snapshot = await getOwnerEconomicsSnapshot(db);

    expect(snapshot.aiCostTodayMicrousd).toBe(500);
    expect(snapshot.unpricedCallsToday).toBe(1);
    expect(snapshot.callsToday).toBe(2);
    expect(snapshot.costCoverageTodayPercent).toBe(50);
    expect(snapshot.simulatedRetailValueTodayMicrousd).toBeGreaterThan(500);
  });
});
