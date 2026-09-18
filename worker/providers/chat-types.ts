export type ChatTurn = {
  sender: string;
  text: string;
};

export type ChatStreamRequest = {
  systemPrompt: string;
  messages: ChatTurn[];
};

export type ProviderUsage = {
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type ChatProviderId = 'google' | 'deepseek';

export interface ChatProvider {
  readonly id: ChatProviderId;
  readonly defaultModel: string;
  isAvailable(env: { GEMINI_API_KEY?: string; DEEPSEEK_API_KEY?: string }): boolean;
  streamChat(
    env: { GEMINI_API_KEY: string; DEEPSEEK_API_KEY?: string },
    request: ChatStreamRequest
  ): Promise<ReadableStream<Uint8Array>>;
}
