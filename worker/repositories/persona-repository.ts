import { DEFAULT_PERSONAS } from '../../shared/default-personas';
import type { PersonaRecord, PersonaPublicMeta, UpsertPersonaInput } from '../domain/persona';

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
    await upsertPersonaInDb(db, SYSTEM_OWNER, {
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

export async function listPublicPersonas(db: D1Database | undefined): Promise<PersonaPublicMeta[]> {
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
      visibility: r.visibility as PersonaPublicMeta['visibility'],
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

export async function upsertPersonaInDb(
  db: D1Database,
  ownerUserId: string,
  input: UpsertPersonaInput
): Promise<PersonaRecord> {
  const now = new Date().toISOString();
  const existing = await db
    .prepare('SELECT current_version FROM personas WHERE id = ?')
    .bind(input.id)
    .first<{ current_version: number }>();

  const nextVersion = existing ? existing.current_version + 1 : 1;
  const versionId = `${input.id}_v${nextVersion}`;

  if (existing) {
    await db
      .prepare(
        `UPDATE personas SET
          name = ?, tagline = ?, description = ?, avatar_url = ?, voice = ?, category = ?,
          visibility = ?, badge = ?, color = ?, starter_messages_json = ?, current_version = ?, updated_at = ?
         WHERE id = ? AND owner_user_id = ?`
      )
      .bind(
        input.name,
        input.tagline,
        input.description,
        input.avatarUrl,
        input.voice,
        input.category,
        input.visibility || 'private',
        input.badge || null,
        input.color || null,
        input.starterMessages ? JSON.stringify(input.starterMessages) : null,
        nextVersion,
        now,
        input.id,
        ownerUserId
      )
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO personas (
          id, owner_user_id, slug, name, tagline, description, avatar_url, voice, category,
          visibility, status, source_persona_id, current_version, badge, color, starter_messages_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        input.id,
        ownerUserId,
        input.id,
        input.name,
        input.tagline,
        input.description,
        input.avatarUrl,
        input.voice,
        input.category,
        input.visibility || 'private',
        input.sourcePersonaId || null,
        nextVersion,
        input.badge || null,
        input.color || null,
        input.starterMessages ? JSON.stringify(input.starterMessages) : null,
        now,
        now
      )
      .run();
  }

  await db
    .prepare(
      `INSERT INTO persona_versions (id, persona_id, version, system_prompt, configuration_json, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`
    )
    .bind(versionId, input.id, nextVersion, input.systemPrompt, now)
    .run();

  const record = await getPersonaById(db, input.id, ownerUserId);
  if (!record) throw new Error('Failed to load persona after upsert');
  return record;
}
