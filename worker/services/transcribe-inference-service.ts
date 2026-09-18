import { defaultCostEngine } from '../billing/cost-engine';
import { loadRetailPricingConfig } from '../billing/retail-pricing';
import { GEMINI_TRANSCRIBE_MODELS } from '../lib/models';
import { handleTranscribe } from '../lib/gemini';
import { mergeProviderUsage } from '../providers/provider-result';
import {
  createInferenceRun,
  findInferenceRunByClientRequest,
  markInferenceRunCompleted,
  markInferenceRunFailed,
  updateInferenceRunEconomics,
} from '../repositories/inference-run-repository';
import { loadBatteryConfig } from '../billing/battery-config';
import {
  actualEnergyUnitsForUsage,
  releaseEnergyForInference,
  reserveEnergyForInference,
  settleEnergyForInference,
} from './energy-service';

export type TranscribeInferenceInput = {
  audioBase64: string;
  mimeType?: string;
  personaId: string;
  clientRequestId: string;
  conversationId?: string;
};

async function resolvePersonaVersion(db: D1Database, personaId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT current_version FROM personas WHERE id = ? LIMIT 1`)
    .bind(personaId)
    .first<{ current_version: number }>();
  return row?.current_version ?? 1;
}

export async function runTranscribeWithInference(
  db: D1Database,
  userId: string,
  apiKey: string,
  input: TranscribeInferenceInput
): Promise<{ transcript: string; inferenceRunId: string }> {
  const conversationId =
    input.conversationId?.trim() || `transcribe:${userId}:${input.personaId}`;
  const clientRequestId = input.clientRequestId;
  const personaVersion = await resolvePersonaVersion(db, input.personaId);
  const provider = 'google';

  const existing = await findInferenceRunByClientRequest(db, conversationId, clientRequestId);
  const run =
    existing ??
    (await createInferenceRun(db, {
      userId,
      conversationId,
      clientRequestId,
      personaId: input.personaId,
      personaVersion,
      provider,
      model: GEMINI_TRANSCRIBE_MODELS[0],
      operationType: 'voice_transcription',
    }));

  const reservation = await reserveEnergyForInference(db, userId, run.id, 'voice_transcription');
  await updateInferenceRunEconomics(db, run.id, {
    energyReserved: reservation.reservedUnits,
    requestedProvider: provider,
    requestedModel: GEMINI_TRANSCRIBE_MODELS[0],
    actualProvider: provider,
    actualModel: GEMINI_TRANSCRIBE_MODELS[0],
  });

  try {
    const result = await handleTranscribe(apiKey, input.audioBase64, input.mimeType);
    const model = result.model ?? GEMINI_TRANSCRIBE_MODELS[0];
    const merged = mergeProviderUsage('', result.transcript, result.usage);
    const cost = defaultCostEngine.computeProviderCost({
      provider,
      model,
      usage: merged.usage,
      usageEstimated: merged.usageEstimated,
    });

    const batteryConfig = await loadBatteryConfig(db);
    const retailPricing = await loadRetailPricingConfig(db);
    const tokenHint = {
      input: merged.usage.inputTokens,
      output: merged.usage.outputTokens,
    };
    const energyCharged = actualEnergyUnitsForUsage(
      'voice_transcription',
      batteryConfig,
      tokenHint,
      cost.providerCostMicrousd ?? undefined,
      retailPricing
    );

    const costCalculatedAt = new Date().toISOString();
    await updateInferenceRunEconomics(db, run.id, {
      actualModel: model,
      inputTokens: merged.usage.inputTokens ?? null,
      outputTokens: merged.usage.outputTokens ?? null,
      cachedInputTokens: merged.usage.cachedInputTokens ?? null,
      usageEstimated: cost.usageEstimated,
      providerCostMicrousd: cost.providerCostMicrousd,
      costConfidence: cost.costConfidence,
      pricingVersion: cost.pricingVersion,
      pricingEntryId: cost.pricingEntryId,
      costCalculatedAt,
      costBreakdownJson: JSON.stringify({
        lines: cost.costLines,
        totalMicrousd: cost.providerCostMicrousd,
        pricingEntryIds: cost.pricingEntryId?.split(',') ?? [],
        pricingVersion: cost.pricingVersion,
      }),
      energyCharged,
      latencyMs: result.latencyMs,
    });

    await markInferenceRunCompleted(db, run.id, null);
    await settleEnergyForInference(
      db,
      userId,
      run.id,
      'voice_transcription',
      tokenHint,
      cost.providerCostMicrousd ?? undefined
    );

    return { transcript: result.transcript, inferenceRunId: run.id };
  } catch (err) {
    const errorCode = err instanceof Error ? err.name : 'TRANSCRIBE_FAILED';
    await markInferenceRunFailed(db, run.id, errorCode);
    await releaseEnergyForInference(db, userId, run.id, errorCode);
    throw err;
  }
}
