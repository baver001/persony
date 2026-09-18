import { resolveCostConfidence } from '../billing/cost-confidence';
import { computeDurationCost } from '../billing/pricing-catalog';
import { loadMergedPricingCatalog } from '../repositories/pricing-catalog-repository';
import { loadRetailPricingConfig } from '../billing/retail-pricing';
import { GEMINI_LIVE_MODEL } from '../lib/models';
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

export async function completeVoiceCallInference(
  db: D1Database,
  userId: string,
  runId: string,
  durationMs: number
): Promise<void> {
  const provider = 'google';
  const model = GEMINI_LIVE_MODEL;
  const pricingCatalogState = await loadMergedPricingCatalog(db);
  const pricing = computeDurationCost({
    provider,
    model,
    durationMs,
    catalog: pricingCatalogState.entries,
    catalogVersion: pricingCatalogState.catalogVersion,
  });
  const usageEstimated = true;
  const priced = pricing.priced && pricing.totalMicrousd > 0;
  const providerCostMicrousd = priced ? pricing.totalMicrousd : null;
  const costConfidence = resolveCostConfidence({
    providerCostMicrousd,
    usageEstimated,
    priced,
  });

  const batteryConfig = await loadBatteryConfig(db);
  const retailPricing = await loadRetailPricingConfig(db);
  const energyCharged = actualEnergyUnitsForUsage(
    'voice_call',
    batteryConfig,
    undefined,
    providerCostMicrousd ?? undefined,
    retailPricing
  );

  const costCalculatedAt = new Date().toISOString();
  await updateInferenceRunEconomics(db, runId, {
    usageEstimated,
    providerCostMicrousd,
    costConfidence,
    pricingVersion: pricing.catalogVersion,
    pricingEntryId: pricing.pricingEntryIds.join(',') || null,
    costCalculatedAt,
    costBreakdownJson: JSON.stringify({
      lines: pricing.lines,
      totalMicrousd: providerCostMicrousd,
      pricingEntryIds: pricing.pricingEntryIds,
      pricingVersion: pricing.catalogVersion,
      durationMs,
      estimateSource: 'session_duration',
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
    undefined,
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
