import { defaultCostEngine } from '../billing/cost-engine';
import { loadRetailPricingConfig } from '../billing/retail-pricing';
import { resolveChatRoute, streamChatWithRouter } from './model-router';
import { formatCleanErrorMessage } from '../lib/errors';
import { logEvent } from '../lib/structured-log';
import { mergeProviderUsage } from '../providers/provider-result';
import {
  createInferenceRun,
  findInferenceRunByClientRequest,
  markInferenceRunCompleted,
  markInferenceRunFailed,
  markInferenceRunStreaming,
  resetInferenceRunForRetry,
  updateInferenceRunEconomics,
  type InferenceRunRecord,
} from '../repositories/inference-run-repository';
import {
  getMessageById,
  getRecentMessagesForContext,
  insertPersonaMessage,
  insertUserMessage,
} from '../repositories/message-repository';
import { getConversationForUser, touchConversation } from '../repositories/conversation-repository';
import { getPersonaVersion } from '../repositories/persona-repository';
import {
  actualEnergyUnitsForUsage,
  BatteryEmptyError,
  releaseEnergyForInference,
  reserveEnergyForInference,
  settleEnergyForInference,
} from './energy-service';
import { loadBatteryConfig } from '../billing/battery-config';
import { buildMemoryContextBlocks } from './memory-service';
import { scheduleMemoryExtraction } from './memory-job-service';
import { touchPersonaRelationship } from './persona-relationship-service';
import { resolveCompiledInstructions } from './persona-compiler';
import { PersonaNotFoundError } from './persona-service';
import type { PersonyEnv } from '../types/env';

export class ConversationAccessError extends Error {
  readonly status = 403;
  constructor() {
    super('Conversation access denied');
    this.name = 'ConversationAccessError';
  }
}

export class InferenceInProgressError extends Error {
  readonly status = 409;
  constructor() {
    super('Inference already in progress for this request');
    this.name = 'InferenceInProgressError';
  }
}

function extractTextFromSseChunk(chunk: string, onText: (text: string) => void): void {
  const blocks = chunk.split('\n\n');
  for (const block of blocks) {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        const payload = JSON.parse(line.slice(6)) as { text?: string };
        if (payload.text) onText(payload.text);
      } catch {
        // ignore malformed event
      }
    }
  }
}

function applyModelTextToLatestUserTurn(
  history: Array<{ sender: string; text: string }>,
  modelText?: string
): Array<{ sender: string; text: string }> {
  if (!modelText?.trim()) return history;

  for (let i = history.length - 1; i >= 0; i--) {
    if (history[i].sender === 'user') {
      const next = [...history];
      next[i] = { ...next[i], text: modelText.trim() };
      return next;
    }
  }
  return history;
}

function sseEncode(payload: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`);
}

async function replayCompletedInference(
  db: D1Database,
  run: InferenceRunRecord
): Promise<ReadableStream<Uint8Array>> {
  const personaMessage = run.personaMessageId
    ? await getMessageById(db, run.personaMessageId)
    : null;

  return new ReadableStream({
    start(controller) {
      controller.enqueue(sseEncode({ status: 'started', reused: true }));
      if (personaMessage?.text) {
        controller.enqueue(sseEncode({ text: personaMessage.text }));
      }
      controller.enqueue(
        sseEncode({
          done: true,
          personaMessageId: run.personaMessageId,
          inferenceRunId: run.id,
        })
      );
      controller.close();
    },
  });
}

async function executeInferenceStream(
  env: PersonyEnv,
  run: InferenceRunRecord,
  userMessageId: string,
  userMessageText: string,
  systemPrompt: string,
  history: Array<{ sender: string; text: string }>,
  personaId: string,
  executionCtx?: Pick<ExecutionContext, 'waitUntil'>
): Promise<ReadableStream<Uint8Array>> {
  const db = env.DB!;
  await markInferenceRunStreaming(db, run.id, userMessageId);

  const startedAt = Date.now();
  const inputContext = history.map((m) => m.text).join('\n') + userMessageText;
  const { stream: upstream, meta } = await streamChatWithRouter(env, {
    systemPrompt,
    messages: history,
  });
  const personaMessageKey = `persona:${run.clientRequestId}`;

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(sseEncode({ status: 'started', inferenceRunId: run.id }));

      const reader = upstream.getReader();
      const decoder = new TextDecoder();
      let sseBuffer = '';
      let accumulated = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!value) continue;

          controller.enqueue(value);

          sseBuffer += decoder.decode(value, { stream: true });
          let boundary = sseBuffer.indexOf('\n\n');
          while (boundary !== -1) {
            const block = sseBuffer.slice(0, boundary);
            sseBuffer = sseBuffer.slice(boundary + 2);
            extractTextFromSseChunk(`${block}\n\n`, (t) => {
              accumulated += t;
            });
            boundary = sseBuffer.indexOf('\n\n');
          }
        }

        if (accumulated.trim()) {
          const latencyMs = Date.now() - startedAt;
          const { usage, usageEstimated } = mergeProviderUsage(
            inputContext,
            accumulated
          );
          const cost = defaultCostEngine.computeProviderCost({
            provider: meta.actualProvider,
            model: meta.actualModel,
            usage,
            usageEstimated,
          });

          const personaMessage = await insertPersonaMessage(
            db,
            run.conversationId,
            personaId,
            accumulated.trim(),
            personaMessageKey
          );
          await markInferenceRunCompleted(db, run.id, personaMessage.id);
          await touchConversation(db, run.conversationId);

          const batteryConfig = await loadBatteryConfig(db);
          const retailPricing = await loadRetailPricingConfig(db);
          const knownCostMicrousd = cost.providerCostMicrousd ?? undefined;
          const energyCharged = actualEnergyUnitsForUsage(
            'text_chat',
            batteryConfig,
            { input: usage.inputTokens, output: usage.outputTokens },
            knownCostMicrousd,
            retailPricing
          );

          await settleEnergyForInference(
            db,
            run.userId,
            run.id,
            'text_chat',
            { input: usage.inputTokens, output: usage.outputTokens },
            knownCostMicrousd
          );

          const costCalculatedAt = new Date().toISOString();
          await updateInferenceRunEconomics(db, run.id, {
            actualProvider: meta.actualProvider,
            actualModel: meta.actualModel,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            usageEstimated,
            providerCostMicrousd: cost.providerCostMicrousd,
            costConfidence: cost.costConfidence,
            pricingVersion: cost.pricingVersion,
            pricingEntryId: cost.pricingEntryId,
            costCalculatedAt,
            costBreakdownJson: JSON.stringify({
              lines: cost.costLines,
              totalMicrousd: cost.providerCostMicrousd,
              pricingEntryIds: cost.pricingEntryId?.split(',').filter(Boolean) ?? [],
              pricingVersion: cost.pricingVersion,
            }),
            energyCharged,
            latencyMs,
            fallbackCount: meta.fallbackCount,
            fallbackReason: meta.fallbackReason,
          });

          scheduleMemoryExtraction(env, db, executionCtx, {
            userId: run.userId,
            personaId,
            conversationId: run.conversationId,
            userMessageId,
            userText: userMessageText,
            assistantText: accumulated.trim(),
          });

          logEvent('inference.completed', {
            inferenceRunId: run.id,
            provider: meta.actualProvider,
            model: meta.actualModel,
            requestedProvider: meta.requestedProvider,
            requestedModel: meta.requestedModel,
            latencyMs,
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
            usageEstimated,
            providerCostMicrousd: cost.providerCostMicrousd,
            fallbackCount: meta.fallbackCount,
          });

          controller.enqueue(
            sseEncode({
              done: true,
              personaMessageId: personaMessage.id,
              inferenceRunId: run.id,
            })
          );
        } else {
          await markInferenceRunFailed(db, run.id, 'empty_model_response');
          await releaseEnergyForInference(db, run.userId, run.id, 'empty_model_response');
          controller.enqueue(sseEncode({ error: 'Пустой ответ модели' }));
        }

        controller.close();
      } catch (err) {
        const clean = formatCleanErrorMessage(err);
        await markInferenceRunFailed(db, run.id, clean);
        await releaseEnergyForInference(db, run.userId, run.id, clean);
        logEvent('inference.failed', {
          inferenceRunId: run.id,
          errorCode: clean,
        });
        controller.enqueue(sseEncode({ error: clean }));
        controller.close();
      }
    },
  });
}

export async function streamConversationReply(
  env: PersonyEnv,
  userId: string,
  conversationId: string,
  text: string,
  clientRequestId?: string,
  modelText?: string,
  executionCtx?: Pick<ExecutionContext, 'waitUntil'>
): Promise<ReadableStream<Uint8Array>> {
  if (!env.DB) throw new Error('Database not configured');
  if (!clientRequestId?.trim()) {
    throw new Error('clientRequestId is required');
  }

  const conversation = await getConversationForUser(env.DB, conversationId, userId);
  if (!conversation?.personaId || conversation.personaVersion == null) {
    throw new ConversationAccessError();
  }

  const persona = await getPersonaVersion(
    env,
    env.DB,
    conversation.personaId,
    conversation.personaVersion,
    userId
  );
  if (!persona?.systemPrompt?.trim()) {
    throw new PersonaNotFoundError(conversation.personaId);
  }

  const existingRun = await findInferenceRunByClientRequest(
    env.DB,
    conversationId,
    clientRequestId
  );

  if (existingRun?.status === 'completed') {
    return replayCompletedInference(env.DB, existingRun);
  }

  if (existingRun && (existingRun.status === 'pending' || existingRun.status === 'streaming')) {
    throw new InferenceInProgressError();
  }

  const userMessage = await insertUserMessage(
    env.DB,
    conversationId,
    userId,
    text,
    clientRequestId
  );
  await touchConversation(env.DB, conversationId);

  const chatRoute = await resolveChatRoute(env);

  let run = existingRun;
  if (!run) {
    run = await createInferenceRun(env.DB, {
      userId,
      conversationId,
      clientRequestId,
      personaId: persona.id,
      personaVersion: conversation.personaVersion,
      provider: chatRoute.provider,
      model: chatRoute.model,
    });
  } else if (existingRun?.status === 'failed') {
    await resetInferenceRunForRetry(env.DB, existingRun.id);
    run = (await findInferenceRunByClientRequest(env.DB, conversationId, clientRequestId))!;
  }

  const tokenHint = { input: Math.ceil(text.length / 4) };
  const reservation = await reserveEnergyForInference(
    env.DB,
    userId,
    run.id,
    'text_chat',
    tokenHint
  );
  await updateInferenceRunEconomics(env.DB, run.id, {
    energyReserved: reservation.reservedUnits,
    requestedProvider: chatRoute.provider,
    requestedModel: chatRoute.model,
  });

  void touchPersonaRelationship(env.DB, userId, persona.id).catch(() => undefined);

  const memoryBlocks = await buildMemoryContextBlocks(
    env.DB,
    userId,
    persona.id,
    text
  );

  const compiledPrompt = resolveCompiledInstructions(
    persona.configurationJson,
    persona.name,
    persona.systemPrompt,
    {
      userMemoryBlock: memoryBlocks.userBlock,
      relationshipMemoryBlock: memoryBlocks.relationshipBlock,
    }
  );

  const history = applyModelTextToLatestUserTurn(
    await getRecentMessagesForContext(env.DB, conversationId, 10),
    modelText
  );

  return executeInferenceStream(
    env,
    run,
    userMessage.id,
    text,
    compiledPrompt,
    history,
    persona.id,
    executionCtx
  );
}

export { BatteryEmptyError };
