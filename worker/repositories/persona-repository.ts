import {
  OFFICIAL_PERSONA_ROSTER,
  localizedPresentation,
} from '../../shared/personas/official-roster';
import { compilePersonaInstructions } from '../services/persona-compiler';
import type {
  PersonaRecord,
  PersonaPublicMeta,
  PersonaRuntime,
  PersonaVersionRecord,
  CreatePersonaInput,
  UpdatePersonaInput,
} from '../domain/persona';
import { mergePersonaRuntime } from '../domain/persona';
import { PersonaOwnershipError } from '../middleware/auth';
import { generateId } from '../lib/ids';
import { isDbConfigured, isProduction } from '../lib/env';
import type { PersonyEnv } from '../types/env';

export const SYSTEM_OWNER = 'system';

type PersonaRow = {
  id: string;
  owner_user_id: string;
  slug: string | null;
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
  system_prompt?: string;
  configuration_json?: string | null;
  version_created_at?: string;
};

const MEMORY_SEED = new Map<string, PersonaRuntime>(
  OFFICIAL_PERSONA_ROSTER.map((official) => {
    const presentation = localizedPresentation(official.spec, 'en');
    const record: PersonaRecord = {
      id: official.id,
      ownerUserId: SYSTEM_OWNER,
      slug: official.spec.identity.slug,
      name: official.name,
      tagline: presentation.tagline,
      description: presentation.description,
      avatarUrl: official.avatarUrl,
      voice: official.voice,
      category: official.category,
      visibility: 'public',
      status: 'active',
      currentVersion: 1,
      badge: official.badge,
      color: official.color,
      starterMessages: presentation.starterMessages,
    };
    const version: PersonaVersionRecord = {
      id: `${official.id}_v1`,
      personaId: official.id,
      version: 1,
      systemPrompt: compilePersonaInstructions(official.spec, official.name, { locale: 'en' }),
      configurationJson: JSON.stringify(official.spec),
      createdAt: new Date(0).toISOString(),
    };
    return [official.id, mergePersonaRuntime(record, version)];
  })
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

function rowToPersonaRecord(row: PersonaRow): PersonaRecord {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    slug: row.slug || row.id,
    name: row.name,
    tagline: row.tagline || '',
    description: row.description || '',
    avatarUrl: row.avatar_url || '',
    voice: row.voice,
    category: row.category,
    visibility: row.visibility as PersonaRecord['visibility'],
    status: (row.status as PersonaRecord['status']) || 'active',
    currentVersion: row.current_version,
    badge: row.badge || undefined,
    color: row.color || undefined,
    starterMessages: row.starter_messages_json
      ? (JSON.parse(row.starter_messages_json) as string[])
      : undefined,
    sourcePersonaId: row.source_persona_id || undefined,
  };
}

function rowToVersion(row: PersonaRow, version: number): PersonaVersionRecord {
  return {
    id: `${row.id}_v${version}`,
    personaId: row.id,
    version,
    systemPrompt: row.system_prompt || '',
    configurationJson: row.configuration_json ?? null,
    createdAt: row.version_created_at || new Date(0).toISOString(),
  };
}

function rowToRuntime(row: PersonaRow, version = row.current_version): PersonaRuntime {
  return mergePersonaRuntime(rowToPersonaRecord(row), rowToVersion(row, version));
}

async function fetchPersonaRow(db: D1Database, personaId: string): Promise<PersonaRow | null> {
  return db
    .prepare(
      `SELECT p.*, pv.system_prompt, pv.configuration_json, pv.created_at AS version_created_at
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
       WHERE p.id = ? AND p.status = 'active'`
    )
    .bind(personaId)
    .first<PersonaRow>();
}

async function fetchPersonaVersionRow(
  db: D1Database,
  personaId: string,
  version: number
): Promise<PersonaRow | null> {
  return db
    .prepare(
      `SELECT p.*, pv.system_prompt, pv.configuration_json, pv.created_at AS version_created_at
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = ?
       WHERE p.id = ? AND p.status = 'active'`
    )
    .bind(version, personaId)
    .first<PersonaRow>();
}

/** Idempotent seed for all official core personas. Does not mutate existing versions. */
export async function ensureOfficialPersonasSeeded(db: D1Database): Promise<void> {
  if (!(await isDbReady(db))) return;

  const now = new Date().toISOString();

  for (const official of OFFICIAL_PERSONA_ROSTER) {
    const presentation = localizedPresentation(official.spec, 'en');
    const configJson = JSON.stringify(official.spec);
    const systemPrompt = compilePersonaInstructions(official.spec, official.name, { locale: 'en' });

    const insert = await db
      .prepare(
        `INSERT OR IGNORE INTO personas (
          id, owner_user_id, slug, name, tagline, description, avatar_url, voice, category,
          visibility, status, current_version, badge, color, starter_messages_json, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'public', 'active', 1, ?, ?, ?, ?, ?)`
      )
      .bind(
        official.id,
        SYSTEM_OWNER,
        official.spec.identity.slug,
        official.name,
        presentation.tagline,
        presentation.description,
        official.avatarUrl,
        official.voice,
        official.category,
        official.badge,
        official.color,
        presentation.starterMessages.length
          ? JSON.stringify(presentation.starterMessages)
          : null,
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
        .bind(`${official.id}_v1`, official.id, systemPrompt, configJson, now)
        .run();
    }
  }
}

/** @deprecated Use ensureOfficialPersonasSeeded */
export async function ensureDefaultPersonasSeeded(db: D1Database): Promise<void> {
  await ensureOfficialPersonasSeeded(db);
}

export async function getPersonaVersion(
  env: PersonyEnv,
  db: D1Database,
  personaId: string,
  version: number,
  requesterUserId: string
): Promise<PersonaRuntime | null> {
  const accessible = await getAccessiblePersona(env, db, personaId, requesterUserId);
  if (!accessible) return null;

  const row = await fetchPersonaVersionRow(db, personaId, version);
  return row ? rowToRuntime(row, version) : null;
}

export async function getPersonaRecord(
  env: PersonyEnv,
  db: D1Database | undefined,
  personaId: string
): Promise<PersonaRecord | null> {
  const runtime = await getPersonaRuntime(env, db, personaId);
  if (!runtime) return null;
  const { systemPrompt: _s, configurationJson: _c, resolvedVersion: _v, ...record } = runtime;
  return record;
}

export async function getPersonaRuntime(
  env: PersonyEnv,
  db: D1Database | undefined,
  personaId: string,
  version?: number
): Promise<PersonaRuntime | null> {
  const dbReady = db ? await isDbReady(db) : false;

  if (db && dbReady) {
    const row = version
      ? await fetchPersonaVersionRow(db, personaId, version)
      : await fetchPersonaRow(db, personaId);
    return row ? rowToRuntime(row, version ?? row.current_version) : null;
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
): Promise<PersonaRuntime | null> {
  const record = await getPersonaRuntime(env, db, personaId);
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
  db: D1Database | undefined,
  locale: 'en' | 'ru' = 'en'
): Promise<PersonaPublicMeta[]> {
  const dbReady = db ? await isDbReady(db) : false;

  if (db && dbReady) {
    const { results } = await db
      .prepare(
        `SELECT p.id, p.slug, p.name, p.tagline, p.description, p.avatar_url, p.voice, p.category,
                p.visibility, p.badge, p.color, p.starter_messages_json, pv.configuration_json
         FROM personas p
         JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
         WHERE p.visibility = 'public' AND p.status = 'active' AND p.owner_user_id = ?
         ORDER BY p.name ASC`
      )
      .bind(SYSTEM_OWNER)
      .all<{
        id: string;
        slug: string | null;
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
        configuration_json: string | null;
      }>();

    const officialOrder = new Map(OFFICIAL_PERSONA_ROSTER.map((p) => [p.id, p.sortOrder]));

    return (results ?? [])
      .map((r) => {
        const official = OFFICIAL_PERSONA_ROSTER.find((o) => o.id === r.id);
        const spec = official?.spec;
        const localized = spec ? localizedPresentation(spec, locale) : null;
        return {
          id: r.id,
          slug: r.slug || r.id,
          name: r.name,
          tagline: localized?.tagline || r.tagline || '',
          description: localized?.description || r.description || '',
          avatarUrl: r.avatar_url || '',
          voice: r.voice,
          category: r.category,
          visibility: r.visibility as PersonaPublicMeta['visibility'],
          badge: r.badge || undefined,
          color: r.color || undefined,
          starterMessages: localized?.starterMessages?.length
            ? localized.starterMessages
            : r.starter_messages_json
              ? (JSON.parse(r.starter_messages_json) as string[])
              : undefined,
          disclosure: localized?.disclosure,
          isOfficial: Boolean(official),
          sortOrder: officialOrder.get(r.id),
        } satisfies PersonaPublicMeta;
      })
      .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
  }

  if (shouldAllowMemorySeed(env, dbReady)) {
    return OFFICIAL_PERSONA_ROSTER.map((official) => {
      const localized = localizedPresentation(official.spec, locale);
      return {
        id: official.id,
        slug: official.spec.identity.slug,
        name: official.name,
        tagline: localized.tagline,
        description: localized.description,
        avatarUrl: official.avatarUrl,
        voice: official.voice,
        category: official.category,
        visibility: 'public' as const,
        badge: official.badge,
        color: official.color,
        starterMessages: localized.starterMessages,
        disclosure: localized.disclosure,
        isOfficial: true,
        sortOrder: official.sortOrder,
      };
    });
  }

  return [];
}

export async function listUserPersonas(db: D1Database, ownerUserId: string): Promise<PersonaRuntime[]> {
  const { results } = await db
    .prepare(
      `SELECT p.*, pv.system_prompt, pv.configuration_json, pv.created_at AS version_created_at
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
       WHERE p.owner_user_id = ? AND p.status = 'active' AND p.owner_user_id != ?`
    )
    .bind(ownerUserId, SYSTEM_OWNER)
    .all<PersonaRow>();

  return (results ?? []).map((row) => rowToRuntime(row));
}

export async function findPersonaBySlugForOwner(
  db: D1Database,
  ownerUserId: string,
  slug: string
): Promise<PersonaRuntime | null> {
  const row = await db
    .prepare(
      `SELECT p.*, pv.system_prompt, pv.configuration_json, pv.created_at AS version_created_at
       FROM personas p
       JOIN persona_versions pv ON pv.persona_id = p.id AND pv.version = p.current_version
       WHERE p.slug = ? AND p.owner_user_id = ? AND p.status = 'active'`
    )
    .bind(slug, ownerUserId)
    .first<PersonaRow>();

  return row ? rowToRuntime(row) : null;
}

export async function createPersonaInDb(
  db: D1Database,
  ownerUserId: string,
  input: CreatePersonaInput,
  options?: { slug?: string }
): Promise<PersonaRuntime> {
  const id = generateId();
  const slug = options?.slug || id;
  const now = new Date().toISOString();
  const versionId = `${id}_v1`;
  const configurationJson = input.configurationJson ?? null;

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
       VALUES (?, ?, 1, ?, ?, ?)`
    )
    .bind(versionId, id, input.systemPrompt, configurationJson, now)
    .run();

  const record = await fetchPersonaRow(db, id);
  if (!record) throw new Error('Failed to load persona after create');
  return rowToRuntime(record);
}

export async function updatePersonaInDb(
  db: D1Database,
  ownerUserId: string,
  personaId: string,
  input: UpdatePersonaInput
): Promise<PersonaRuntime> {
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
  const configurationJson = input.configurationJson ?? null;

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
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(versionId, personaId, nextVersion, input.systemPrompt, configurationJson, now)
    .run();

  const record = await fetchPersonaRow(db, personaId);
  if (!record) throw new Error('Failed to load persona after update');
  return rowToRuntime(record);
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
