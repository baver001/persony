import { generatePersonaId, getPersonaById, createPersonaInDb } from '../repositories/persona-repository';
import { toPersonaPublicDTO } from '../domain/persona';

export async function publishPersona(
  db: D1Database,
  ownerUserId: string,
  personaId: string,
  visibility: 'unlisted' | 'public'
): Promise<boolean> {
  const now = new Date().toISOString();
  const result = await db
    .prepare(
      `UPDATE personas SET visibility = ?, published_at = ?, updated_at = ?, slug = COALESCE(slug, id)
       WHERE id = ? AND owner_user_id = ? AND status = 'active'`
    )
    .bind(visibility, now, now, personaId, ownerUserId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

export async function getPublicPersonaBySlug(
  db: D1Database,
  slug: string
): Promise<ReturnType<typeof toPersonaPublicDTO> & { slug: string; authorUserId: string; installCount: number } | null> {
  const row = await db
    .prepare(
      `SELECT p.id, p.owner_user_id, p.slug, p.name, p.tagline, p.description, p.avatar_url, p.voice, p.category, p.visibility, p.badge, p.color, p.starter_messages_json, p.published_at,
        (SELECT COUNT(*) FROM persona_installs pi WHERE pi.persona_id = p.id) as install_count
       FROM personas p
       WHERE (p.slug = ? OR p.id = ?) AND p.visibility IN ('public', 'unlisted') AND p.status = 'active'`
    )
    .bind(slug, slug)
    .first<{
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
      badge: string | null;
      color: string | null;
      starter_messages_json: string | null;
      install_count: number;
    }>();

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug || row.id,
    authorUserId: row.owner_user_id,
    installCount: row.install_count,
    name: row.name,
    tagline: row.tagline || '',
    description: row.description || '',
    avatarUrl: row.avatar_url || '',
    voice: row.voice,
    category: row.category,
    visibility: row.visibility as 'public' | 'unlisted',
    badge: row.badge || undefined,
    color: row.color || undefined,
    starterMessages: row.starter_messages_json
      ? (JSON.parse(row.starter_messages_json) as string[])
      : undefined,
  };
}

export async function installPersona(
  db: D1Database,
  userId: string,
  personaId: string
): Promise<boolean> {
  const persona = await getPersonaById(db, personaId, userId);
  if (!persona || (persona.visibility !== 'public' && persona.visibility !== 'unlisted')) {
    return false;
  }

  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO persona_installs (user_id, persona_id, persona_version, installed_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(userId, personaId, persona.currentVersion, now)
    .run();

  await db
    .prepare(
      `INSERT OR IGNORE INTO user_personas (user_id, persona_id, persona_version, installed_at)
       VALUES (?, ?, ?, ?)`
    )
    .bind(userId, personaId, persona.currentVersion, now)
    .run();

  return true;
}

export async function remixPersona(
  db: D1Database,
  userId: string,
  sourcePersonaId: string
): Promise<string | null> {
  const source = await getPersonaById(db, sourcePersonaId, userId);
  if (!source || source.visibility === 'private') return null;

  const record = await createPersonaInDb(db, userId, {
    name: `${source.name} (Remix)`,
    tagline: source.tagline,
    description: source.description,
    systemPrompt: source.systemPrompt,
    avatarUrl: source.avatarUrl,
    voice: source.voice,
    category: source.category,
    badge: source.badge,
    color: source.color,
    starterMessages: source.starterMessages,
    visibility: 'private',
    sourcePersonaId: sourcePersonaId,
  });

  return record.id;
}

export async function listDiscoverPersonas(db: D1Database, limit = 50) {
  const { results } = await db
    .prepare(
      `SELECT p.id, p.slug, p.name, p.tagline, p.description, p.avatar_url, p.voice, p.category, p.visibility, p.badge, p.color, p.starter_messages_json, p.published_at,
        (SELECT COUNT(*) FROM persona_installs pi WHERE pi.persona_id = p.id) as install_count
       FROM personas p
       WHERE p.visibility = 'public' AND p.status = 'active'
       ORDER BY p.published_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all();

  return (results ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    slug: (r.slug as string) || (r.id as string),
    name: r.name as string,
    tagline: (r.tagline as string) || '',
    description: (r.description as string) || '',
    avatarUrl: (r.avatar_url as string) || '',
    voice: r.voice as string,
    category: r.category as string,
    visibility: 'public' as const,
    badge: r.badge as string | undefined,
    color: r.color as string | undefined,
    installCount: r.install_count as number,
    publishedAt: r.published_at as string,
  }));
}

export async function recordShare(
  db: D1Database,
  personaId: string,
  userId: string | null,
  channel: string
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO persona_shares (id, persona_id, user_id, channel, created_at) VALUES (?, ?, ?, ?, ?)`
    )
    .bind(crypto.randomUUID(), personaId, userId, channel, new Date().toISOString())
    .run();
}
