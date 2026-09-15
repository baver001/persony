import type { ConversationRecord, MessageRecord } from '../domain/conversation';
import {
  createConversation,
  findDirectConversationByPersona,
  getConversationById,
} from '../repositories/conversation-repository';
import {
  createMessage,
  getRecentMessagesForInference,
  listMessages,
} from '../repositories/message-repository';
import { getPersonaById } from '../repositories/persona-repository';
import { PersonaNotFoundError } from './persona-service';

export class ConversationNotFoundError extends Error {
  readonly status = 404;
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = 'ConversationNotFoundError';
  }
}

export async function getOrCreateDirectConversation(
  db: D1Database,
  userId: string,
  personaId: string
): Promise<ConversationRecord> {
  const existing = await findDirectConversationByPersona(db, userId, personaId);
  if (existing) return existing;

  const persona = await getPersonaById(db, personaId, userId);
  if (!persona) throw new PersonaNotFoundError(personaId);

  return createConversation(db, userId, personaId, persona.currentVersion);
}

export async function assertConversationOwner(
  db: D1Database,
  conversationId: string,
  userId: string
): Promise<ConversationRecord> {
  const conversation = await getConversationById(db, conversationId, userId);
  if (!conversation) throw new ConversationNotFoundError(conversationId);
  return conversation;
}

export async function persistUserMessage(
  db: D1Database,
  conversationId: string,
  userId: string,
  text: string
): Promise<MessageRecord> {
  return createMessage(db, {
    conversationId,
    senderType: 'user',
    senderUserId: userId,
    text,
  });
}

export async function persistPersonaMessage(
  db: D1Database,
  conversationId: string,
  personaId: string,
  text: string
): Promise<MessageRecord> {
  return createMessage(db, {
    conversationId,
    senderType: 'persona',
    senderPersonaId: personaId,
    text,
  });
}

export async function loadConversationMessages(
  db: D1Database,
  conversationId: string,
  userId: string,
  limit = 50
): Promise<MessageRecord[]> {
  await assertConversationOwner(db, conversationId, userId);
  return listMessages(db, conversationId, limit);
}

export async function buildInferenceMessages(
  db: D1Database,
  conversationId: string,
  userId: string,
  limit = 20
): Promise<Array<{ sender: 'user' | 'character'; text: string }>> {
  await assertConversationOwner(db, conversationId, userId);
  const messages = await getRecentMessagesForInference(db, conversationId, limit);
  return messages.map((m) => ({
    sender: m.senderType === 'persona' ? 'character' : 'user',
    text: m.text,
  }));
}
