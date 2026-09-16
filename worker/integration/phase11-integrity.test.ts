import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleChat } from '../lib/gemini';
import { createDirectConversation, getConversationForUser, softDeleteConversation } from '../repositories/conversation-repository';
import { listMessages } from '../repositories/message-repository';
import { createPersonaInDb, getPersonaVersion } from '../repositories/persona-repository';
import { importLocalV1 } from '../services/import-service';
import { ConversationAccessError, streamConversationReply } from '../services/chat-service';
import { resolveLiveConversationContext } from '../services/live-context-service';
import { createTestD1 } from '../test/sqlite-d1';
import type { PersonyEnv } from '../types/env';

vi.mock('../lib/gemini', () => ({
  handleChat: vi.fn(),
  initLiveSession: vi.fn(),
}));

const migrationsDir = join(process.cwd(), 'worker/db/migrations');
const userId = 'user_test_1';

function mockChatStream(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`));
      controller.close();
    },
  });
}

async function consumeStream(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let body = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    body += decoder.decode(value, { stream: true });
  }
  return body;
}

async function seedPersona(db: D1Database, systemPrompt = 'You are Test Persona') {
  return createPersonaInDb(
    db,
    userId,
    {
      name: 'Test Persona',
      tagline: 'test',
      description: 'test',
      systemPrompt,
      avatarUrl: 'https://example.com/a.png',
      voice: 'Puck',
      category: 'custom',
      visibility: 'private',
    },
    { slug: 'test-persona' }
  );
}

describe('Phase 1.1 integrity', () => {
  let db: D1Database;
  let env: PersonyEnv;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
    env = { GEMINI_API_KEY: 'test-key', ENVIRONMENT: 'development', DB: db };
    vi.mocked(handleChat).mockReset();
  });

  it('same clientRequestId does not duplicate user or persona messages', async () => {
    vi.mocked(handleChat).mockResolvedValue(mockChatStream('Answer one'));

    const persona = await seedPersona(db);
    const conversation = await createDirectConversation(db, userId, persona.id, persona.currentVersion);
    const clientRequestId = 'req_same_1';

    await consumeStream(
      await streamConversationReply(
        env,
        userId,
        conversation.id,
        'Hello',
        clientRequestId
      )
    );

    await consumeStream(
      await streamConversationReply(
        env,
        userId,
        conversation.id,
        'Hello',
        clientRequestId
      )
    );

    const messages = await listMessages(db, conversation.id, 100);
    expect(messages.filter((m) => m.senderType === 'user')).toHaveLength(1);
    expect(messages.filter((m) => m.senderType === 'persona')).toHaveLength(1);
    expect(vi.mocked(handleChat)).toHaveBeenCalledTimes(1);
  });

  it('replays completed inference without a second model call', async () => {
    vi.mocked(handleChat).mockResolvedValue(mockChatStream('Stable answer'));

    const persona = await seedPersona(db);
    const conversation = await createDirectConversation(db, userId, persona.id, persona.currentVersion);
    const clientRequestId = 'req_replay_1';

    await consumeStream(
      await streamConversationReply(env, userId, conversation.id, 'Hello', clientRequestId)
    );

    vi.mocked(handleChat).mockClear();

    const replayBody = await consumeStream(
      await streamConversationReply(env, userId, conversation.id, 'Hello', clientRequestId)
    );

    expect(vi.mocked(handleChat)).not.toHaveBeenCalled();
    expect(replayBody).toContain('Stable answer');
    expect(replayBody).toContain('"reused":true');
  });

  it('failed inference retry reuses clientRequestId without duplicate user message', async () => {
    vi.mocked(handleChat)
      .mockResolvedValueOnce(mockChatStream(''))
      .mockResolvedValueOnce(mockChatStream('Recovered answer'));

    const persona = await seedPersona(db);
    const conversation = await createDirectConversation(db, userId, persona.id, persona.currentVersion);
    const clientRequestId = 'req_retry_1';

    await consumeStream(
      await streamConversationReply(env, userId, conversation.id, 'Hello retry', clientRequestId)
    );

    await consumeStream(
      await streamConversationReply(env, userId, conversation.id, 'Hello retry', clientRequestId)
    );

    const messages = await listMessages(db, conversation.id, 100);
    expect(messages.filter((m) => m.senderType === 'user')).toHaveLength(1);
    expect(messages.filter((m) => m.senderType === 'persona')).toHaveLength(1);
    expect(messages.find((m) => m.senderType === 'persona')?.text).toBe('Recovered answer');
    expect(vi.mocked(handleChat)).toHaveBeenCalledTimes(2);
  });

  it('import twice produces identical message counts', async () => {
    const payload = {
      schemaVersion: 1 as const,
      personas: [
        {
          localId: 'local_p1',
          name: 'Imported',
          tagline: '',
          description: '',
          systemPrompt: 'Imported prompt',
          avatarUrl: 'https://example.com/a.png',
          voice: 'Puck',
          category: 'custom',
        },
      ],
      conversations: [
        {
          localPersonaId: 'local_p1',
          messages: [
            { localId: 'm1', sender: 'user' as const, text: 'Hi' },
            { localId: 'm2', sender: 'character' as const, text: 'Hello' },
          ],
        },
      ],
    };

    await importLocalV1(db, userId, payload);
    await importLocalV1(db, userId, payload);

    const messageRows = await db.prepare(`SELECT COUNT(*) as count FROM messages`).all<{ count: number }>();
    expect(messageRows.results?.[0]?.count).toBe(2);

    const personaRows = await db
      .prepare(`SELECT COUNT(*) as count FROM personas WHERE owner_user_id = ?`)
      .bind(userId)
      .all<{ count: number }>();
    expect(personaRows.results?.[0]?.count).toBe(1);

    const conversationRows = await db
      .prepare(`SELECT COUNT(*) as count FROM conversations WHERE owner_user_id = ?`)
      .bind(userId)
      .all<{ count: number }>();
    expect(conversationRows.results?.[0]?.count).toBe(1);
  });

  it('soft-deleted conversation is unavailable for owner queries', async () => {
    const persona = await seedPersona(db);
    const conversation = await createDirectConversation(db, userId, persona.id, persona.currentVersion);

    const deleted = await softDeleteConversation(db, conversation.id, userId);
    expect(deleted).toBe(true);

    const loaded = await getConversationForUser(db, conversation.id, userId);
    expect(loaded).toBeNull();
  });

  it('pins persona version for inference and live context', async () => {
    const persona = await seedPersona(db, 'Version one prompt');
    const conversation = await createDirectConversation(db, userId, persona.id, 1);

    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO persona_versions (id, persona_id, version, system_prompt, configuration_json, created_at)
         VALUES (?, ?, 2, ?, NULL, ?)`
      )
      .bind(`${persona.id}_v2`, persona.id, 'Version two prompt', now)
      .run();
    await db
      .prepare(`UPDATE personas SET current_version = 2, updated_at = ? WHERE id = ?`)
      .bind(now, persona.id)
      .run();

    const pinned = await getPersonaVersion(env, db, persona.id, 1, userId);
    expect(pinned?.systemPrompt).toBe('Version one prompt');

    const liveContext = await resolveLiveConversationContext(
      env,
      userId,
      persona.id,
      conversation.id
    );
    expect(liveContext.persona.systemPrompt).toBe('Version one prompt');
  });

  it('denies live context for foreign conversation', async () => {
    const persona = await seedPersona(db);
    const conversation = await createDirectConversation(db, userId, persona.id, persona.currentVersion);

    await expect(
      resolveLiveConversationContext(env, 'other_user', persona.id, conversation.id)
    ).rejects.toBeInstanceOf(ConversationAccessError);
  });

  it('message pagination returns non-overlapping pages', async () => {
    const persona = await seedPersona(db);
    const conversation = await createDirectConversation(db, userId, persona.id, persona.currentVersion);

    for (let i = 0; i < 12; i++) {
      await db
        .prepare(
          `INSERT INTO messages (id, conversation_id, sender_type, sender_user_id, sender_persona_id, text, created_at, idempotency_key)
           VALUES (?, ?, 'user', ?, NULL, ?, ?, NULL)`
        )
        .bind(`msg_${i}`, conversation.id, userId, `Message ${i}`, new Date(Date.now() + i * 1000).toISOString())
        .run();
    }

    const page1 = await listMessages(db, conversation.id, 5);
    const page2 = await listMessages(db, conversation.id, 5, page1[0]?.id);

    const ids1 = new Set(page1.map((m) => m.id));
    for (const message of page2) {
      expect(ids1.has(message.id)).toBe(false);
    }
  });
});
