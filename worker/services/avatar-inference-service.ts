import { resolveCostConfidence } from '../billing/cost-confidence';
import { computePerImageCost } from '../billing/pricing-catalog';
import { loadRetailPricingConfig } from '../billing/retail-pricing';
import { GEMINI_AVATAR_IMAGE_MODELS } from '../lib/models';
import { handleGenerateAvatar } from '../lib/gemini';
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

export type AvatarInferenceInput = {
  prompt: string;
  personaName?: string;
  personaId: string;
  clientRequestId: string;
};

async function resolvePersonaVersion(db: D1Database, personaId: string): Promise<number> {
  const row = await db
    .prepare(`SELECT current_version FROM personas WHERE id = ? LIMIT 1`)
    .bind(personaId)
    .first<{ current_version: number }>();
  return row?.current_version ?? 1;
}

export async function runAvatarWithInference(
  db: D1Database,
  userId: string,
  apiKey: string,
  input: AvatarInferenceInput
): Promise<{ imageDataUrl: string; inferenceRunId: string }> {
  const conversationId = `avatar:${userId}:${input.personaId}`;
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
      model: GEMINI_AVATAR_IMAGE_MODELS[0],
      operationType: 'avatar_generation',
    }));

  const reservation = await reserveEnergyForInference(db, userId, run.id, 'avatar_generation');
  await updateInferenceRunEconomics(db, run.id, {
    energyReserved: reservation.reservedUnits,
    requestedProvider: provider,
    requestedModel: GEMINI_AVATAR_IMAGE_MODELS[0],
    actualProvider: provider,
    actualModel: GEMINI_AVATAR_IMAGE_MODELS[0],
  });

  try {
    const result = await handleGenerateAvatar(apiKey, input.prompt, input.personaName);
    const model = result.model ?? GEMINI_AVATAR_IMAGE_MODELS[0];
    const pricing = computePerImageCost({ provider, model, imageCount: 1 });
    const priced = pricing.priced && pricing.totalMicrousd > 0;
    const usageEstimated = priced ? false : Boolean(result.usageEstimated);
    const providerCostMicrousd = priced ? pricing.totalMicrousd : null;
    const costConfidence = resolveCostConfidence({
      providerCostMicrousd,
      usageEstimated,
      priced,
    });

    const tokenHint = {
      input: result.usage?.inputTokens,
      output: result.usage?.outputTokens,
    };
    const batteryConfig = await loadBatteryConfig(db);
    const retailPricing = await loadRetailPricingConfig(db);
    const energyCharged = actualEnergyUnitsForUsage(
      'avatar_generation',
      batteryConfig,
      tokenHint,
      providerCostMicrousd ?? undefined,
      retailPricing
    );

    const costCalculatedAt = new Date().toISOString();
    await updateInferenceRunEconomics(db, run.id, {
      actualModel: model,
      inputTokens: result.usage?.inputTokens ?? null,
      outputTokens: result.usage?.outputTokens ?? null,
      cachedInputTokens: result.usage?.cachedInputTokens ?? null,
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
        imageCount: 1,
      }),
      energyCharged,
      latencyMs: result.latencyMs,
    });

    await markInferenceRunCompleted(db, run.id, null);
    await settleEnergyForInference(
      db,
      userId,
      run.id,
      'avatar_generation',
      tokenHint,
      providerCostMicrousd ?? undefined
    );

    return { imageDataUrl: result.imageDataUrl, inferenceRunId: run.id };
  } catch (err) {
    const errorCode = err instanceof Error ? err.name : 'AVATAR_GENERATION_FAILED';
    await markInferenceRunFailed(db, run.id, errorCode);
    await releaseEnergyForInference(db, userId, run.id, errorCode);
    throw err;
  }
}
