export type MemoryScope = 'user' | 'persona_relationship' | 'room';
export type MemoryKind =
  | 'fact'
  | 'preference'
  | 'goal'
  | 'project'
  | 'decision'
  | 'relationship'
  | 'summary'
  | 'open_task';

export type MemoryRecord = {
  id: string;
  userId: string;
  personaId: string | null;
  conversationId: string | null;
  scope: MemoryScope;
  kind: MemoryKind;
  content: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
};

type MemoryRow = {
  id: string;
  user_id: string;
  persona_id: string | null;
  conversation_id: string | null;
  scope: string;
  kind: string;
  content: string;
  confidence: number;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    personaId: row.persona_id,
    conversationId: row.conversation_id,
    scope: row.scope as MemoryScope,
    kind: row.kind as MemoryKind,
    confidence: row.confidence,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMemories(
  db: D1Database,
  userId: string,
  filter?: { scope?: MemoryScope; personaId?: string; conversationId?: string }
): Promise<MemoryRecord[]> {
  let query = `SELECT * FROM memories WHERE user_id = ?`;
  const binds: (string | number)[] = [userId];

  if (filter?.scope) {
    query += ` AND scope = ?`;
    binds.push(filter.scope);
  }
  if (filter?.personaId) {
    query += ` AND persona_id = ?`;
    binds.push(filter.personaId);
  }
  if (filter?.conversationId) {
    query += ` AND conversation_id = ?`;
    binds.push(filter.conversationId);
  }

  query += ` ORDER BY updated_at DESC LIMIT 100`;

  const { results } = await db.prepare(query).bind(...binds).all<MemoryRow>();
  return (results ?? []).map(rowToRecord);
}

export async function upsertMemory(
  db: D1Database,
  input: {
    userId: string;
    scope: MemoryScope;
    kind: MemoryKind;
    content: string;
    personaId?: string;
    conversationId?: string;
    confidence?: number;
    sourceMessageIds?: string[];
  }
): Promise<MemoryRecord> {
  const existing = await db
    .prepare(
      `SELECT id FROM memories WHERE user_id = ? AND scope = ? AND kind = ? AND content = ? LIMIT 1`
    )
    .bind(input.userId, input.scope, input.kind, input.content)
    .first<{ id: string }>();

  const now = new Date().toISOString();

  if (existing) {
    await db
      .prepare(`UPDATE memories SET confidence = ?, updated_at = ? WHERE id = ?`)
      .bind(input.confidence ?? 1, now, existing.id)
      .run();
    const row = await db.prepare('SELECT * FROM memories WHERE id = ?').bind(existing.id).first<MemoryRow>();
    return rowToRecord(row!);
  }

  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO memories (id, user_id, persona_id, conversation_id, scope, kind, content, confidence, source_message_ids, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      input.userId,
      input.personaId ?? null,
      input.conversationId ?? null,
      input.scope,
      input.kind,
      input.content,
      input.confidence ?? 0.8,
      input.sourceMessageIds ? JSON.stringify(input.sourceMessageIds) : null,
      now,
      now
    )
    .run();

  const row = await db.prepare('SELECT * FROM memories WHERE id = ?').bind(id).first<MemoryRow>();
  return rowToRecord(row!);
}

export async function deleteMemory(db: D1Database, userId: string, memoryId: string): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM memories WHERE id = ? AND user_id = ?')
    .bind(memoryId, userId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getMemoryContext(
  db: D1Database,
  userId: string,
  personaId?: string,
  conversationId?: string
): Promise<string> {
  const userMemories = await listMemories(db, userId, { scope: 'user' });
  const relationshipMemories = personaId
    ? await listMemories(db, userId, { scope: 'persona_relationship', personaId })
    : [];
  const roomMemories = conversationId
    ? await listMemories(db, userId, { scope: 'room', conversationId })
    : [];

  const lines: string[] = [];
  for (const m of [...userMemories, ...relationshipMemories, ...roomMemories].slice(0, 20)) {
    lines.push(`- [${m.kind}] ${m.content}`);
  }
  return lines.length ? `[MEMORY CONTEXT]\n${lines.join('\n')}` : '';
}
