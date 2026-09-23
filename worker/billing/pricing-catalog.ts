import type { ProviderUsageMetrics } from '../providers/provider-result';
import { resolveTimeRuleForProvider } from './pricing-time';
import type {
  PricingComputationLine,
  PricingComputationResult,
  PricingDimension,
  PricingEntry,
  PricingFreshness,
  PricingTier,
  TimeRule,
} from './pricing-types';

export const PRICING_CATALOG_VERSION = '2026-09-18-v2';

export function mergePricingCatalog(dbEntries: PricingEntry[]): PricingEntry[] {
  if (dbEntries.length === 0) return PRICING_CATALOG;
  const byId = new Map<string, PricingEntry>();
  for (const entry of PRICING_CATALOG) byId.set(entry.id, entry);
  for (const entry of dbEntries) byId.set(entry.id, entry);
  return [...byId.values()];
}

export function resolveCatalogVersion(
  dbEntryCount: number,
  latestCreatedAt?: string | null
): string {
  if (dbEntryCount <= 0) return PRICING_CATALOG_VERSION;
  if (latestCreatedAt) {
    return `${PRICING_CATALOG_VERSION}+db@${latestCreatedAt.slice(0, 10)}`;
  }
  return `${PRICING_CATALOG_VERSION}+db(${dbEntryCount})`;
}

function activeCatalog(catalog?: PricingEntry[]): PricingEntry[] {
  return catalog ?? PRICING_CATALOG;
}

const VERIFIED_AT = '2026-09-18';
const GEMINI_PRICING = 'https://ai.google.dev/gemini-api/docs/pricing';
const DEEPSEEK_PRICING = 'https://api-docs.deepseek.com/quick_start/pricing';

/** Configurable stale threshold — owner console can override later. */
export const PRICING_STALE_DAYS = 30;

function entry(
  id: string,
  provider: string,
  model: string,
  dimension: PricingDimension,
  priceMicrousdPerUnit: number,
  opts: {
    effectiveFrom: string;
    effectiveTo?: string | null;
    pricingTier?: PricingTier;
    timeRule?: TimeRule;
    sourceReference?: string;
    verifiedAt?: string;
    unit?: PricingEntry['unit'];
  }
): PricingEntry {
  return {
    id,
    provider,
    model,
    dimension,
    effectiveFrom: opts.effectiveFrom,
    effectiveTo: opts.effectiveTo ?? null,
    priceMicrousdPerUnit,
    unit: opts.unit ?? 'per_million_tokens',
    currency: 'USD',
    pricingTier: opts.pricingTier ?? 'default',
    timeRule: opts.timeRule ?? 'any',
    sourceReference: opts.sourceReference ?? GEMINI_PRICING,
    verifiedAt: opts.verifiedAt ?? VERIFIED_AT,
  };
}

function geminiText(
  model: string,
  inputMicrousd: number,
  outputMicrousd: number,
  effectiveFrom = '2026-01-01'
): PricingEntry[] {
  return [
    entry(`${model}:text_input:default`, 'google', model, 'text_input', inputMicrousd, {
      effectiveFrom,
      sourceReference: GEMINI_PRICING,
    }),
    entry(`${model}:text_output:default`, 'google', model, 'text_output', outputMicrousd, {
      effectiveFrom,
      sourceReference: GEMINI_PRICING,
    }),
  ];
}

function deepseekTokenPair(
  model: string,
  offPeakInputMiss: number,
  offPeakOutput: number,
  offPeakInputHit: number,
  effectiveFrom = '2026-01-01'
): PricingEntry[] {
  const peakInputMiss = offPeakInputMiss * 2;
  const peakOutput = offPeakOutput * 2;
  const peakInputHit = offPeakInputHit * 2;

  const rows: PricingEntry[] = [];
  for (const [timeRule, inputMiss, inputHit, output] of [
    ['off_peak', offPeakInputMiss, offPeakInputHit, offPeakOutput],
    ['peak', peakInputMiss, peakInputHit, peakOutput],
  ] as const) {
    rows.push(
      entry(`${model}:text_input:cache_miss:${timeRule}`, 'deepseek', model, 'text_input', inputMiss, {
        effectiveFrom,
        pricingTier: 'cache_miss',
        timeRule,
        sourceReference: DEEPSEEK_PRICING,
      }),
      entry(`${model}:cached_input:cache_hit:${timeRule}`, 'deepseek', model, 'cached_input', inputHit, {
        effectiveFrom,
        pricingTier: 'cache_hit',
        timeRule,
        sourceReference: DEEPSEEK_PRICING,
      }),
      entry(`${model}:text_output:default:${timeRule}`, 'deepseek', model, 'text_output', output, {
        effectiveFrom,
        pricingTier: 'default',
        timeRule,
        sourceReference: DEEPSEEK_PRICING,
      })
    );
  }
  return rows;
}

/**
 * Versioned pricing catalog — append new rows; never mutate historical entries.
 */
export const PRICING_CATALOG: PricingEntry[] = [
  ...geminiText('gemini-3.8-flash', 150_000, 600_000),
  ...geminiText('gemini-3.8-live', 150_000, 600_000),
  ...geminiText('gemini-3.5-flash-lite', 75_000, 300_000),
  ...geminiText('gemini-3.5-transcribe', 75_000, 300_000),
  // Historical price row — superseded but kept for inference repricing
  entry('gemini-3.8-flash:text_input:legacy', 'google', 'gemini-3.8-flash', 'text_input', 100_000, {
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-12-31T23:59:59.999Z',
    sourceReference: GEMINI_PRICING,
  }),
  entry('gemini-3.8-flash:text_output:legacy', 'google', 'gemini-3.8-flash', 'text_output', 400_000, {
    effectiveFrom: '2025-01-01',
    effectiveTo: '2025-12-31T23:59:59.999Z',
    sourceReference: GEMINI_PRICING,
  }),
  ...deepseekTokenPair('deepseek-chat', 140_000, 280_000, 14_000),
  ...deepseekTokenPair('deepseek-reasoner', 550_000, 2_190_000, 55_000),
  // Gemini Live — duration-based estimate until provider usage API is wired
  entry('gemini-3.8-live:per_minute:default', 'google', 'gemini-3.8-live', 'per_minute', 80_000, {
    effectiveFrom: '2026-01-01',
    unit: 'per_minute',
    sourceReference: GEMINI_PRICING,
  }),
  entry(
    'gemini-3.1-flash-image:per_image:default',
    'google',
    'gemini-3.1-flash-image',
    'per_image',
    4_000_000,
    {
      effectiveFrom: '2026-09-21',
      unit: 'per_image',
      sourceReference: GEMINI_PRICING,
    }
  ),
  entry(
    'gemini-2.0-flash-preview-image-generation:per_image:default',
    'google',
    'gemini-2.0-flash-preview-image-generation',
    'per_image',
    4_000_000,
    {
      effectiveFrom: '2026-01-01',
      unit: 'per_image',
      sourceReference: GEMINI_PRICING,
    }
  ),
  entry(
    'gemini-2.0-flash-exp-image-generation:per_image:default',
    'google',
    'gemini-2.0-flash-exp-image-generation',
    'per_image',
    4_000_000,
    {
      effectiveFrom: '2026-01-01',
      unit: 'per_image',
      sourceReference: GEMINI_PRICING,
    }
  ),
];

export function isEntryEffective(entry: PricingEntry, atMs: number): boolean {
  const from = Date.parse(entry.effectiveFrom);
  const to = entry.effectiveTo ? Date.parse(entry.effectiveTo) : Number.POSITIVE_INFINITY;
  return atMs >= from && atMs <= to;
}

export function findPricingEntries(
  provider: string,
  model: string,
  dimension: PricingDimension,
  atIso: string,
  opts?: { pricingTier?: PricingTier; timeRule?: TimeRule; catalog?: PricingEntry[] }
): PricingEntry[] {
  const atMs = Date.parse(atIso);
  const timeRule = opts?.timeRule ?? resolveTimeRuleForProvider(provider, atIso);
  const catalog = activeCatalog(opts?.catalog);

  return catalog.filter((e) => {
    if (e.provider !== provider || e.model !== model || e.dimension !== dimension) {
      return false;
    }
    if (!isEntryEffective(e, atMs)) return false;
    if (opts?.pricingTier && e.pricingTier !== opts.pricingTier) return false;
    if (e.timeRule !== 'any' && e.timeRule !== timeRule) return false;
    return true;
  }).sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom));
}

export function findBestPricingEntry(
  provider: string,
  model: string,
  dimension: PricingDimension,
  atIso: string,
  pricingTier: PricingTier,
  catalog?: PricingEntry[]
): PricingEntry | null {
  const matches = findPricingEntries(provider, model, dimension, atIso, {
    pricingTier,
    catalog,
  });
  return matches[0] ?? null;
}

function costForUnits(
  units: number,
  priceMicrousdPerUnit: number,
  unit: PricingEntry['unit']
): number {
  if (units <= 0 || priceMicrousdPerUnit <= 0) return 0;
  if (unit === 'per_minute' || unit === 'per_image') {
    return Math.round(units * priceMicrousdPerUnit);
  }
  return Math.round((units * priceMicrousdPerUnit) / 1_000_000);
}

function lineFromEntry(entry: PricingEntry, units: number): PricingComputationLine {
  return {
    pricingEntryId: entry.id,
    dimension: entry.dimension,
    units,
    priceMicrousdPerUnit: entry.priceMicrousdPerUnit,
    costMicrousd: costForUnits(units, entry.priceMicrousdPerUnit, entry.unit),
    pricingTier: entry.pricingTier,
    timeRule: entry.timeRule,
  };
}

/** Per-image COGS (avatar generation). Units = image count (typically 1). */
export function computePerImageCost(input: {
  provider: string;
  model: string;
  imageCount: number;
  atIso?: string;
  catalog?: PricingEntry[];
  catalogVersion?: string;
}): PricingComputationResult {
  const atIso = input.atIso ?? new Date().toISOString();
  const count = Math.max(0, input.imageCount);
  const catalogVersion = input.catalogVersion ?? PRICING_CATALOG_VERSION;
  const imageEntry = findBestPricingEntry(
    input.provider,
    input.model,
    'per_image',
    atIso,
    'default',
    input.catalog
  );
  if (!imageEntry || count <= 0) {
    return {
      lines: [],
      totalMicrousd: 0,
      pricingEntryIds: [],
      catalogVersion,
      priced: false,
    };
  }
  const line = lineFromEntry(imageEntry, count);
  return {
    lines: [line],
    totalMicrousd: line.costMicrousd,
    pricingEntryIds: [line.pricingEntryId],
    catalogVersion,
    priced: line.costMicrousd > 0,
  };
}

/** Duration-based COGS (voice call live sessions). Units = fractional minutes. */
export function computeDurationCost(input: {
  provider: string;
  model: string;
  durationMs: number;
  atIso?: string;
  catalog?: PricingEntry[];
  catalogVersion?: string;
}): PricingComputationResult {
  const atIso = input.atIso ?? new Date().toISOString();
  const catalogVersion = input.catalogVersion ?? PRICING_CATALOG_VERSION;
  const minutes = Math.max(0, input.durationMs) / 60_000;
  const minuteEntry = findBestPricingEntry(
    input.provider,
    input.model,
    'per_minute',
    atIso,
    'default',
    input.catalog
  );
  if (!minuteEntry || minutes <= 0) {
    return {
      lines: [],
      totalMicrousd: 0,
      pricingEntryIds: [],
      catalogVersion,
      priced: false,
    };
  }
  const line = lineFromEntry(minuteEntry, minutes);
  return {
    lines: [line],
    totalMicrousd: line.costMicrousd,
    pricingEntryIds: [line.pricingEntryId],
    catalogVersion,
    priced: line.costMicrousd > 0,
  };
}

export function computeUsageCost(input: {
  provider: string;
  model: string;
  usage: ProviderUsageMetrics;
  atIso?: string;
  catalog?: PricingEntry[];
  catalogVersion?: string;
}): PricingComputationResult {
  const atIso = input.atIso ?? new Date().toISOString();
  const catalog = input.catalog;
  const catalogVersion = input.catalogVersion ?? PRICING_CATALOG_VERSION;
  const lines: PricingComputationLine[] = [];

  const inputTokens = input.usage.inputTokens ?? 0;
  const outputTokens = input.usage.outputTokens ?? 0;
  const cachedTokens = input.usage.cachedInputTokens ?? 0;

  const nonCachedInput = Math.max(0, inputTokens - cachedTokens);

  if (input.provider === 'deepseek') {
    if (nonCachedInput > 0) {
      const miss = findBestPricingEntry(
        input.provider,
        input.model,
        'text_input',
        atIso,
        'cache_miss',
        catalog
      );
      if (miss) lines.push(lineFromEntry(miss, nonCachedInput));
    }
    if (cachedTokens > 0) {
      const hit = findBestPricingEntry(
        input.provider,
        input.model,
        'cached_input',
        atIso,
        'cache_hit',
        catalog
      );
      if (hit) lines.push(lineFromEntry(hit, cachedTokens));
    }
  } else if (nonCachedInput > 0) {
    const textIn = findBestPricingEntry(
      input.provider,
      input.model,
      'text_input',
      atIso,
      'default',
      catalog
    );
    if (textIn) lines.push(lineFromEntry(textIn, nonCachedInput));
    if (cachedTokens > 0) {
      const cached = findBestPricingEntry(
        input.provider,
        input.model,
        'cached_input',
        atIso,
        'default',
        catalog
      );
      if (cached) lines.push(lineFromEntry(cached, cachedTokens));
    }
  }

  if (outputTokens > 0) {
    const textOut = findBestPricingEntry(
      input.provider,
      input.model,
      'text_output',
      atIso,
      input.provider === 'deepseek' ? 'default' : 'default',
      catalog
    );
    if (textOut) lines.push(lineFromEntry(textOut, outputTokens));
  }

  const priced = lines.length > 0;
  const totalMicrousd = lines.reduce((sum, l) => sum + l.costMicrousd, 0);

  return {
    lines,
    totalMicrousd,
    pricingEntryIds: lines.map((l) => l.pricingEntryId),
    catalogVersion,
    priced,
  };
}

export function pricingFreshness(verifiedAt: string, now = new Date()): PricingFreshness {
  const verifiedMs = Date.parse(verifiedAt);
  if (Number.isNaN(verifiedMs)) return 'unknown';
  const ageDays = (now.getTime() - verifiedMs) / (1000 * 60 * 60 * 24);
  if (ageDays <= PRICING_STALE_DAYS) return 'verified';
  return 'stale';
}

export function listCatalogEntries(
  filters?: {
    provider?: string;
    model?: string;
  },
  catalog?: PricingEntry[]
): PricingEntry[] {
  return activeCatalog(catalog).filter((e) => {
    if (filters?.provider && e.provider !== filters.provider) return false;
    if (filters?.model && e.model !== filters.model) return false;
    return true;
  });
}
