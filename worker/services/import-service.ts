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

function importMessageKey(localId: string): string {
  return `import:local_v1:${localId}`;
}

export async function importLocalV1(
  db: D1Database,
  userId: string,
  payload: z.infer<typeof localImportSchema>
): Promise<ImportResult> {
  const personaIdMap: Record<string, string> = {};
  const conversationIdMap: Record<string, string> = {};

  const personaVersions: Record<string, number> = {};

  for (const p of payload.personas) {
    const slug = legacyPersonaSlug(p.localId);
    const existing = await findPersonaBySlugForOwner(db, userId, slug);
    if (existing) {
      personaIdMap[p.localId] = existing.id;
      personaVersions[p.localId] = existing.currentVersion;
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
    personaVersions[p.localId] = created.currentVersion;
  }

  for (const conv of payload.conversations) {
    const cloudPersonaId = personaIdMap[conv.localPersonaId];
    if (!cloudPersonaId) continue;

    const personaVersion = personaVersions[conv.localPersonaId] || 1;

    let conversation = await findDirectConversationByPersona(db, userId, cloudPersonaId);
    if (!conversation) {
      conversation = await createDirectConversation(db, userId, cloudPersonaId, personaVersion);
    }

    conversationIdMap[conv.localPersonaId] = conversation.id;

    for (const msg of conv.messages) {
      const messageKey = importMessageKey(msg.localId);
      if (msg.sender === 'user') {
        await insertUserMessage(db, conversation.id, userId, msg.text, messageKey);
      } else {
        await insertPersonaMessage(db, conversation.id, cloudPersonaId, msg.text, messageKey);
      }
    }

    await touchConversation(db, conversation.id);
  }

  return { personaIdMap, conversationIdMap };
}
