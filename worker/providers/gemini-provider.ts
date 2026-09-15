import type { AIProvider, ChatMessageInput, ProviderUsage } from './types';
import {
  handleChat,
  handleGenerateCharacter,
  handleTranscribe,
  getAIClient,
  streamGeminiWithFallback,
} from '../lib/gemini';
import { GEMINI_CHAT_MODELS, GEMINI_GENERATOR_MODELS } from '../lib/models';
import { formatCleanErrorMessage } from '../lib/errors';

export class GeminiProvider implements AIProvider {
  readonly id = 'gemini' as const;

  constructor(private readonly apiKey: string) {}

  async chatStream(
    systemPrompt: string,
    messages: ChatMessageInput[],
    options?: { model?: string }
  ): Promise<ReadableStream<Uint8Array>> {
    if (!options?.model) {
      return handleChat(
        this.apiKey,
        systemPrompt,
        messages.map((m) => ({ sender: m.sender, text: m.text }))
      );
    }

    const ai = getAIClient(this.apiKey);
    const contents = messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

    const encoder = new TextEncoder();
    return new ReadableStream({
      async start(controller) {
        try {
          await streamGeminiWithFallback(
            ai,
            contents,
            {
              systemInstruction: systemPrompt,
              temperature: 0.85,
            },
            (text) => {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          );
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: formatCleanErrorMessage(error) })}\n\n`)
          );
          controller.close();
        }
      },
    });
  }

  async generateStructured(prompt: string): Promise<Record<string, unknown>> {
    return handleGenerateCharacter(this.apiKey, prompt);
  }

  async transcribe(audioBase64: string, mimeType?: string) {
    const result = await handleTranscribe(this.apiKey, audioBase64, mimeType);
    const usage: ProviderUsage = {
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: Math.ceil((result.transcript?.length ?? 0) / 4),
      audioInputSeconds: 30,
      audioOutputSeconds: 0,
      toolCostMicrousd: 0,
    };
    return { ...result, usage };
  }

  static defaultChatModel(): string {
    return GEMINI_CHAT_MODELS[0];
  }

  static defaultGeneratorModel(): string {
    return GEMINI_GENERATOR_MODELS[0];
  }
}
