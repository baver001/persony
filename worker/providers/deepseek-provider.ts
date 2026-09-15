import { formatCleanErrorMessage } from '../lib/errors';
import type { AIProvider, ChatMessageInput, ProviderUsage } from './types';

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

export class DeepSeekProvider implements AIProvider {
  readonly id = 'deepseek' as const;

  constructor(private readonly apiKey: string) {}

  async chatStream(
    systemPrompt: string,
    messages: ChatMessageInput[],
    options?: { model?: string }
  ): Promise<ReadableStream<Uint8Array>> {
    const model = options?.model || DEFAULT_MODEL;
    const body = {
      model,
      stream: true,
      temperature: 0.85,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map((m) => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text,
        })),
      ],
    };

    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '');
      throw new Error(errText || `DeepSeek error ${response.status}`);
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = response.body.getReader();

    return new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const payload = trimmed.slice(5).trim();
              if (payload === '[DONE]') continue;

              try {
                const parsed = JSON.parse(payload) as {
                  choices?: Array<{ delta?: { content?: string } }>;
                };
                const text = parsed.choices?.[0]?.delta?.content;
                if (text) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                }
              } catch {
                // skip malformed chunk
              }
            }
          }
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: formatCleanErrorMessage(error) })}\n\n`)
          );
          controller.close();
        } finally {
          reader.releaseLock();
        }
      },
    });
  }

  async generateStructured(prompt: string): Promise<Record<string, unknown>> {
    const response = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek generate error ${response.status}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content || '{}';
    return JSON.parse(content) as Record<string, unknown>;
  }

  estimateUsage(inputText: string, outputText: string): ProviderUsage {
    return {
      inputTokens: Math.ceil(inputText.length / 4),
      cachedInputTokens: 0,
      outputTokens: Math.ceil(outputText.length / 4),
      audioInputSeconds: 0,
      audioOutputSeconds: 0,
      toolCostMicrousd: 0,
    };
  }

  static defaultModel(): string {
    return DEFAULT_MODEL;
  }
}
