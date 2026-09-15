import { createConversation, getConversationById } from '../repositories/conversation-repository';
import { createMessage, listMessages } from '../repositories/message-repository';
import { getPersonaById } from '../repositories/persona-repository';
import { buildAugmentedSystemPrompt } from './memory-service';
import { runChatInference } from './inference-service';
import type { PersonyEnv } from '../types/env';

export type RoomPersonaRef = { personaId: string; role?: string };

export async function createRoom(
  db: D1Database,
  ownerUserId: string,
  title: string,
  personas: RoomPersonaRef[]
): Promise<string> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO conversations (id, owner_user_id, type, title, persona_id, created_at, updated_at, last_message_at)
       VALUES (?, ?, 'room', ?, NULL, ?, ?, NULL)`
    )
    .bind(id, ownerUserId, title, now, now)
    .run();

  for (const p of personas) {
    const persona = await getPersonaById(db, p.personaId, ownerUserId);
    if (!persona) continue;
    await db
      .prepare(
        `INSERT INTO conversation_personas (conversation_id, persona_id, persona_version, role, added_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind(id, p.personaId, persona.currentVersion, p.role || 'participant', now)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO room_settings (conversation_id, max_agents, max_turns, max_cost_microusd, orchestrator_enabled)
       VALUES (?, 3, 2, 500000, 1)`
    )
    .bind(id)
    .run();

  return id;
}

export async function listRoomPersonas(
  db: D1Database,
  conversationId: string
): Promise<Array<{ personaId: string; role: string }>> {
  const { results } = await db
    .prepare(
      `SELECT persona_id, role FROM conversation_personas WHERE conversation_id = ?`
    )
    .bind(conversationId)
    .all<{ persona_id: string; role: string }>();

  return (results ?? []).map((r) => ({ personaId: r.persona_id, role: r.role }));
}

export function parseMentions(text: string, personaIds: string[]): string[] {
  const mentioned: string[] = [];
  const lower = text.toLowerCase();
  for (const id of personaIds) {
    if (lower.includes(`@${id.toLowerCase()}`)) mentioned.push(id);
  }
  return mentioned;
}

export async function handleRoomMessage(
  env: PersonyEnv,
  input: {
    userId: string;
    conversationId: string;
    text: string;
    askTeam?: boolean;
  }
): Promise<ReadableStream<Uint8Array> | { messages: Array<{ personaId: string; text: string }> }> {
  if (!env.DB) throw new Error('Database required');

  const conversation = await getConversationById(env.DB, input.conversationId, input.userId);
  if (!conversation || conversation.type !== 'room') {
    throw new Error('Room not found');
  }

  const roomPersonas = await listRoomPersonas(env.DB, input.conversationId);
  const personaIds = roomPersonas.map((p) => p.personaId);

  let targets: string[] = [];
  if (input.askTeam) {
    targets = personaIds.slice(0, 3);
  } else {
    const mentions = parseMentions(input.text, personaIds);
    targets = mentions.length > 0 ? mentions.slice(0, 1) : personaIds.slice(0, 1);
  }

  await createMessage(env.DB, {
    conversationId: input.conversationId,
    senderType: 'user',
    senderUserId: input.userId,
    text: input.text,
  });

  const history = await listMessages(env.DB, input.conversationId, 15);
  const historyInput = history.map((m) => ({
    sender: m.senderType === 'persona' ? 'character' as const : 'user' as const,
    text: m.text,
  }));

  if (targets.length === 1) {
    const persona = await getPersonaById(env.DB, targets[0], input.userId);
    if (!persona) throw new Error('Persona not found');

    const systemPrompt = await buildAugmentedSystemPrompt(
      env,
      input.userId,
      persona.systemPrompt,
      persona.id,
      input.conversationId
    );

    return runChatInference(env, {
      userId: input.userId,
      systemPrompt,
      messages: historyInput,
      conversationId: input.conversationId,
      personaId: persona.id,
    });
  }

  const responses: Array<{ personaId: string; text: string }> = [];
  for (const personaId of targets) {
    const persona = await getPersonaById(env.DB, personaId, input.userId);
    if (!persona) continue;

    const systemPrompt = await buildAugmentedSystemPrompt(
      env,
      input.userId,
      `[ROOM TEAM MODE] Отвечай кратко как ${persona.name}.\n${persona.systemPrompt}`,
      persona.id,
      input.conversationId
    );

    const stream = await runChatInference(env, {
      userId: input.userId,
      systemPrompt,
      messages: [...historyInput, { sender: 'user', text: input.text }],
      conversationId: input.conversationId,
      personaId: persona.id,
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let text = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6)) as { text?: string };
          if (data.text) text += data.text;
        } catch {
          // ignore
        }
      }
    }

    if (text.trim()) {
      await createMessage(env.DB, {
        conversationId: input.conversationId,
        senderType: 'persona',
        senderPersonaId: personaId,
        text: text.trim(),
      });
      responses.push({ personaId, text: text.trim() });
    }
  }

  return { messages: responses };
}
