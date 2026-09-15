import { Hono } from 'hono';
import { chatRequestSchema } from '../lib/validation';
import { requireAIEntitlement, InsufficientEnergyError } from '../middleware/ai-entitlement';
import { AuthRequiredError } from '../middleware/auth';
import { touchConversation } from '../repositories/conversation-repository';
import {
  assertConversationOwner,
  buildInferenceMessages,
  getOrCreateDirectConversation,
  persistPersonaMessage,
  persistUserMessage,
} from '../services/conversation-service';
import { ConversationNotFoundError } from '../services/conversation-service';
import { PersonaNotFoundError, resolvePersonaForInference } from '../services/persona-service';
import { runChatInference } from '../services/inference-service';
import { buildAugmentedSystemPrompt, extractMemoriesFromExchange } from '../services/memory-service';
import type { PersonyEnv } from '../types/env';

export const chatRoutes = new Hono<{ Bindings: PersonyEnv }>();

chatRoutes.post('/chat', async (c) => {
  try {
    const userId = await requireAIEntitlement(c);

    const body = await c.req.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid chat payload', details: parsed.error.flatten() }, 400);
    }

    const { conversationId, personaId, text, messages } = parsed.data;

    if (conversationId && text && c.env.DB) {
      const conversation = await assertConversationOwner(c.env.DB, conversationId, userId);
      const resolvedPersonaId = conversation.personaId ?? personaId;
      if (!resolvedPersonaId) {
        return c.json({ error: 'Conversation has no linked persona' }, 400);
      }

      const persona = await resolvePersonaForInference(c.env, resolvedPersonaId, userId);
      await persistUserMessage(c.env.DB, conversationId, userId, text);
      const history = await buildInferenceMessages(c.env.DB, conversationId, userId);

      const systemPrompt = await buildAugmentedSystemPrompt(
        c.env,
        userId,
        persona.systemPrompt,
        resolvedPersonaId,
        conversationId
      );

      const stream = await runChatInference(c.env, {
        userId,
        systemPrompt,
        messages: history,
        conversationId,
        personaId: resolvedPersonaId,
      });

      return persistStreamResponse(c.env, stream, conversationId, resolvedPersonaId, userId, text);
    }

    if (!personaId || !messages?.length) {
      return c.json({ error: 'Provide conversationId+text or personaId+messages' }, 400);
    }

    const persona = await resolvePersonaForInference(c.env, personaId, userId);
    const normalizedMessages = messages.map((m) => ({
      sender: (m.sender === 'model' ? 'character' : m.sender) as 'user' | 'character',
      text: m.text,
    }));

    let convId = conversationId;
    if (c.env.DB) {
      const conversation = await getOrCreateDirectConversation(c.env.DB, userId, personaId);
      convId = conversation.id;
      const lastUser = normalizedMessages[normalizedMessages.length - 1];
      if (lastUser?.sender === 'user') {
        await persistUserMessage(c.env.DB, conversation.id, userId, lastUser.text);
      }
    }

    const systemPrompt = await buildAugmentedSystemPrompt(
      c.env,
      userId,
      persona.systemPrompt,
      personaId,
      convId
    );

    const stream = await runChatInference(c.env, {
      userId,
      systemPrompt,
      messages: normalizedMessages,
      conversationId: convId,
      personaId,
    });

    if (c.env.DB && convId) {
      const lastUser = normalizedMessages[normalizedMessages.length - 1];
      return persistStreamResponse(
        c.env,
        stream,
        convId,
        personaId,
        userId,
        lastUser?.text || ''
      );
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return c.json({ error: 'Authentication required' }, 401);
    }
    if (err instanceof InsufficientEnergyError) {
      return c.json({ error: err.message, code: 'energy_empty' }, 402);
    }
    if (err instanceof PersonaNotFoundError || err instanceof ConversationNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    throw err;
  }
});

function persistStreamResponse(
  env: PersonyEnv,
  stream: ReadableStream<Uint8Array>,
  conversationId: string,
  personaId: string,
  userId: string,
  userText: string
): Response {
  const [clientStream, teeStream] = stream.tee();
  const reader = teeStream.getReader();
  const decoder = new TextDecoder();
  let accumulated = '';

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
      if (accumulated.trim() && env.DB) {
        await persistPersonaMessage(env.DB, conversationId, personaId, accumulated.trim());
        await touchConversation(env.DB, conversationId);
        await extractMemoriesFromExchange(env, {
          userId,
          personaId,
          conversationId,
          userText,
          assistantText: accumulated.trim(),
        });
      }
    } catch (err) {
      console.error('Failed to persist assistant message:', err);
    } finally {
      reader.releaseLock();
    }
  })();

  return new Response(clientStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
