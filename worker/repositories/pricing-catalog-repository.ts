import { generateId } from '../lib/ids';
import {
  mergePricingCatalog,
  PRICING_CATALOG,
  PRICING_CATALOG_VERSION,
  resolveCatalogVersion,
} from '../billing/pricing-catalog';
import type {
  PricingDimension,
  PricingEntry,
  PricingTier,
  PricingUnit,
  TimeRule,
} from '../billing/pricing-types';
import { writeAuditLog } from '../services/audit-service';

type PricingEntryRow = {
  id: string;
  catalog_version: string;
  provider: string;
  model: string;
  dimension: string;
  effective_from: string;
  effective_to: string | null;
  price_microusd_per_unit: number;
  unit: string;
  currency: string;
  pricing_tier: string;
  time_rule: string;
  source_reference: string;
  verified_at: string;
  created_at: string;
  created_by_user_id: string | null;
  reason: string | null;
};

export type DbPricingEntryRecord = PricingEntry & {
  catalogVersion: string;
  createdAt: string;
  createdByUserId: string | null;
  reason: string | null;
};

function rowToEntry(row: PricingEntryRow): DbPricingEntryRecord {
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    dimension: row.dimension as PricingDimension,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to,
    priceMicrousdPerUnit: row.price_microusd_per_unit,
    unit: row.unit as PricingUnit,
    currency: 'USD',
    pricingTier: row.pricing_tier as PricingTier,
    timeRule: row.time_rule as TimeRule,
    sourceReference: row.source_reference,
    verifiedAt: row.verified_at,
    catalogVersion: row.catalog_version,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
    reason: row.reason,
  };
}

export async function listDbPricingEntries(db: D1Database): Promise<DbPricingEntryRecord[]> {
  const result = await db
    .prepare(
      `SELECT id, catalog_version, provider, model, dimension, effective_from, effective_to,
              price_microusd_per_unit, unit, currency, pricing_tier, time_rule,
              source_reference, verified_at, created_at, created_by_user_id, reason
       FROM pricing_entries
       ORDER BY created_at DESC`
    )
    .all<PricingEntryRow>();

  return (result.results ?? []).map(rowToEntry);
}

export async function loadMergedPricingCatalog(db: D1Database): Promise<{
  entries: PricingEntry[];
  catalogVersion: string;
  dbEntryIds: Set<string>;
}> {
  const dbEntries = await listDbPricingEntries(db);
  const dbEntryIds = new Set(dbEntries.map((e) => e.id));
  const latestCreatedAt = dbEntries[0]?.createdAt ?? null;
  return {
    entries: mergePricingCatalog(dbEntries),
    catalogVersion: resolveCatalogVersion(dbEntries.length, latestCreatedAt),
    dbEntryIds,
  };
}

export type CreatePricingEntryInput = {
  id?: string;
  provider: string;
  model: string;
  dimension: PricingDimension;
  priceMicrousdPerUnit: number;
  unit: PricingUnit;
  effectiveFrom: string;
  effectiveTo?: string | null;
  pricingTier?: PricingTier;
  timeRule?: TimeRule;
  sourceReference: string;
  verifiedAt: string;
  reason: string;
};

function buildEntryId(input: CreatePricingEntryInput): string {
  if (input.id?.trim()) return input.id.trim();
  const tier = input.pricingTier ?? 'default';
  const time = input.timeRule ?? 'any';
  const day = input.effectiveFrom.slice(0, 10);
  return `${input.model}:${input.dimension}:${tier}:${time}:${day}`;
}

export async function createDbPricingEntry(
  db: D1Database,
  actorUserId: string,
  input: CreatePricingEntryInput
): Promise<DbPricingEntryRecord> {
  const id = buildEntryId(input);
  const existing = await db
    .prepare(`SELECT id FROM pricing_entries WHERE id = ? LIMIT 1`)
    .bind(id)
    .first<{ id: string }>();
  if (existing) {
    throw new Error('PRICING_ENTRY_EXISTS');
  }

  const conflictsCode = PRICING_CATALOG.some((e) => e.id === id);
  if (conflictsCode) {
    throw new Error('PRICING_ENTRY_ID_RESERVED');
  }

  const now = new Date().toISOString();
  const catalogVersion = resolveCatalogVersion(1, now);
  const pricingTier = input.pricingTier ?? 'default';
  const timeRule = input.timeRule ?? 'any';

  await db
    .prepare(
      `INSERT INTO pricing_entries (
        id, catalog_version, provider, model, dimension, effective_from, effective_to,
        price_microusd_per_unit, unit, currency, pricing_tier, time_rule,
        source_reference, verified_at, created_at, created_by_user_id, reason
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      catalogVersion,
      input.provider,
      input.model,
      input.dimension,
      input.effectiveFrom,
      input.effectiveTo ?? null,
      input.priceMicrousdPerUnit,
      input.unit,
      pricingTier,
      timeRule,
      input.sourceReference,
      input.verifiedAt,
      now,
      actorUserId,
      input.reason
    )
    .run();

  const record: DbPricingEntryRecord = {
    id,
    provider: input.provider,
    model: input.model,
    dimension: input.dimension,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
    priceMicrousdPerUnit: input.priceMicrousdPerUnit,
    unit: input.unit,
    currency: 'USD',
    pricingTier,
    timeRule,
    sourceReference: input.sourceReference,
    verifiedAt: input.verifiedAt,
    catalogVersion,
    createdAt: now,
    createdByUserId: actorUserId,
    reason: input.reason,
  };

  await writeAuditLog(db, {
    actorUserId,
    action: 'pricing_entry_created',
    targetType: 'pricing_entry',
    targetId: id,
    newState: record,
    reason: input.reason,
  });

  return record;
}

export function mergedCatalogVersion(dbEntryCount: number, latestCreatedAt: string | null): string {
  return resolveCatalogVersion(dbEntryCount, latestCreatedAt);
}

export { PRICING_CATALOG_VERSION };
