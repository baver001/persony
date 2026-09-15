import type { ProviderUsage } from '../providers/types';
import type { AIOperation } from '../providers/types';
import { calculateCost } from './cost-engine';
import { debitEnergy } from './wallet-repository';

export async function recordUsageAndDebit(
  db: D1Database,
  input: {
    userId: string;
    conversationId?: string;
    personaId?: string;
    provider: string;
    model: string;
    operation: AIOperation;
    usage: ProviderUsage;
  }
): Promise<{ ok: boolean; usageEventId: string; energyUnits: number }> {
  const cost = calculateCost(input.provider, input.model, input.usage);
  const usageEventId = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO usage_events (
        id, user_id, conversation_id, persona_id, provider, model, operation,
        input_tokens, cached_input_tokens, output_tokens,
        audio_input_seconds, audio_output_seconds, tool_cost_microusd,
        provider_cost_microusd, retail_cost_microusd, energy_units, pricing_version, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      usageEventId,
      input.userId,
      input.conversationId ?? null,
      input.personaId ?? null,
      input.provider,
      input.model,
      input.operation,
      input.usage.inputTokens,
      input.usage.cachedInputTokens,
      input.usage.outputTokens,
      input.usage.audioInputSeconds,
      input.usage.audioOutputSeconds,
      input.usage.toolCostMicrousd,
      cost.providerCostMicrousd,
      cost.retailCostMicrousd,
      cost.energyUnits,
      cost.pricingVersion,
      now
    )
    .run();

  const ok = await debitEnergy(db, input.userId, cost.energyUnits, {
    providerCostMicrousd: cost.providerCostMicrousd,
    retailCostMicrousd: cost.retailCostMicrousd,
    usageEventId,
  });

  return { ok, usageEventId, energyUnits: cost.energyUnits };
}
