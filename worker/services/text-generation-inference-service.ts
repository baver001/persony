import type { InferenceOperation } from '../ai/operations';
import { defaultCostEngine } from '../billing/cost-engine';
import { loadMergedPricingCatalog } from '../repositories/pricing-catalog-repository';
import { loadRetailPricingConfig } from '../billing/retail-pricing';
import {
  handleGenerateCharacter,
  handleSummarizeCall,
  type CharacterGenerateResult,
  type TextGenerationResult,
} from '../lib/gemini';
import { GEMINI_GENERATOR_MODELS } from '../lib/models';
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

export const PERSONA_DRAFT_INFERENCE_ID = '__persona_draft__';

type SummarizeCallInput = {
  personaName: string;
  personaTagline?: string;
  systemPrompt?: string;
  durationSecs: number;
  locale?: string;
  transcripts: Array<{ sender: 'user' | 'character'; text: string }>;
};

type TextInferenceContext = {
  conversationId: string;
  clientRequestId: string;
  personaId: string;
  personaVersion?: number;
};

async function resolvePersonaVersion(db: D1Database, personaId: string): Promise<number> {
  if (personaId === PERSONA_DRAFT_INFERENCE_ID) return 1;
  const row = await db
    .prepare(`SELECT current_version FROM personas WHERE id = ? LIMIT 1`)
    .bind(personaId)
    .first<{ current_version: number }>();
  return row?.current_version ?? 1;
}

async function runTokenInference<TPayload extends TextGenerationResult>(
  db: D1Database,
  userId: string,
  operationType: InferenceOperation,
  context: TextInferenceContext,
  inputText: string,
  execute: () => Promise<TPayload>,
  extractOutput: (result: TPayload) => string
): Promise<TPayload & { inferenceRunId: string }> {
  const personaVersion =
    context.personaVersion ?? (await resolvePersonaVersion(db, context.personaId));
  const provider = 'google';
  const defaultModel = GEMINI_GENERATOR_MODELS[0];

  const existing = await findInferenceRunByClientRequest(
    db,
    context.conversationId,
    context.clientRequestId
  );
  const run =
    existing ??
    (await createInferenceRun(db, {
      userId,
      conversationId: context.conversationId,
      clientRequestId: context.clientRequestId,
      personaId: context.personaId,
      personaVersion,
      provider,
      model: defaultModel,
      operationType,
    }));

  const pricingCatalogState = await loadMergedPricingCatalog(db);
  const reservation = await reserveEnergyForInference(db, userId, run.id, operationType);
  await updateInferenceRunEconomics(db, run.id, {
    energyReserved: reservation.reservedUnits,
    requestedProvider: provider,
    requestedModel: defaultModel,
    actualProvider: provider,
    actualModel: defaultModel,
  });

  try {
    const result = await execute();
    const model = result.model ?? defaultModel;
    const outputText = extractOutput(result);
    const merged = mergeProviderUsage(inputText, outputText, result.usage);
    const cost = defaultCostEngine.computeProviderCost({
      provider,
      model,
      usage: merged.usage,
      usageEstimated: merged.usageEstimated || result.usageEstimated,
      catalog: pricingCatalogState.entries,
      catalogVersion: pricingCatalogState.catalogVersion,
    });

    const batteryConfig = await loadBatteryConfig(db);
    const retailPricing = await loadRetailPricingConfig(db);
    const tokenHint = {
      input: merged.usage.inputTokens,
      output: merged.usage.outputTokens,
    };
    const energyCharged = actualEnergyUnitsForUsage(
      operationType,
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
      operationType,
      tokenHint,
      cost.providerCostMicrousd ?? undefined
    );

    return { ...result, inferenceRunId: run.id };
  } catch (err) {
    const errorCode = err instanceof Error ? err.name : `${operationType}_FAILED`;
    await markInferenceRunFailed(db, run.id, errorCode);
    await releaseEnergyForInference(db, userId, run.id, errorCode);
    throw err;
  }
}

export type PersonaGenerationInferenceInput = {
  prompt: string;
  clientRequestId: string;
  personaId?: string;
};

export async function runPersonaGenerationWithInference(
  db: D1Database,
  userId: string,
  apiKey: string,
  input: PersonaGenerationInferenceInput
): Promise<CharacterGenerateResult & { inferenceRunId: string }> {
  const personaId = input.personaId?.trim() || PERSONA_DRAFT_INFERENCE_ID;
  const conversationId = `persona-gen:${userId}:${personaId}`;
  const prompt = input.prompt.trim();

  return runTokenInference(
    db,
    userId,
    'persona_generation',
    {
      conversationId,
      clientRequestId: input.clientRequestId,
      personaId,
    },
    prompt,
    () => handleGenerateCharacter(apiKey, prompt),
    (result) => JSON.stringify(result.character)
  );
}

export type CallSummaryInferenceInput = SummarizeCallInput & {
  personaId: string;
  clientRequestId: string;
  conversationId?: string;
};

export async function runCallSummaryWithInference(
  db: D1Database,
  userId: string,
  apiKey: string,
  input: CallSummaryInferenceInput
): Promise<TextGenerationResult & { summary: string; inferenceRunId: string }> {
  const conversationId =
    input.conversationId?.trim() || `call-summary:${userId}:${input.personaId}`;

  const inputText = input.transcripts.map((t) => t.text).join('\n');

  return runTokenInference(
    db,
    userId,
    'call_summary',
    {
      conversationId,
      clientRequestId: input.clientRequestId,
      personaId: input.personaId,
    },
    inputText,
    () => handleSummarizeCall(apiKey, input),
    (result) => result.summary
  );
}
