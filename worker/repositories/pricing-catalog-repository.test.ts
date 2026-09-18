import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { computeUsageCost } from '../billing/pricing-catalog';
import {
  createDbPricingEntry,
  loadMergedPricingCatalog,
} from './pricing-catalog-repository';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('pricing-catalog-repository', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  it('merges DB entries over code catalog by id', async () => {
    await createDbPricingEntry(db, 'owner-1', {
      id: 'custom:gemini-3.8-flash:text_input:default:any:2026-09-18',
      provider: 'google',
      model: 'gemini-3.8-flash',
      dimension: 'text_input',
      priceMicrousdPerUnit: 999_000,
      unit: 'per_million_tokens',
      effectiveFrom: '2026-09-18T00:00:00.000Z',
      pricingTier: 'default',
      timeRule: 'any',
      sourceReference: 'https://example.com/pricing',
      verifiedAt: '2026-09-18',
      reason: 'smoke override',
    });

    const { entries, catalogVersion, dbEntryIds } = await loadMergedPricingCatalog(db);
    expect(catalogVersion).toContain('+db@');
    expect(dbEntryIds.size).toBe(1);

    const custom = entries.find((e) => e.id.includes('custom:gemini-3.8-flash'));
    expect(custom?.priceMicrousdPerUnit).toBe(999_000);

    const priced = computeUsageCost({
      provider: 'google',
      model: 'gemini-3.8-flash',
      usage: { inputTokens: 1_000_000, outputTokens: 0 },
      atIso: '2026-09-18T12:00:00.000Z',
      catalog: entries,
      catalogVersion,
    });
    expect(priced.totalMicrousd).toBe(999_000);
  });
});
