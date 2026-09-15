import type { ConversationRecord } from '../domain/conversation';
import { createConversation, findDirectConversationByPersona } from '../repositories/conversation-repository';
import { createMessage } from '../repositories/message-repository';
import {
  createPersonaInDb,
  generatePersonaId,
  getPersonaById,
} from '../repositories/persona-repository';

export type LegacyPersona = {
  id: string;
  name: string;
  tagline?: string;
  description?: string;
  systemPrompt: string;
  avatar?: string;
  voice?: string;
  category?: string;
  badge?: string;
  color?: string;
  starterMessages?: string[];
  isCustom?: boolean;
};

export type LegacyMessage = {
  id: string;
  characterId: string;
  sender: 'user' | 'character' | 'system';
  text: string;
  timestamp: number;
};

export type LegacyImportPayload = {
  personas: LegacyPersona[];
  messagesByPersona: Record<string, LegacyMessage[]>;
};

export type LegacyImportResult = {
  personaIdMap: Record<string, string>;
  conversationIdMap: Record<string, string>;
  importedPersonas: number;
  importedMessages: number;
  skipped: boolean;
};

export async function importLegacyData(
  db: D1Database,
  userId: string,
  payload: LegacyImportPayload,
  alreadyImported: boolean
): Promise<LegacyImportResult> {
  if (alreadyImported) {
    return {
      personaIdMap: {},
      conversationIdMap: {},
      importedPersonas: 0,
      importedMessages: 0,
      skipped: true,
    };
  }

  const personaIdMap: Record<string, string> = {};
  const conversationIdMap: Record<string, string> = {};
  let importedPersonas = 0;
  let importedMessages = 0;

  const customPersonas = payload.personas.filter((p) => p.isCustom);

  for (const legacy of customPersonas) {
    const record = await createPersonaInDb(db, userId, {
      name: legacy.name,
      tagline: legacy.tagline || '',
      description: legacy.description || '',
      systemPrompt: legacy.systemPrompt,
      avatarUrl: legacy.avatar || '',
      voice: legacy.voice || 'Puck',
      category: legacy.category || 'custom',
      badge: legacy.badge,
      color: legacy.color,
      starterMessages: legacy.starterMessages,
      visibility: 'private',
    });
    personaIdMap[legacy.id] = record.id;
    importedPersonas += 1;
  }

  for (const [legacyPersonaId, messages] of Object.entries(payload.messagesByPersona)) {
    const cloudPersonaId = personaIdMap[legacyPersonaId] ?? legacyPersonaId;
    const persona = await getPersonaById(db, cloudPersonaId, userId);
    if (!persona) continue;

    let conversation: ConversationRecord | null = await findDirectConversationByPersona(
      db,
      userId,
      cloudPersonaId
    );

    if (!conversation) {
      conversation = await createConversation(db, userId, cloudPersonaId, persona.currentVersion);
    }

    conversationIdMap[legacyPersonaId] = conversation.id;

    const sorted = [...messages].sort((a, b) => a.timestamp - b.timestamp);
    for (const msg of sorted) {
      if (msg.sender === 'system') continue;

      const stableId = `imp_${userId}_${msg.id}`;
      const existing = await db.prepare('SELECT id FROM messages WHERE id = ?').bind(stableId).first();
      if (existing) continue;

      await createMessage(db, {
        id: stableId,
        conversationId: conversation.id,
        senderType: msg.sender === 'character' ? 'persona' : 'user',
        senderUserId: msg.sender === 'user' ? userId : null,
        senderPersonaId: msg.sender === 'character' ? cloudPersonaId : null,
        text: msg.text,
      });

      importedMessages += 1;
    }
  }

  return {
    personaIdMap,
    conversationIdMap,
    importedPersonas,
    importedMessages,
    skipped: false,
  };
}
