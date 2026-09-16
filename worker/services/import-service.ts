import type { z } from 'zod';
import type { localImportSchema } from '../lib/validation';
import {
  createDirectConversation,
  findDirectConversationByPersona,
  touchConversation,
} from '../repositories/conversation-repository';
import { insertPersonaMessage, insertUserMessage } from '../repositories/message-repository';
import {
  createPersonaInDb,
  findPersonaBySlugForOwner,
} from '../repositories/persona-repository';

export type ImportResult = {
  personaIdMap: Record<string, string>;
  conversationIdMap: Record<string, string>;
};

function legacyPersonaSlug(localId: string): string {
  return `legacy_v1_${localId}`;
}

export async function importLocalV1(
  db: D1Database,
  userId: string,
  payload: z.infer<typeof localImportSchema>
): Promise<ImportResult> {
  const personaIdMap: Record<string, string> = {};
  const conversationIdMap: Record<string, string> = {};

  for (const p of payload.personas) {
    const slug = legacyPersonaSlug(p.localId);
    const existing = await findPersonaBySlugForOwner(db, userId, slug);
    if (existing) {
      personaIdMap[p.localId] = existing.id;
      continue;
    }

    const created = await createPersonaInDb(
      db,
      userId,
      {
        name: p.name,
        tagline: p.tagline,
        description: p.description,
        systemPrompt: p.systemPrompt,
        avatarUrl: p.avatarUrl,
        voice: p.voice,
        category: p.category,
        badge: p.badge,
        color: p.color,
        starterMessages: p.starterMessages,
        visibility: 'private',
      },
      { slug }
    );
    personaIdMap[p.localId] = created.id;
  }

  for (const conv of payload.conversations) {
    const cloudPersonaId = personaIdMap[conv.localPersonaId];
    if (!cloudPersonaId) continue;

    let conversation = await findDirectConversationByPersona(db, userId, cloudPersonaId);
    if (!conversation) {
      conversation = await createDirectConversation(db, userId, cloudPersonaId, 1);
    }

    conversationIdMap[conv.localPersonaId] = conversation.id;

    for (const msg of conv.messages) {
      if (msg.sender === 'user') {
        await insertUserMessage(db, conversation.id, userId, msg.text, `import:${msg.localId}`);
      } else {
        await insertPersonaMessage(db, conversation.id, cloudPersonaId, msg.text);
      }
    }

    await touchConversation(db, conversation.id);
  }

  return { personaIdMap, conversationIdMap };
}
