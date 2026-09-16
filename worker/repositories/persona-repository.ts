import { DEFAULT_PERSONAS, LEGACY_PERSONAS } from '../../shared/default-personas';
import { ATHENA_PERSONA_ID, ATHENA_SPEC_V1 } from '../../shared/personas/athena-spec';
import { compilePersonaInstructions } from '../services/persona-compiler';
import type { PersonaRecord, PersonaPublicMeta, CreatePersonaInput, UpdatePersonaInput } from '../domain/persona';
import { PersonaOwnershipError } from '../middleware/auth';
import { generateId } from '../lib/ids';
import { isDbConfigured, isProduction } from '../lib/env';
import type { PersonyEnv } from '../types/env';

export const SYSTEM_OWNER = 'system';

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
  configuration_json?: string | null;
};

const MEMORY_SEED = new Map(
  [...DEFAULT_PERSONAS, ...LEGACY_PERSONAS].map((p) => [
    p.id,
    {
      id: p.id,
      ownerUserId: SYSTEM_OWNER,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      avatarUrl: p.avatar,
      voice: p.voice,
      category: p.category,
      visibility: 'public' as const,
      currentVersion: 1,
      systemPrompt:
        p.systemPrompt ||
        (p.id === ATHENA_PERSONA_ID
          ? compilePersonaInstructions(ATHENA_SPEC_V1, 'Athena', { locale: 'en' })
          : p.systemPrompt),
      badge: p.badge,
      color: p.color,
      starterMessages: p.starterMessages,
    } satisfies PersonaRecord,
  ])
);

export async function isDbReady(db: D1Database): Promise<boolean> {
  try {
    await db.prepare('SELECT 1 FROM personas LIMIT 1').first();
    return true;
  } catch {
    return false;
  }
}

export function shouldAllowMemorySeed(env: PersonyEnv, dbReady: boolean): boolean {
  if (isProduction(env)) return false;
  if (!isDbConfigured(env)) return true;
  if (!dbReady) return true;
  return false;
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
    configurationJson: row.configuration_json ?? null,
    badge: row.badge || undefined,
    color: row.color || undefined,
    starterMessages: row.starter_messages_json
      ? (JSON.parse(row.starter_messages_json) as string[])
      : undefined,
    sourcePersonaId: row.source_persona_id || undefined,
  };
}

async function fetchPersonaRow(db: D1Database, personaId: string): Promise<PersonaRow | null> {
  return db
    .prepare(
      `SELECT p.*, pv.system_prompt, pv.configuration_json
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
       WHERE p.id = ? AND p.status = 'active'`
    )
    .bind(personaId)
    .first<PersonaRow>();
}

export async function ensureDefaultPersonasSeeded(db: D1Database): Promise<void> {
  if (!(await isDbReady(db))) return;

  const now = new Date().toISOString();
  const athena = DEFAULT_PERSONAS[0];
  if (!athena) return;

  const athenaConfigJson = JSON.stringify(ATHENA_SPEC_V1);
  const athenaPrompt = compilePersonaInstructions(ATHENA_SPEC_V1, 'Athena', { locale: 'en' });

  const insert = await db
    .prepare(
      `INSERT OR IGNORE INTO personas (
        id, owner_user_id, slug, name, tagline, description, avatar_url, voice, category,
        visibility, status, current_version, badge, color, starter_messages_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 'active', 1, ?, ?, ?, ?, ?)`
    )
    .bind(
      ATHENA_PERSONA_ID,
      SYSTEM_OWNER,
      ATHENA_PERSONA_ID,
      athena.name,
      athena.tagline,
      athena.description,
      athena.avatar,
      athena.voice,
      athena.category,
      athena.badge || 'Official',
      athena.color || null,
      athena.starterMessages ? JSON.stringify(athena.starterMessages) : null,
      now,
      now
    )
    .run();

  if ((insert.meta?.changes ?? 0) > 0) {
    await db
      .prepare(
        `INSERT INTO persona_versions (id, persona_id, version, system_prompt, configuration_json, created_at)
         VALUES (?, ?, 1, ?, ?, ?)`
      )
      .bind(`${ATHENA_PERSONA_ID}_v1`, ATHENA_PERSONA_ID, athenaPrompt, athenaConfigJson, now)
      .run();
  }
}

async function fetchPersonaVersionRow(
  db: D1Database,
  personaId: string,
  version: number
): Promise<PersonaRow | null> {
  return db
    .prepare(
      `SELECT p.*, pv.system_prompt, pv.configuration_json
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = ?
       WHERE p.id = ? AND p.status = 'active'`
    )
    .bind(version, personaId)
    .first<PersonaRow>();
}

export async function getPersonaVersion(
  env: PersonyEnv,
  db: D1Database,
  personaId: string,
  version: number,
  requesterUserId: string
): Promise<PersonaRecord | null> {
  const accessible = await getAccessiblePersona(env, db, personaId, requesterUserId);
  if (!accessible) return null;

  const row = await fetchPersonaVersionRow(db, personaId, version);
  if (!row) return null;

  const record = rowToRecord(row);
  return { ...record, currentVersion: version };
}

export async function getPersonaRecord(
  env: PersonyEnv,
  db: D1Database | undefined,
  personaId: string
): Promise<PersonaRecord | null> {
  const dbReady = db ? await isDbReady(db) : false;

  if (db && dbReady) {
    const row = await fetchPersonaRow(db, personaId);
    return row ? rowToRecord(row) : null;
  }

  if (shouldAllowMemorySeed(env, dbReady)) {
    return MEMORY_SEED.get(personaId) ?? null;
  }

  return null;
}

export async function getAccessiblePersona(
  env: PersonyEnv,
  db: D1Database | undefined,
  personaId: string,
  requesterUserId: string | null
): Promise<PersonaRecord | null> {
  const record = await getPersonaRecord(env, db, personaId);
  if (!record) return null;

  if (
    record.visibility === 'public' ||
    record.ownerUserId === SYSTEM_OWNER ||
    (requesterUserId && record.ownerUserId === requesterUserId)
  ) {
    return record;
  }

  return null;
}

export async function listPublicPersonas(
  env: PersonyEnv,
  db: D1Database | undefined
): Promise<PersonaPublicMeta[]> {
  const dbReady = db ? await isDbReady(db) : false;

  if (db && dbReady) {
    const { results } = await db
      .prepare(
        `SELECT id, name, tagline, description, avatar_url, voice, category, visibility, badge, color, starter_messages_json
         FROM personas
         WHERE visibility = 'public' AND status = 'active' AND owner_user_id = ?`
      )
      .bind(SYSTEM_OWNER)
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

  if (shouldAllowMemorySeed(env, dbReady)) {
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

  return [];
}

export async function listUserPersonas(db: D1Database, ownerUserId: string): Promise<PersonaRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT p.*, pv.system_prompt
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
       WHERE p.owner_user_id = ? AND p.status = 'active' AND p.owner_user_id != ?`
    )
    .bind(ownerUserId, SYSTEM_OWNER)
    .all<PersonaRow>();

  return (results ?? []).map(rowToRecord);
}

export async function findPersonaBySlugForOwner(
  db: D1Database,
  ownerUserId: string,
  slug: string
): Promise<PersonaRecord | null> {
  const row = await db
    .prepare(
      `SELECT p.*, pv.system_prompt
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
       WHERE p.slug = ? AND p.owner_user_id = ? AND p.status = 'active'`
    )
    .bind(slug, ownerUserId)
    .first<PersonaRow>();

  return row ? rowToRecord(row) : null;
}

export async function createPersonaInDb(
  db: D1Database,
  ownerUserId: string,
  input: CreatePersonaInput,
  options?: { slug?: string }
): Promise<PersonaRecord> {
  const id = generateId();
  const slug = options?.slug || id;
  const now = new Date().toISOString();
  const versionId = `${id}_v1`;

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
      slug,
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

  await db
    .prepare(
      `INSERT INTO persona_versions (id, persona_id, version, system_prompt, configuration_json, created_at)
       VALUES (?, ?, 1, ?, NULL, ?)`
    )
    .bind(versionId, id, input.systemPrompt, now)
    .run();

  const record = await fetchPersonaRow(db, id);
  if (!record) throw new Error('Failed to load persona after create');
  return rowToRecord(record);
}

export async function updatePersonaInDb(
  db: D1Database,
  ownerUserId: string,
  personaId: string,
  input: UpdatePersonaInput
): Promise<PersonaRecord> {
  const existing = await db
    .prepare('SELECT owner_user_id, current_version FROM personas WHERE id = ? AND status = ?')
    .bind(personaId, 'active')
    .first<{ owner_user_id: string; current_version: number }>();

  if (!existing) {
    throw new Error('Persona not found');
  }

  if (existing.owner_user_id !== ownerUserId) {
    throw new PersonaOwnershipError();
  }

  const now = new Date().toISOString();
  const nextVersion = existing.current_version + 1;
  const versionId = `${personaId}_v${nextVersion}`;

  const update = await db
    .prepare(
      `UPDATE personas SET
        name = ?, tagline = ?, description = ?, avatar_url = ?, voice = ?, category = ?,
        visibility = ?, badge = ?, color = ?, starter_messages_json = ?, current_version = ?, updated_at = ?
       WHERE id = ? AND owner_user_id = ? AND status = 'active'`
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
      personaId,
      ownerUserId
    )
    .run();

  if ((update.meta?.changes ?? 0) === 0) {
    throw new PersonaOwnershipError();
  }

  await db
    .prepare(
      `INSERT INTO persona_versions (id, persona_id, version, system_prompt, configuration_json, created_at)
       VALUES (?, ?, ?, ?, NULL, ?)`
    )
    .bind(versionId, personaId, nextVersion, input.systemPrompt, now)
    .run();

  const record = await fetchPersonaRow(db, personaId);
  if (!record) throw new Error('Failed to load persona after update');
  return rowToRecord(record);
}

export async function softDeletePersona(
  db: D1Database,
  ownerUserId: string,
  personaId: string
): Promise<void> {
  const result = await db
    .prepare(
      `UPDATE personas SET status = 'deleted', updated_at = ? WHERE id = ? AND owner_user_id = ? AND status = 'active'`
    )
    .bind(new Date().toISOString(), personaId, ownerUserId)
    .run();

  if ((result.meta?.changes ?? 0) === 0) {
    throw new PersonaOwnershipError();
  }
}
