import { getConversationForUser } from '../repositories/conversation-repository';
import { getRecentMessagesForContext } from '../repositories/message-repository';
import { getPersonaVersion } from '../repositories/persona-repository';
import { ConversationAccessError } from './chat-service';
import { PersonaNotFoundError, resolvePersonaForInference } from './persona-service';
import type { PersonaRecord } from '../domain/persona';
import type { PersonyEnv } from '../types/env';

export type LiveConversationContext = {
  persona: PersonaRecord;
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
    return { persona, recentChatContext: [] };
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

  return { persona, recentChatContext };
}
