import { handleChat } from '../lib/gemini';
import {
  getRecentMessagesForContext,
  insertPersonaMessage,
  insertUserMessage,
} from '../repositories/message-repository';
import { getConversationForUser, touchConversation } from '../repositories/conversation-repository';
import { getAccessiblePersona } from '../repositories/persona-repository';
import { PersonaNotFoundError } from './persona-service';
import type { PersonyEnv } from '../types/env';

export class ConversationAccessError extends Error {
  readonly status = 403;
  constructor() {
    super('Conversation access denied');
    this.name = 'ConversationAccessError';
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

export async function streamConversationReply(
  env: PersonyEnv,
  userId: string,
  conversationId: string,
  text: string,
  idempotencyKey?: string
): Promise<ReadableStream<Uint8Array>> {
  if (!env.DB) throw new Error('Database not configured');

  const conversation = await getConversationForUser(env.DB, conversationId, userId);
  if (!conversation?.personaId) throw new ConversationAccessError();

  const persona = await getAccessiblePersona(env, env.DB, conversation.personaId, userId);
  if (!persona?.systemPrompt?.trim()) throw new PersonaNotFoundError(conversation.personaId);

  await insertUserMessage(env.DB, conversationId, userId, text, idempotencyKey);
  await touchConversation(env.DB, conversationId);

  const history = await getRecentMessagesForContext(env.DB, conversationId, 10);
  const upstream = await handleChat(env.GEMINI_API_KEY, persona.systemPrompt, history);

  const db = env.DB;
  const personaId = persona.id;

  return new ReadableStream({
    async start(controller) {
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
          await insertPersonaMessage(db, conversationId, personaId, accumulated.trim());
          await touchConversation(db, conversationId);
        }

        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });
}
