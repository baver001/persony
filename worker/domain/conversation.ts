export type ConversationType = 'direct' | 'room';

export type ConversationRecord = {
  id: string;
  ownerUserId: string;
  type: ConversationType;
  title: string | null;
  personaId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

export type MessageRecord = {
  id: string;
  conversationId: string;
  senderType: 'user' | 'persona' | 'system';
  senderUserId: string | null;
  senderPersonaId: string | null;
  text: string;
  createdAt: string;
};

export type ConversationDTO = {
  id: string;
  type: ConversationType;
  title: string | null;
  personaId: string | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

export type MessageDTO = {
  id: string;
  conversationId: string;
  sender: 'user' | 'character' | 'system';
  text: string;
  createdAt: string;
};

export function toConversationDTO(record: ConversationRecord): ConversationDTO {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    personaId: record.personaId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    lastMessageAt: record.lastMessageAt,
  };
}

export function toMessageDTO(record: MessageRecord): MessageDTO {
  const sender =
    record.senderType === 'persona'
      ? 'character'
      : record.senderType === 'user'
        ? 'user'
        : 'system';

  return {
    id: record.id,
    conversationId: record.conversationId,
    sender,
    text: record.text,
    createdAt: record.createdAt,
  };
}
