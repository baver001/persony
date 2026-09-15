import type { PersonyEnv } from '../types/env';
import { DeepSeekProvider } from './deepseek-provider';
import { GeminiProvider } from './gemini-provider';
import type { AIProvider, AIOperation, AIProviderId } from './types';

export type RouteDecision = {
  provider: AIProvider;
  providerId: AIProviderId;
  model: string;
  operation: AIOperation;
};

export class ModelRouter {
  constructor(private readonly env: PersonyEnv) {}

  private gemini(): GeminiProvider {
    return new GeminiProvider(this.env.GEMINI_API_KEY);
  }

  private deepseek(): DeepSeekProvider | null {
    if (!this.env.DEEPSEEK_API_KEY) return null;
    return new DeepSeekProvider(this.env.DEEPSEEK_API_KEY);
  }

  routeTextChat(): RouteDecision {
    const preferDeepSeek = this.env.PERSONY_TEXT_PROVIDER === 'deepseek';
    const deepseek = this.deepseek();

    if (preferDeepSeek && deepseek) {
      return {
        provider: deepseek,
        providerId: 'deepseek',
        model: DeepSeekProvider.defaultModel(),
        operation: 'chat',
      };
    }

    if (!preferDeepSeek && deepseek && this.env.PERSONY_ENABLE_DEEPSEEK === 'true') {
      return {
        provider: deepseek,
        providerId: 'deepseek',
        model: DeepSeekProvider.defaultModel(),
        operation: 'chat',
      };
    }

    return {
      provider: this.gemini(),
      providerId: 'gemini',
      model: GeminiProvider.defaultChatModel(),
      operation: 'chat',
    };
  }

  routeTranscribe(): RouteDecision {
    return {
      provider: this.gemini(),
      providerId: 'gemini',
      model: 'gemini-transcribe',
      operation: 'transcribe',
    };
  }

  routeGenerate(): RouteDecision {
    const deepseek = this.deepseek();
    if (this.env.PERSONY_GENERATE_PROVIDER === 'deepseek' && deepseek) {
      return {
        provider: deepseek,
        providerId: 'deepseek',
        model: DeepSeekProvider.defaultModel(),
        operation: 'generate',
      };
    }
    return {
      provider: this.gemini(),
      providerId: 'gemini',
      model: GeminiProvider.defaultGeneratorModel(),
      operation: 'generate',
    };
  }

  routeLive(): RouteDecision {
    return {
      provider: this.gemini(),
      providerId: 'gemini',
      model: 'gemini-live',
      operation: 'live',
    };
  }
}
