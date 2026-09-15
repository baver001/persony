import type { PersonyEnv } from '../types/env';
import type { ChatMessageInput, ProviderUsage } from '../providers/types';
import { ModelRouter } from '../providers/router';
import { estimateUsageFromText } from '../billing/cost-engine';
import { recordUsageAndDebit } from '../billing/usage-service';
import { formatCleanErrorMessage } from '../lib/errors';

export async function runChatInference(
  env: PersonyEnv,
  input: {
    userId: string;
    systemPrompt: string;
    messages: ChatMessageInput[];
    conversationId?: string;
    personaId?: string;
  }
): Promise<ReadableStream<Uint8Array>> {
  const router = new ModelRouter(env);
  const route = router.routeTextChat();
  const stream = await route.provider.chatStream(input.systemPrompt, input.messages, {
    model: route.model,
  });

  if (!env.DB) return stream;

  const [clientStream, teeStream] = stream.tee();
  const reader = teeStream.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';
  const inputText = input.messages.map((m) => m.text).join('\n');

  void (async () => {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6)) as { text?: string };
            if (data.text) accumulated += data.text;
          } catch {
            // ignore
          }
        }
      }

      const usage: ProviderUsage = estimateUsageFromText(inputText, accumulated);
      await recordUsageAndDebit(env.DB!, {
        userId: input.userId,
        conversationId: input.conversationId,
        personaId: input.personaId,
        provider: route.providerId,
        model: route.model,
        operation: 'chat',
        usage,
      });
    } catch (err) {
      console.error('Usage settlement failed:', err);
    } finally {
      reader.releaseLock();
    }
  })();

  return clientStream;
}

export async function runTranscribe(
  env: PersonyEnv,
  userId: string,
  audioBase64: string,
  mimeType?: string
): Promise<{ transcript: string }> {
  const router = new ModelRouter(env);
  const route = router.routeTranscribe();
  if (!route.provider.transcribe) {
    throw new Error('Transcribe not supported');
  }

  const result = await route.provider.transcribe(audioBase64, mimeType);
  const usage = result.usage ?? estimateUsageFromText('', result.transcript, 30);

  if (env.DB) {
    await recordUsageAndDebit(env.DB, {
      userId,
      provider: route.providerId,
      model: route.model,
      operation: 'transcribe',
      usage,
    });
  }

  return { transcript: result.transcript };
}

export async function runGenerateCharacter(
  env: PersonyEnv,
  userId: string,
  prompt: string
): Promise<Record<string, unknown>> {
  const router = new ModelRouter(env);
  const route = router.routeGenerate();
  if (!route.provider.generateStructured) {
    throw new Error('Generate not supported');
  }

  const result = await route.provider.generateStructured(prompt);
  const usage = estimateUsageFromText(prompt, JSON.stringify(result));

  if (env.DB) {
    await recordUsageAndDebit(env.DB, {
      userId,
      provider: route.providerId,
      model: route.model,
      operation: 'generate',
      usage,
    });
  }

  return result;
}

export function wrapStreamWithEnergyError(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  return stream;
}

export { formatCleanErrorMessage };
