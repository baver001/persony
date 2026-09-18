import type { CostConfidence } from '../billing/cost-confidence';
import { computeUsageCost, PRICING_CATALOG } from '../billing/pricing-catalog';
import type { PricingComputationLine } from '../billing/pricing-types';
import {
  findInferenceRunById,
  listInferenceRuns,
  type InferenceListFilters,
  type InferenceRunRecord,
} from '../repositories/inference-run-repository';

export type OwnerInferenceListItem = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  operationType: string;
  userId: string;
  personaId: string;
  requestedProvider: string | null;
  requestedModel: string | null;
  actualProvider: string | null;
  actualModel: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  providerCostMicrousd: number | null;
  costConfidence: CostConfidence;
  energyCharged: number;
  latencyMs: number | null;
  fallbackCount: number;
  status: string;
  usageEstimated: boolean;
  errorCode: string | null;
};

export type InferenceCostExplanation = {
  lines: PricingComputationLine[];
  totalMicrousd: number | null;
  pricingEntryIds: string[];
  pricingVersion: string | null;
  explainable: boolean;
  /** True when lines were recomputed at read time (legacy rows). */
  recomputed: boolean;
};

export type InferenceTimelineEvent = {
  at: string;
  stage: string;
  detail?: string;
};

export type OwnerInferenceDetail = OwnerInferenceListItem & {
  conversationId: string;
  clientRequestId: string;
  cachedInputTokens: number | null;
  energyReserved: number;
  fallbackReason: string | null;
  providerRequestId: string | null;
  pricingEntryId: string | null;
  pricingVersion: string | null;
  costCalculatedAt: string | null;
  errorCode: string | null;
  costExplanation: InferenceCostExplanation;
  timeline: InferenceTimelineEvent[];
};

function toListItem(run: InferenceRunRecord): OwnerInferenceListItem {
  return {
    id: run.id,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    operationType: run.operationType,
    userId: run.userId,
    personaId: run.personaId,
    requestedProvider: run.requestedProvider,
    requestedModel: run.requestedModel,
    actualProvider: run.actualProvider,
    actualModel: run.actualModel,
    inputTokens: run.inputTokens,
    outputTokens: run.outputTokens,
    providerCostMicrousd: run.providerCostMicrousd,
    costConfidence: run.costConfidence,
    energyCharged: run.energyCharged,
    latencyMs: run.latencyMs,
    fallbackCount: run.fallbackCount,
    status: run.status,
    usageEstimated: run.usageEstimated,
    errorCode: run.errorCode,
  };
}

function lookupPricingEntries(ids: string[]) {
  const map = new Map(PRICING_CATALOG.map((e) => [e.id, e]));
  return ids.map((id) => map.get(id)).filter(Boolean);
}

export function buildCostExplanation(run: InferenceRunRecord): InferenceCostExplanation {
  if (run.costBreakdownJson) {
    try {
      const parsed = JSON.parse(run.costBreakdownJson) as {
        lines: PricingComputationLine[];
        totalMicrousd: number | null;
        pricingEntryIds: string[];
        pricingVersion: string | null;
      };
      return {
        lines: parsed.lines ?? [],
        totalMicrousd: parsed.totalMicrousd ?? run.providerCostMicrousd,
        pricingEntryIds: parsed.pricingEntryIds ?? [],
        pricingVersion: parsed.pricingVersion ?? run.pricingVersion,
        explainable: (parsed.lines?.length ?? 0) > 0,
        recomputed: false,
      };
    } catch {
      // fall through to recompute
    }
  }

  if (
    run.costConfidence === 'unpriced' ||
    !run.actualProvider ||
    !run.actualModel ||
    run.inputTokens == null
  ) {
    return {
      lines: [],
      totalMicrousd: null,
      pricingEntryIds: [],
      pricingVersion: run.pricingVersion,
      explainable: false,
      recomputed: false,
    };
  }

  const atIso = run.costCalculatedAt ?? run.completedAt ?? run.startedAt;
  const computed = computeUsageCost({
    provider: run.actualProvider,
    model: run.actualModel,
    usage: {
      inputTokens: run.inputTokens,
      outputTokens: run.outputTokens ?? 0,
      cachedInputTokens: run.cachedInputTokens ?? 0,
    },
    atIso,
  });

  return {
    lines: computed.lines,
    totalMicrousd: computed.priced ? computed.totalMicrousd : null,
    pricingEntryIds: computed.pricingEntryIds,
    pricingVersion: computed.catalogVersion,
    explainable: computed.priced,
    recomputed: true,
  };
}

function buildTimeline(run: InferenceRunRecord): InferenceTimelineEvent[] {
  const events: InferenceTimelineEvent[] = [
    { at: run.startedAt, stage: 'request_created' },
  ];

  if (run.energyReserved > 0) {
    events.push({
      at: run.startedAt,
      stage: 'energy_reserved',
      detail: `${run.energyReserved} units`,
    });
  }

  if (run.requestedProvider || run.requestedModel) {
    events.push({
      at: run.startedAt,
      stage: 'routing_decision',
      detail: `${run.requestedProvider ?? '?'} / ${run.requestedModel ?? '?'}`,
    });
  }

  if (run.fallbackCount > 0) {
    events.push({
      at: run.completedAt ?? run.startedAt,
      stage: 'provider_fallback',
      detail: run.fallbackReason ?? `${run.fallbackCount} fallback(s)`,
    });
  }

  if (run.actualProvider || run.actualModel) {
    events.push({
      at: run.completedAt ?? run.startedAt,
      stage: 'provider_response',
      detail: `${run.actualProvider ?? '?'} / ${run.actualModel ?? '?'}`,
    });
  }

  if (run.costCalculatedAt) {
    events.push({
      at: run.costCalculatedAt,
      stage: 'cost_calculated',
      detail: run.costConfidence,
    });
  }

  if (run.energyCharged > 0 && run.completedAt) {
    events.push({
      at: run.completedAt,
      stage: 'energy_settled',
      detail: `${run.energyCharged} units`,
    });
  }

  if (run.status === 'completed' && run.completedAt) {
    events.push({ at: run.completedAt, stage: 'completed' });
  }

  if (run.status === 'failed' && run.completedAt) {
    events.push({
      at: run.completedAt,
      stage: 'failed',
      detail: run.errorCode ?? undefined,
    });
  }

  return events;
}

export async function getOwnerInferenceList(
  db: D1Database,
  filters: InferenceListFilters
): Promise<{ items: OwnerInferenceListItem[]; total: number; limit: number; offset: number }> {
  const { rows, total } = await listInferenceRuns(db, filters);
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  const offset = Math.max(filters.offset ?? 0, 0);
  return {
    items: rows.map(toListItem),
    total,
    limit,
    offset,
  };
}

export async function getOwnerInferenceDetail(
  db: D1Database,
  runId: string
): Promise<OwnerInferenceDetail | null> {
  const run = await findInferenceRunById(db, runId);
  if (!run) return null;

  const costExplanation = buildCostExplanation(run);

  return {
    ...toListItem(run),
    conversationId: run.conversationId,
    clientRequestId: run.clientRequestId,
    cachedInputTokens: run.cachedInputTokens,
    energyReserved: run.energyReserved,
    fallbackReason: run.fallbackReason,
    providerRequestId: run.providerRequestId,
    pricingEntryId: run.pricingEntryId,
    pricingVersion: run.pricingVersion,
    costCalculatedAt: run.costCalculatedAt,
    errorCode: run.errorCode,
    costExplanation,
    timeline: buildTimeline(run),
  };
}

export { lookupPricingEntries };
