import { getApiHeaders } from './headers';

async function ownerFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: await getApiHeaders() });
  if (res.status === 401) throw new Error('AUTH_REQUIRED');
  if (res.status === 403) throw new Error('FORBIDDEN');
  if (!res.ok) throw new Error('INTERNAL_ERROR');
  return res.json() as Promise<T>;
}

export async function fetchOwnerBatteryOverview(): Promise<Record<string, unknown>> {
  return ownerFetch('/owner/battery/overview');
}

export async function fetchOwnerAiOverview(): Promise<{
  chatTextProvider: string;
  providers: Record<string, { configured: boolean }>;
  billingEnabled: boolean;
}> {
  return ownerFetch('/owner/ai/overview');
}

export async function fetchOwnerUsers(): Promise<{
  users: Array<{
    id: string;
    authProviderId: string | null;
    preferredLocale: string | null;
    createdAt: string;
  }>;
}> {
  return ownerFetch('/owner/users');
}

export async function fetchOwnerMemoryStats(): Promise<{
  stats: {
    activeMemories: number;
    pendingCandidates: number;
    relationshipMemories: number;
  };
}> {
  return ownerFetch('/owner/memory/stats');
}

export async function updateOwnerSystemSetting(
  key: string,
  value: unknown,
  reason?: string
): Promise<boolean> {
  const res = await fetch('/api/owner/system/settings', {
    method: 'PUT',
    headers: await getApiHeaders(),
    body: JSON.stringify({ key, value, reason }),
  });
  return res.ok;
}

export async function fetchOwnerEconomics(): Promise<{
  economics: {
    aiCostTodayMicrousd: number;
    aiCost7dMicrousd: number;
    aiCost30dMicrousd: number;
    costCoverageTodayPercent: number;
    costCoverage7dPercent: number;
    unpricedCallsToday: number;
    estimatedCostCallsToday: number;
    energyConsumedToday: number;
    callsToday: number;
    successfulCallsToday: number;
    failedCallsToday: number;
    avgLatencyMsToday: number | null;
    fallbackRateToday: number;
    costByProvider: Array<{ provider: string; costMicrousd: number; calls: number }>;
    costByModel: Array<{ provider: string; model: string; costMicrousd: number; calls: number }>;
    activeUsersWithInference7d: number;
    simulatedRetailValueTodayMicrousd: number;
    simulatedGrossProfitTodayMicrousd: number;
    simulatedGrossMarginTodayPercent: number;
    retailPricingVersion: string;
    targetAiGrossMargin: number;
  };
}> {
  return ownerFetch('/owner/economics');
}

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
  costConfidence: 'actual' | 'estimated' | 'unpriced';
  energyCharged: number;
  latencyMs: number | null;
  fallbackCount: number;
  status: string;
  usageEstimated: boolean;
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
  costExplanation: {
    lines: Array<{
      pricingEntryId: string;
      dimension: string;
      units: number;
      priceMicrousdPerUnit: number;
      costMicrousd: number;
      pricingTier: string;
      timeRule: string;
    }>;
    totalMicrousd: number | null;
    pricingEntryIds: string[];
    pricingVersion: string | null;
    explainable: boolean;
    recomputed: boolean;
  };
  timeline: Array<{ at: string; stage: string; detail?: string }>;
};

export async function fetchOwnerInferenceList(params?: {
  limit?: number;
  offset?: number;
  status?: string;
  costConfidence?: string;
}): Promise<{
  items: OwnerInferenceListItem[];
  total: number;
  limit: number;
  offset: number;
}> {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.offset) query.set('offset', String(params.offset));
  if (params?.status) query.set('status', params.status);
  if (params?.costConfidence) query.set('costConfidence', params.costConfidence);
  const qs = query.toString();
  return ownerFetch(`/owner/inference${qs ? `?${qs}` : ''}`);
}

export async function fetchOwnerInferenceDetail(
  id: string
): Promise<{ inference: OwnerInferenceDetail }> {
  return ownerFetch(`/owner/inference/${id}`);
}

export type OwnerPricingEntry = {
  id: string;
  provider: string;
  model: string;
  dimension: string;
  priceMicrousdPerUnit: number;
  unit: string;
  currency: string;
  pricingTier: string;
  timeRule: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  sourceReference: string;
  verifiedAt: string;
  freshness: 'verified' | 'stale' | 'unknown';
};

export async function fetchOwnerPricing(): Promise<{
  catalogVersion: string;
  entries: OwnerPricingEntry[];
}> {
  return ownerFetch('/owner/pricing');
}

export async function fetchOwnerAudit(): Promise<{
  entries: Array<{
    id: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
  }>;
}> {
  return ownerFetch('/owner/audit');
}
