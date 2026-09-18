import { defaultCostEngine } from '../billing/cost-engine';
import { resolveCostConfidence } from '../billing/cost-confidence';
import { computeDurationCost } from '../billing/pricing-catalog';
import { loadMergedPricingCatalog } from '../repositories/pricing-catalog-repository';
import { loadRetailPricingConfig } from '../billing/retail-pricing';
import { GEMINI_LIVE_MODEL } from '../lib/models';
import type { ProviderUsageMetrics } from '../providers/provider-result';
import type { PricingComputationLine } from '../billing/pricing-types';
import {
  createInferenceRunWithId,
  markInferenceRunCompleted,
  markInferenceRunFailed,
  updateInferenceRunEconomics,
} from '../repositories/inference-run-repository';
import {
  actualEnergyUnitsForUsage,
  releaseEnergyForInference,
  reserveEnergyForInference,
  settleEnergyForInference,
} from './energy-service';
import { loadBatteryConfig } from '../billing/battery-config';

export type BeginVoiceCallInput = {
  runId: string;
  userId: string;
  personaId: string;
  personaVersion: number;
  conversationId?: string;
  provider?: string;
  model?: string;
};

export async function beginVoiceCallInference(
  db: D1Database,
  input: BeginVoiceCallInput
): Promise<{ runId: string; reservedUnits: number }> {
  const conversationId =
    input.conversationId?.trim() || `voice:${input.userId}:${input.personaId}`;
  const provider = input.provider ?? 'google';
  const model = input.model ?? GEMINI_LIVE_MODEL;

  await createInferenceRunWithId(db, {
    id: input.runId,
    userId: input.userId,
    conversationId,
    clientRequestId: input.runId,
    personaId: input.personaId,
    personaVersion: input.personaVersion,
    provider,
    model,
    operationType: 'voice_call',
  });

  const reservation = await reserveEnergyForInference(
    db,
    input.userId,
    input.runId,
    'voice_call'
  );
  await updateInferenceRunEconomics(db, input.runId, {
    energyReserved: reservation.reservedUnits,
    requestedProvider: provider,
    requestedModel: model,
    actualProvider: provider,
    actualModel: model,
  });

  return { runId: input.runId, reservedUnits: reservation.reservedUnits };
}

function hasReportedUsage(usage?: ProviderUsageMetrics): boolean {
  if (!usage) return false;
  return (
    usage.inputTokens != null ||
    usage.outputTokens != null ||
    usage.totalTokens != null
  );
}

export async function completeVoiceCallInference(
  db: D1Database,
  userId: string,
  runId: string,
  durationMs: number,
  reportedUsage?: ProviderUsageMetrics
): Promise<void> {
  const provider = 'google';
  const model = GEMINI_LIVE_MODEL;
  const pricingCatalogState = await loadMergedPricingCatalog(db);

  let providerCostMicrousd: number | null = null;
  let usageEstimated = true;
  let costLines: PricingComputationLine[] = [];
  let pricingVersion = pricingCatalogState.catalogVersion;
  let pricingEntryId: string | null = null;
  let estimateSource = 'session_duration';
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;

  if (hasReportedUsage(reportedUsage)) {
    const tokenCost = defaultCostEngine.computeProviderCost({
      provider,
      model,
      usage: reportedUsage!,
      usageEstimated: false,
      catalog: pricingCatalogState.entries,
      catalogVersion: pricingCatalogState.catalogVersion,
    });
    inputTokens = reportedUsage!.inputTokens ?? null;
    outputTokens = reportedUsage!.outputTokens ?? null;

    if (tokenCost.priced && tokenCost.providerCostMicrousd != null) {
      providerCostMicrousd = tokenCost.providerCostMicrousd;
      usageEstimated = false;
      costLines = tokenCost.costLines;
      pricingVersion = tokenCost.pricingVersion;
      pricingEntryId = tokenCost.pricingEntryId;
      estimateSource = 'provider_usage';
    }
  }

  if (providerCostMicrousd == null && durationMs > 0) {
    const durationPricing = computeDurationCost({
      provider,
      model,
      durationMs,
      catalog: pricingCatalogState.entries,
      catalogVersion: pricingCatalogState.catalogVersion,
    });
    if (durationPricing.priced && durationPricing.totalMicrousd > 0) {
      providerCostMicrousd = durationPricing.totalMicrousd;
      costLines = durationPricing.lines;
      pricingVersion = durationPricing.catalogVersion;
      pricingEntryId = durationPricing.pricingEntryIds.join(',') || null;
      estimateSource = hasReportedUsage(reportedUsage)
        ? 'session_duration_fallback'
        : 'session_duration';
      usageEstimated = true;
    }
  }

  const priced = providerCostMicrousd != null && providerCostMicrousd > 0;
  const costConfidence = resolveCostConfidence({
    providerCostMicrousd,
    usageEstimated,
    priced,
  });

  const batteryConfig = await loadBatteryConfig(db);
  const retailPricing = await loadRetailPricingConfig(db);
  const tokenHint =
    inputTokens != null || outputTokens != null
      ? { input: inputTokens ?? undefined, output: outputTokens ?? undefined }
      : undefined;
  const energyCharged = actualEnergyUnitsForUsage(
    'voice_call',
    batteryConfig,
    tokenHint,
    providerCostMicrousd ?? undefined,
    retailPricing
  );

  const costCalculatedAt = new Date().toISOString();
  await updateInferenceRunEconomics(db, runId, {
    inputTokens,
    outputTokens,
    usageEstimated,
    providerCostMicrousd,
    costConfidence,
    pricingVersion,
    pricingEntryId,
    costCalculatedAt,
    costBreakdownJson: JSON.stringify({
      lines: costLines,
      totalMicrousd: providerCostMicrousd,
      pricingEntryIds: pricingEntryId?.split(',').filter(Boolean) ?? [],
      pricingVersion,
      durationMs,
      estimateSource,
      reportedUsage: hasReportedUsage(reportedUsage) ? reportedUsage : null,
    }),
    energyCharged,
    latencyMs: durationMs,
  });

  await markInferenceRunCompleted(db, runId, null);
  await settleEnergyForInference(
    db,
    userId,
    runId,
    'voice_call',
    tokenHint,
    providerCostMicrousd ?? undefined
  );
}

export async function failVoiceCallInference(
  db: D1Database,
  userId: string,
  runId: string,
  errorCode: string
): Promise<void> {
  await markInferenceRunFailed(db, runId, errorCode);
  await releaseEnergyForInference(db, userId, runId, errorCode);
}
