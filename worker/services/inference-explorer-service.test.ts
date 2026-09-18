import { describe, expect, it } from 'vitest';
import type { InferenceRunRecord } from '../repositories/inference-run-repository';
import { buildCostExplanation } from './inference-explorer-service';

function sampleRun(overrides: Partial<InferenceRunRecord> = {}): InferenceRunRecord {
  return {
    id: 'run-1',
    userId: 'user-1',
    conversationId: 'conv-1',
    clientRequestId: 'req-1',
    userMessageId: 'msg-u',
    personaMessageId: 'msg-p',
    personaId: 'persona-1',
    personaVersion: 1,
    status: 'completed',
    provider: 'google',
    model: 'gemini-3.8-flash',
    operationType: 'chat_text',
    requestedProvider: 'google',
    requestedModel: 'gemini-3.8-flash',
    actualProvider: 'google',
    actualModel: 'gemini-3.8-flash',
    inputTokens: 1000,
    outputTokens: 500,
    cachedInputTokens: 0,
    usageEstimated: false,
    providerCostMicrousd: 450_000,
    costConfidence: 'actual',
    pricingVersion: '2026-09-18-v2',
    pricingEntryId: 'gemini-3.8-flash:text_input:default,gemini-3.8-flash:text_output:default',
    costCalculatedAt: '2026-09-18T12:00:00.000Z',
    costBreakdownJson: null,
    energyReserved: 10,
    energyCharged: 5,
    latencyMs: 1200,
    fallbackCount: 0,
    fallbackReason: null,
    providerRequestId: null,
    startedAt: '2026-09-18T12:00:00.000Z',
    completedAt: '2026-09-18T12:00:01.000Z',
    errorCode: null,
    ...overrides,
  };
}

describe('buildCostExplanation', () => {
  it('uses persisted breakdown when available', () => {
    const run = sampleRun({
      costBreakdownJson: JSON.stringify({
        lines: [
          {
            pricingEntryId: 'gemini-3.8-flash:text_input:default',
            dimension: 'text_input',
            units: 1000,
            priceMicrousdPerUnit: 150_000,
            costMicrousd: 150,
            pricingTier: 'default',
            timeRule: 'any',
          },
        ],
        totalMicrousd: 150,
        pricingEntryIds: ['gemini-3.8-flash:text_input:default'],
        pricingVersion: '2026-09-18-v2',
      }),
    });

    const explanation = buildCostExplanation(run);
    expect(explanation.explainable).toBe(true);
    expect(explanation.recomputed).toBe(false);
    expect(explanation.lines).toHaveLength(1);
    expect(explanation.totalMicrousd).toBe(150);
  });

  it('recomputes from usage for legacy rows', () => {
    const explanation = buildCostExplanation(sampleRun());
    expect(explanation.explainable).toBe(true);
    expect(explanation.recomputed).toBe(true);
    expect(explanation.totalMicrousd).toBeGreaterThan(0);
    expect(explanation.lines.length).toBeGreaterThanOrEqual(2);
  });

  it('returns not explainable for unpriced runs', () => {
    const explanation = buildCostExplanation(
      sampleRun({ costConfidence: 'unpriced', providerCostMicrousd: null, inputTokens: null })
    );
    expect(explanation.explainable).toBe(false);
    expect(explanation.totalMicrousd).toBeNull();
  });
});
