import { generateId } from '../lib/ids';

export type MemoryScope = 'user' | 'relationship' | 'room';
export type MemoryKind =
  | 'fact'
  | 'preference'
  | 'goal'
  | 'project'
  | 'decision'
  | 'instruction'
  | 'relationship'
  | 'summary'
  | 'open_task';
export type MemorySensitivity = 'normal' | 'sensitive' | 'special_category';
export type MemoryStatus = 'active' | 'disabled' | 'deleted';

export type MemoryRecord = {
  id: string;
  userId: string;
  personaId: string | null;
  roomId: string | null;
  conversationId: string | null;
  scope: MemoryScope;
  kind: MemoryKind;
  content: string;
  confidence: number;
  importance: number;
  sensitivity: MemorySensitivity;
  sourceMessageIds: string[];
  status: MemoryStatus;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
};

type MemoryRow = {
  id: string;
  user_id: string;
  persona_id: string | null;
  room_id: string | null;
  conversation_id: string | null;
  scope: string;
  kind: string;
  content: string;
  confidence: number;
  importance: number;
  sensitivity: string;
  source_message_ids: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
};

function rowToMemory(row: MemoryRow): MemoryRecord {
  return {
    id: row.id,
    userId: row.user_id,
    personaId: row.persona_id,
    roomId: row.room_id,
    conversationId: row.conversation_id,
    scope: row.scope as MemoryScope,
    kind: row.kind as MemoryKind,
    content: row.content,
    confidence: row.confidence,
    importance: row.importance,
    sensitivity: row.sensitivity as MemorySensitivity,
    sourceMessageIds: row.source_message_ids ? JSON.parse(row.source_message_ids) : [],
    status: row.status as MemoryStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastUsedAt: row.last_used_at,
  };
}

export async function insertMemory(
  db: D1Database,
  input: {
    userId: string;
    scope: MemoryScope;
    kind: MemoryKind;
    content: string;
    personaId?: string;
    roomId?: string;
    conversationId?: string;
    confidence?: number;
    importance?: number;
    sensitivity?: MemorySensitivity;
    sourceMessageIds?: string[];
  }
): Promise<MemoryRecord> {
  const id = generateId();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO memories (
        id, user_id, persona_id, room_id, conversation_id, scope, kind, content,
        confidence, importance, sensitivity, source_message_ids, status, created_at, updated_at, last_used_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, NULL)`
    )
    .bind(
      id,
      input.userId,
      input.personaId ?? null,
      input.roomId ?? null,
      input.conversationId ?? null,
      input.scope,
      input.kind,
      input.content,
      input.confidence ?? 0.8,
      input.importance ?? 0.6,
      input.sensitivity ?? 'normal',
      input.sourceMessageIds?.length ? JSON.stringify(input.sourceMessageIds) : null,
      now,
      now
    )
    .run();

  return {
    id,
    userId: input.userId,
    personaId: input.personaId ?? null,
    roomId: input.roomId ?? null,
    conversationId: input.conversationId ?? null,
    scope: input.scope,
    kind: input.kind,
    content: input.content,
    confidence: input.confidence ?? 0.8,
    importance: input.importance ?? 0.6,
    sensitivity: input.sensitivity ?? 'normal',
    sourceMessageIds: input.sourceMessageIds ?? [],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    lastUsedAt: null,
  };
}

export async function listMemoriesForUser(
  db: D1Database,
  userId: string,
  options?: { scope?: MemoryScope; personaId?: string; status?: MemoryStatus }
): Promise<MemoryRecord[]> {
  let query = `SELECT * FROM memories WHERE user_id = ?`;
  const binds: (string | number)[] = [userId];

  if (options?.scope) {
    query += ` AND scope = ?`;
    binds.push(options.scope);
  }
  if (options?.personaId) {
    query += ` AND persona_id = ?`;
    binds.push(options.personaId);
  }
  query += ` AND status = ?`;
  binds.push(options?.status ?? 'active');

  query += ` ORDER BY updated_at DESC LIMIT 200`;

  const { results } = await db.prepare(query).bind(...binds).all<MemoryRow>();
  return (results ?? []).map(rowToMemory);
}

export async function getMemoryForUser(
  db: D1Database,
  memoryId: string,
  userId: string
): Promise<MemoryRecord | null> {
  const row = await db
    .prepare(`SELECT * FROM memories WHERE id = ? AND user_id = ? LIMIT 1`)
    .bind(memoryId, userId)
    .first<MemoryRow>();
  return row ? rowToMemory(row) : null;
}

export async function updateMemoryContent(
  db: D1Database,
  memoryId: string,
  userId: string,
  content: string
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(`UPDATE memories SET content = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
    .bind(content, now, memoryId, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function setMemoryStatus(
  db: D1Database,
  memoryId: string,
  userId: string,
  status: MemoryStatus
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(`UPDATE memories SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`)
    .bind(status, now, memoryId, userId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function findActiveMemoryByKind(
  db: D1Database,
  userId: string,
  scope: MemoryScope,
  kind: MemoryKind,
  personaId?: string
): Promise<MemoryRecord | null> {
  let query = `SELECT * FROM memories WHERE user_id = ? AND scope = ? AND kind = ? AND status = 'active'`;
  const binds: string[] = [userId, scope, kind];
  if (personaId) {
    query += ` AND persona_id = ?`;
    binds.push(personaId);
  }
  query += ` ORDER BY updated_at DESC LIMIT 1`;
  const row = await db.prepare(query).bind(...binds).first<MemoryRow>();
  return row ? rowToMemory(row) : null;
}

export async function supersedeMemory(
  db: D1Database,
  userId: string,
  oldMemoryId: string,
  input: {
    scope: MemoryScope;
    kind: MemoryKind;
    content: string;
    personaId?: string;
    conversationId?: string;
    confidence?: number;
    importance?: number;
    sensitivity?: MemorySensitivity;
    sourceMessageIds?: string[];
  }
): Promise<MemoryRecord> {
  const newMemory = await insertMemory(db, { userId, ...input });
  const now = new Date().toISOString();
  await db
    .prepare(
      `UPDATE memories SET status = 'disabled', superseded_by = ?, updated_at = ? WHERE id = ? AND user_id = ?`
    )
    .bind(newMemory.id, now, oldMemoryId, userId)
    .run();
  return newMemory;
}

export async function findDuplicateMemory(
  db: D1Database,
  userId: string,
  scope: MemoryScope,
  content: string,
  personaId?: string
): Promise<MemoryRecord | null> {
  let query = `SELECT * FROM memories WHERE user_id = ? AND scope = ? AND lower(content) = lower(?) AND status = 'active'`;
  const binds: string[] = [userId, scope, content.trim()];
  if (personaId) {
    query += ` AND persona_id = ?`;
    binds.push(personaId);
  }
  query += ` LIMIT 1`;
  const row = await db.prepare(query).bind(...binds).first<MemoryRow>();
  return row ? rowToMemory(row) : null;
}

export async function retrieveRelevantMemories(
  db: D1Database,
  userId: string,
  personaId: string,
  queryText: string,
  limit = 6
): Promise<MemoryRecord[]> {
  const tokens = queryText
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 8);

  const userMemories = await listMemoriesForUser(db, userId, { scope: 'user' });
  const relationshipMemories = await listMemoriesForUser(db, userId, {
    scope: 'relationship',
    personaId,
  });

  const combined = [...userMemories, ...relationshipMemories];

  const scored = combined.map((memory) => {
    const haystack = memory.content.toLowerCase();
    let score = memory.importance * 0.4 + memory.confidence * 0.3;
    for (const token of tokens) {
      if (haystack.includes(token)) score += 0.15;
    }
    if (memory.lastUsedAt) score += 0.05;
    return { memory, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.memory);
}

export async function touchMemoriesUsed(db: D1Database, memoryIds: string[]): Promise<void> {
  if (!memoryIds.length) return;
  const now = new Date().toISOString();
  for (const id of memoryIds) {
    await db
      .prepare(`UPDATE memories SET last_used_at = ? WHERE id = ?`)
      .bind(now, id)
      .run();
  }
}
