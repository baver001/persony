import { getConversationForUser } from '../repositories/conversation-repository';
import { getRecentMessagesForContext } from '../repositories/message-repository';
import { getPersonaVersion } from '../repositories/persona-repository';
import { ConversationAccessError } from './chat-service';
import { buildMemoryContextBlocks } from './memory-service';
import { resolveCompiledInstructions } from './persona-compiler';
import { PersonaNotFoundError, resolvePersonaForInference } from './persona-service';
import type { PersonaRuntime } from '../domain/persona';
import type { PersonyEnv } from '../types/env';

export type LiveConversationContext = {
  persona: PersonaRuntime;
  compiledSystemPrompt: string;
  recentChatContext: Array<{ sender: string; text: string }>;
};

export async function resolveLiveConversationContext(
  env: PersonyEnv,
  userId: string,
  personaId: string,
  conversationId?: string
): Promise<LiveConversationContext> {
  if (!env.DB) throw new Error('Database not configured');

  if (!conversationId?.trim()) {
    const persona = await resolvePersonaForInference(env, personaId, userId);
    const compiledSystemPrompt = resolveCompiledInstructions(
      persona.configurationJson,
      persona.name,
      persona.systemPrompt
    );
    return { persona, compiledSystemPrompt, recentChatContext: [] };
  }

  const conversation = await getConversationForUser(env.DB, conversationId, userId);
  if (!conversation?.personaId || conversation.personaId !== personaId) {
    throw new ConversationAccessError();
  }
  if (conversation.personaVersion == null) {
    throw new ConversationAccessError();
  }

  const persona = await getPersonaVersion(
    env,
    env.DB,
    conversation.personaId,
    conversation.personaVersion,
    userId
  );
  if (!persona?.systemPrompt?.trim()) {
    throw new PersonaNotFoundError(conversation.personaId);
  }

  const recentChatContext = await getRecentMessagesForContext(env.DB, conversationId, 6);
  const latestUserText =
    [...recentChatContext].reverse().find((m) => m.sender === 'user')?.text ?? '';
  const memoryBlocks = await buildMemoryContextBlocks(
    env.DB,
    userId,
    persona.id,
    latestUserText
  );
  const compiledSystemPrompt = resolveCompiledInstructions(
    persona.configurationJson,
    persona.name,
    persona.systemPrompt,
    {
      userMemoryBlock: memoryBlocks.userBlock,
      relationshipMemoryBlock: memoryBlocks.relationshipBlock,
    }
  );

  return { persona, compiledSystemPrompt, recentChatContext };
}
