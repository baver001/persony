import { getSystemSetting } from '../repositories/settings-repository';
import { deepseekChatProvider } from '../providers/deepseek-chat-provider';
import { geminiChatProvider } from '../providers/gemini-chat-provider';
import type { ProviderRouteMeta } from '../providers/provider-result';
import type { ChatProvider, ChatProviderId, ChatStreamRequest } from '../providers/chat-types';
import { classifyProviderError, shouldFallbackToNextModel } from '../lib/provider-errors';
import type { PersonyEnv } from '../types/env';

export type ChatRoutingMode = 'google' | 'deepseek' | 'auto';

export type ResolvedChatRoute = {
  primary: ChatProvider;
  fallbacks: ChatProvider[];
  provider: ChatProviderId;
  model: string;
};

const PROVIDERS: ChatProvider[] = [geminiChatProvider, deepseekChatProvider];

function providerById(id: ChatProviderId): ChatProvider | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export async function resolveChatRoute(env: PersonyEnv): Promise<ResolvedChatRoute> {
  const mode =
    env.DB
      ? ((await getSystemSetting(env.DB, 'chat_text_provider')) as ChatRoutingMode | null)
      : null;

  const routing: ChatRoutingMode =
    mode === 'deepseek' || mode === 'auto' || mode === 'google' ? mode : 'google';

  const available = PROVIDERS.filter((p) => p.isAvailable(env));
  const google = providerById('google');
  const deepseek = providerById('deepseek');

  if (routing === 'deepseek' && deepseek?.isAvailable(env)) {
    return {
      primary: deepseek,
      fallbacks: google?.isAvailable(env) ? [google] : [],
      provider: 'deepseek',
      model: deepseek.defaultModel,
    };
  }

  if (routing === 'auto') {
    const primary = google?.isAvailable(env) ? google : deepseek;
    if (!primary) {
      throw new Error('No chat provider configured');
    }
    const fallbacks = available.filter((p) => p.id !== primary.id);
    return {
      primary,
      fallbacks,
      provider: primary.id,
      model: primary.defaultModel,
    };
  }

  if (!google?.isAvailable(env)) {
    if (deepseek?.isAvailable(env)) {
      return {
        primary: deepseek,
        fallbacks: [],
        provider: 'deepseek',
        model: deepseek.defaultModel,
      };
    }
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return {
    primary: google,
    fallbacks: deepseek?.isAvailable(env) ? [deepseek] : [],
    provider: 'google',
    model: google.defaultModel,
  };
}

async function streamWithProvider(
  env: PersonyEnv,
  provider: ChatProvider,
  request: ChatStreamRequest
): Promise<ReadableStream<Uint8Array>> {
  return provider.streamChat(
    { GEMINI_API_KEY: env.GEMINI_API_KEY, DEEPSEEK_API_KEY: env.DEEPSEEK_API_KEY },
    request
  );
}

function isProviderStreamError(chunk: Uint8Array): string | null {
  const text = new TextDecoder().decode(chunk);
  if (!text.includes('"error"')) return null;
  for (const block of text.split('\n\n')) {
    for (const line of block.split('\n')) {
      if (!line.startsWith('data: ')) continue;
      try {
        const payload = JSON.parse(line.slice(6)) as { error?: string };
        if (payload.error) return payload.error;
      } catch {
        // ignore
      }
    }
  }
  return null;
}

export type RoutedChatStream = {
  stream: ReadableStream<Uint8Array>;
  route: ResolvedChatRoute;
  meta: ProviderRouteMeta;
};

export async function streamChatWithRouter(
  env: PersonyEnv,
  request: ChatStreamRequest
): Promise<RoutedChatStream> {
  const route = await resolveChatRoute(env);
  const candidates = [route.primary, ...route.fallbacks];
  const requestedProvider = route.provider;
  const requestedModel = route.model;
  const attemptedProviders: ChatProviderId[] = [];
  const attemptedModels: string[] = [];

  let lastError: unknown = null;
  let fallbackCount = 0;
  let fallbackReason: string | undefined;

  for (let i = 0; i < candidates.length; i++) {
    const provider = candidates[i];
    attemptedProviders.push(provider.id);
    attemptedModels.push(provider.defaultModel);

    try {
      const upstream = await streamWithProvider(env, provider, request);
      const resolvedRoute: ResolvedChatRoute = {
        primary: provider,
        fallbacks: candidates.slice(i + 1),
        provider: provider.id,
        model: provider.defaultModel,
      };

      const meta: ProviderRouteMeta = {
        requestedProvider,
        requestedModel,
        actualProvider: provider.id,
        actualModel: provider.defaultModel,
        fallbackCount,
        fallbackReason,
        attemptedProviders: [...attemptedProviders],
        attemptedModels: [...attemptedModels],
      };

      if (i === candidates.length - 1) {
        return { stream: upstream, route: resolvedRoute, meta };
      }

      const reader = upstream.getReader();
      const first = await reader.read();
      if (first.done) {
        return { stream: upstream, route: resolvedRoute, meta };
      }

      const errMsg = first.value ? isProviderStreamError(first.value) : null;
      if (!errMsg) {
        const combined = new ReadableStream<Uint8Array>({
          async start(controller) {
            if (first.value) controller.enqueue(first.value);
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) controller.enqueue(value);
            }
            controller.close();
          },
        });
        return { stream: combined, route: resolvedRoute, meta };
      }

      lastError = new Error(errMsg);
      const kind = classifyProviderError(lastError);
      if (!shouldFallbackToNextModel(kind, false)) {
        return { stream: upstream, route: resolvedRoute, meta };
      }

      fallbackCount += 1;
      fallbackReason = errMsg;
    } catch (err) {
      lastError = err;
      const kind = classifyProviderError(err);
      if (!shouldFallbackToNextModel(kind, false) || i === candidates.length - 1) {
        throw err;
      }
      fallbackCount += 1;
      fallbackReason = err instanceof Error ? err.message : String(err);
    }
  }

  throw lastError ?? new Error('Chat routing failed');
}
