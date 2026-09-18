import { modelIdsTupleForOperation } from '../ai/model-registry';
import { formatCleanErrorMessage } from '../lib/errors';
import { classifyProviderError, shouldFallbackToNextModel } from '../lib/provider-errors';
import type { ChatProvider, ChatStreamRequest } from './chat-types';
import type { ProviderUsageMetrics } from './provider-result';
import { encodeProviderSse, mapDeepSeekUsage } from './stream-sse';

export const DEEPSEEK_CHAT_MODELS = modelIdsTupleForOperation(
  'deepseek',
  'chat_text',
  'deepseek-chat'
);
const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

const MESSENGER_FORMAT_HINT = `[ВАЖНО ДЛЯ ФОРМАТИРОВАНИЯ В МЕССЕНДЖЕРЕ]:
- Отвечай в стиле мессенджера Persony: лаконично, естественно, живым языком персонажа.
- Сохраняй характер, тон и словарный запас персонажа.
- Если сообщение — расшифровка голосового, отвечай так, будто только что услышал.
- Отвечай на языке собеседника (по умолчанию русский).
- Используй эмодзи и абзацы уместно.`;

function toOpenAiMessages(request: ChatStreamRequest) {
  const system = `${request.systemPrompt.trim() || 'You are a helpful AI character in a messenger.'}\n\n${MESSENGER_FORMAT_HINT}`;
  const turns = request.messages.map((m) => ({
    role: m.sender === 'user' ? 'user' : 'assistant',
    content: m.text,
  }));
  return [{ role: 'system', content: system }, ...turns];
}

async function streamDeepSeekModel(
  apiKey: string,
  model: string,
  request: ChatStreamRequest,
  onChunk: (text: string) => void
): Promise<ProviderUsageMetrics | undefined> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'persony-worker/1.0',
    },
    body: JSON.stringify({
      model,
      messages: toOpenAiMessages(request),
      temperature: 0.85,
      stream: true,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`DeepSeek ${response.status}: ${body.slice(0, 300)}`);
  }

  if (!response.body) {
    throw new Error('DeepSeek returned empty stream');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let reportedUsage: ProviderUsageMetrics | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let lineBreak = buffer.indexOf('\n');
    while (lineBreak !== -1) {
      const line = buffer.slice(0, lineBreak).trim();
      buffer = buffer.slice(lineBreak + 1);

      if (line.startsWith('data: ')) {
        const payload = line.slice(6);
        if (payload === '[DONE]') break;
        try {
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string } }>;
            usage?: {
              prompt_tokens?: number;
              completion_tokens?: number;
              total_tokens?: number;
              prompt_cache_hit_tokens?: number;
              prompt_cache_miss_tokens?: number;
            };
          };
          const text = parsed.choices?.[0]?.delta?.content;
          if (text) onChunk(text);
          if (parsed.usage) {
            reportedUsage = mapDeepSeekUsage(parsed.usage);
          }
        } catch {
          // ignore malformed chunk
        }
      }

      lineBreak = buffer.indexOf('\n');
    }
  }

  return reportedUsage;
}

export const deepseekChatProvider: ChatProvider = {
  id: 'deepseek',
  defaultModel: DEEPSEEK_CHAT_MODELS[0],

  isAvailable(env) {
    return Boolean(env.DEEPSEEK_API_KEY?.trim());
  },

  async streamChat(env, request: ChatStreamRequest) {
    const apiKey = env.DEEPSEEK_API_KEY!;
    const encoder = new TextEncoder();

    return new ReadableStream<Uint8Array>({
      async start(controller) {
        let streamedAny = false;
        let lastError: unknown = null;

        for (let i = 0; i < DEEPSEEK_CHAT_MODELS.length; i++) {
          const model = DEEPSEEK_CHAT_MODELS[i];
          try {
            const usage = await streamDeepSeekModel(apiKey, model, request, (text) => {
              streamedAny = true;
              controller.enqueue(encodeProviderSse({ text }));
            });
            controller.enqueue(encodeProviderSse({ done: true, model, usage }));
            controller.close();
            return;
          } catch (err) {
            lastError = err;
            const kind = classifyProviderError(err);
            if (!shouldFallbackToNextModel(kind, streamedAny)) break;
            if (i < DEEPSEEK_CHAT_MODELS.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 250));
              continue;
            }
            break;
          }
        }

        const clean = formatCleanErrorMessage(lastError ?? new Error('DeepSeek failed'));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: clean })}\n\n`));
        controller.close();
      },
    });
  },
};
