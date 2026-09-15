export type ProviderUsage = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  audioInputSeconds: number;
  audioOutputSeconds: number;
  toolCostMicrousd: number;
};

export type ChatMessageInput = {
  sender: 'user' | 'character';
  text: string;
};

export type AIProviderId = 'gemini' | 'deepseek';

export type AIOperation = 'chat' | 'transcribe' | 'generate' | 'live';

export interface AIProvider {
  id: AIProviderId;
  chatStream(
    systemPrompt: string,
    messages: ChatMessageInput[],
    options?: { model?: string }
  ): Promise<ReadableStream<Uint8Array>>;
  generateStructured?(
    prompt: string,
    options?: { model?: string }
  ): Promise<Record<string, unknown>>;
  transcribe?(
    audioBase64: string,
    mimeType?: string
  ): Promise<{ transcript: string; usage?: ProviderUsage }>;
}

export type InferenceResultMeta = {
  provider: AIProviderId;
  model: string;
  operation: AIOperation;
  usage: ProviderUsage;
};
