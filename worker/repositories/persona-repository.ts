import { DEFAULT_PERSONAS } from '../../shared/default-personas';
import type {
  CreatePersonaInput,
  PersonaPublicDTO,
  PersonaRecord,
  UpdatePersonaInput,
} from '../domain/persona';
import { toPersonaPublicDTO } from '../domain/persona';

const SYSTEM_OWNER = 'system';
const SEED_MARKER = 'persony-seed-v1';

type PersonaRow = {
  id: string;
  owner_user_id: string;
  name: string;
  tagline: string | null;
  description: string | null;
  avatar_url: string | null;
  voice: string;
  category: string;
  visibility: string;
  status: string;
  current_version: number;
  badge: string | null;
  color: string | null;
  starter_messages_json: string | null;
  source_persona_id: string | null;
  system_prompt: string;
};

function seedToRecord(p: (typeof DEFAULT_PERSONAS)[number]): PersonaRecord {
  return {
    id: p.id,
    ownerUserId: SYSTEM_OWNER,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    avatarUrl: p.avatar,
    voice: p.voice,
    category: p.category,
    visibility: 'public',
    currentVersion: 1,
    systemPrompt: p.systemPrompt,
    badge: p.badge,
    color: p.color,
    starterMessages: p.starterMessages,
  };
}

const SEED_MAP = new Map(DEFAULT_PERSONAS.map((p) => [p.id, seedToRecord(p)]));

export function generatePersonaId(): string {
  return `p_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export async function isDbReady(db: D1Database): Promise<boolean> {
  try {
    await db.prepare('SELECT 1 FROM personas LIMIT 1').first();
    return true;
  } catch {
    return false;
  }
}

export async function ensureDefaultPersonasSeeded(db: D1Database): Promise<void> {
  if (!(await isDbReady(db))) return;

  const marker = await db
    .prepare('SELECT id FROM personas WHERE id = ?')
    .bind(SEED_MARKER)
    .first();

  if (marker) return;

  const now = new Date().toISOString();
  for (const persona of DEFAULT_PERSONAS) {
    await createPersonaInDb(db, SYSTEM_OWNER, {
      id: persona.id,
      name: persona.name,
      tagline: persona.tagline,
      description: persona.description,
      systemPrompt: persona.systemPrompt,
      avatarUrl: persona.avatar,
      voice: persona.voice,
      category: persona.category,
      badge: persona.badge,
      color: persona.color,
      starterMessages: persona.starterMessages,
      visibility: 'public',
    });
  }

  await db
    .prepare(
      `INSERT INTO personas (id, owner_user_id, name, tagline, visibility, status, voice, category, current_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(SEED_MARKER, SYSTEM_OWNER, '__seed__', 'marker', 'private', 'active', 'Puck', 'custom', 1, now, now)
    .run();
}

function rowToRecord(row: PersonaRow): PersonaRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    name: row.name,
    tagline: row.tagline || '',
    description: row.description || '',
    avatarUrl: row.avatar_url || '',
    voice: row.voice,
    category: row.category,
    visibility: row.visibility as PersonaRecord['visibility'],
    currentVersion: row.current_version,
    systemPrompt: row.system_prompt,
    badge: row.badge || undefined,
    color: row.color || undefined,
    starterMessages: row.starter_messages_json
      ? (JSON.parse(row.starter_messages_json) as string[])
      : undefined,
    sourcePersonaId: row.source_persona_id || undefined,
  };
}

export async function getPersonaById(
  db: D1Database | undefined,
  personaId: string,
  requesterUserId: string | null
): Promise<PersonaRecord | null> {
  if (db && (await isDbReady(db))) {
    const row = await db
      .prepare(
        `SELECT p.*, pv.system_prompt
         FROM personas p
         JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
         WHERE p.id = ? AND p.status = 'active'`
      )
      .bind(personaId)
      .first<PersonaRow>();

    if (row) {
      const record = rowToRecord(row);
      if (
        record.visibility === 'public' ||
        record.ownerUserId === SYSTEM_OWNER ||
        (requesterUserId && record.ownerUserId === requesterUserId)
      ) {
        return record;
      }
      return null;
    }
  }

  return SEED_MAP.get(personaId) ?? null;
}

export async function getPersonaOwnerRecord(
  db: D1Database,
  personaId: string,
  ownerUserId: string
): Promise<PersonaRecord | null> {
  const row = await db
    .prepare(
      `SELECT p.*, pv.system_prompt
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
       WHERE p.id = ? AND p.owner_user_id = ? AND p.status = 'active'`
    )
    .bind(personaId, ownerUserId)
    .first<PersonaRow>();

  return row ? rowToRecord(row) : null;
}

export async function listPublicPersonas(db: D1Database | undefined): Promise<PersonaPublicDTO[]> {
  if (db && (await isDbReady(db))) {
    const { results } = await db
      .prepare(
        `SELECT id, name, tagline, description, avatar_url, voice, category, visibility, badge, color, starter_messages_json
         FROM personas
         WHERE visibility = 'public' AND status = 'active' AND id != ?`
      )
      .bind(SEED_MARKER)
      .all<{
        id: string;
        name: string;
        tagline: string | null;
        description: string | null;
        avatar_url: string | null;
        voice: string;
        category: string;
        visibility: string;
        badge: string | null;
        color: string | null;
        starter_messages_json: string | null;
      }>();

    return (results ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      tagline: r.tagline || '',
      description: r.description || '',
      avatarUrl: r.avatar_url || '',
      voice: r.voice,
      category: r.category,
      visibility: r.visibility as PersonaPublicDTO['visibility'],
      badge: r.badge || undefined,
      color: r.color || undefined,
      starterMessages: r.starter_messages_json
        ? (JSON.parse(r.starter_messages_json) as string[])
        : undefined,
    }));
  }

  return DEFAULT_PERSONAS.map((p) => ({
    id: p.id,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    avatarUrl: p.avatar,
    voice: p.voice,
    category: p.category,
    visibility: 'public' as const,
    badge: p.badge,
    color: p.color,
    starterMessages: p.starterMessages,
  }));
}

type CreatePersonaInDbInput = CreatePersonaInput & { id?: string };

async function insertPersonaVersion(
  db: D1Database,
  personaId: string,
  version: number,
  systemPrompt: string
): Promise<void> {
  const versionId = `${personaId}_v${version}`;
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO persona_versions (id, persona_id, version, system_prompt, configuration_json, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`
    )
    .bind(versionId, personaId, version, systemPrompt, now)
    .run();
}

export async function createPersonaInDb(
  db: D1Database,
  ownerUserId: string,
  input: CreatePersonaInDbInput
): Promise<PersonaRecord> {
  const id = input.id ?? generatePersonaId();
  const now = new Date().toISOString();

  const existing = await db
    .prepare('SELECT id FROM personas WHERE id = ?')
    .bind(id)
    .first();

  if (existing) {
    throw new PersonaIdCollisionError(id);
  }

  await db
    .prepare(
      `INSERT INTO personas (
        id, owner_user_id, slug, name, tagline, description, avatar_url, voice, category,
        visibility, status, source_persona_id, current_version, badge, color, starter_messages_json,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 1, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      ownerUserId,
      id,
      input.name,
      input.tagline,
      input.description,
      input.avatarUrl,
      input.voice,
      input.category,
      input.visibility || 'private',
      input.sourcePersonaId || null,
      input.badge || null,
      input.color || null,
      input.starterMessages ? JSON.stringify(input.starterMessages) : null,
      now,
      now
    )
    .run();

  await insertPersonaVersion(db, id, 1, input.systemPrompt);

  const record = await getPersonaById(db, id, ownerUserId);
  if (!record) throw new Error('Failed to load persona after create');
  return record;
}

export async function updatePersonaInDb(
  db: D1Database,
  ownerUserId: string,
  personaId: string,
  input: UpdatePersonaInput
): Promise<PersonaRecord> {
  const existing = await getPersonaOwnerRecord(db, personaId, ownerUserId);
  if (!existing) {
    throw new PersonaNotOwnedError(personaId);
  }

  const now = new Date().toISOString();
  const nextVersion = existing.currentVersion + 1;
  const merged = {
    name: input.name ?? existing.name,
    tagline: input.tagline ?? existing.tagline,
    description: input.description ?? existing.description,
    systemPrompt: input.systemPrompt ?? existing.systemPrompt,
    avatarUrl: input.avatarUrl ?? existing.avatarUrl,
    voice: input.voice ?? existing.voice,
    category: input.category ?? existing.category,
    visibility: input.visibility ?? existing.visibility,
    badge: input.badge ?? existing.badge,
    color: input.color ?? existing.color,
    starterMessages: input.starterMessages ?? existing.starterMessages,
  };

  await db
    .prepare(
      `UPDATE personas SET
        name = ?, tagline = ?, description = ?, avatar_url = ?, voice = ?, category = ?,
        visibility = ?, badge = ?, color = ?, starter_messages_json = ?, current_version = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ? AND status = 'active'`
    )
    .bind(
      merged.name,
      merged.tagline,
      merged.description,
      merged.avatarUrl,
      merged.voice,
      merged.category,
      merged.visibility,
      merged.badge || null,
      merged.color || null,
      merged.starterMessages ? JSON.stringify(merged.starterMessages) : null,
      nextVersion,
      now,
      personaId,
      ownerUserId
    )
    .run();

  await insertPersonaVersion(db, personaId, nextVersion, merged.systemPrompt);

  const record = await getPersonaOwnerRecord(db, personaId, ownerUserId);
  if (!record) throw new Error('Failed to load persona after update');
  return record;
}

export async function softDeletePersona(
  db: D1Database,
  ownerUserId: string,
  personaId: string
): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE personas SET status = 'deleted', updated_at = ? WHERE id = ? AND owner_user_id = ? AND status = 'active'`
    )
    .bind(new Date().toISOString(), personaId, ownerUserId)
    .run();

  return (result.meta.changes ?? 0) > 0;
}

export class PersonaIdCollisionError extends Error {
  readonly status = 409;
  constructor(personaId: string) {
    super(`Persona id already exists: ${personaId}`);
    this.name = 'PersonaIdCollisionError';
  }
}

export class PersonaNotOwnedError extends Error {
  readonly status = 403;
  constructor(personaId: string) {
    super(`Persona not owned by user: ${personaId}`);
    this.name = 'PersonaNotOwnedError';
  }
}

/** @deprecated Use createPersonaInDb / updatePersonaInDb */
export async function upsertPersonaInDb(
  db: D1Database,
  ownerUserId: string,
  input: CreatePersonaInDbInput & { id: string }
): Promise<PersonaRecord> {
  const existing = await db
    .prepare('SELECT id, owner_user_id FROM personas WHERE id = ? AND status = ?')
    .bind(input.id, 'active')
    .first<{ id: string; owner_user_id: string }>();

  if (existing) {
    if (existing.owner_user_id !== ownerUserId) {
      throw new PersonaNotOwnedError(input.id);
    }
    return updatePersonaInDb(db, ownerUserId, input.id, input);
  }

  return createPersonaInDb(db, ownerUserId, input);
}

export { toPersonaPublicDTO };
