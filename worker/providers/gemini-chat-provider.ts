import { handleChat } from '../lib/gemini';
import { GEMINI_CHAT_MODELS } from '../lib/models';
import type { ChatProvider, ChatStreamRequest } from './chat-types';

export const geminiChatProvider: ChatProvider = {
  id: 'google',
  defaultModel: GEMINI_CHAT_MODELS[0] ?? 'gemini-3.8-flash',

  isAvailable(env) {
    return Boolean(env.GEMINI_API_KEY?.trim());
  },

  streamChat(env, request: ChatStreamRequest) {
    return handleChat(env.GEMINI_API_KEY, request.systemPrompt, request.messages);
  },
};
