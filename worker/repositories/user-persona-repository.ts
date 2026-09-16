import { ATHENA_PERSONA_ID } from '../../shared/personas/athena-spec';
import { generateId } from '../lib/ids';

export type InstalledPersonaRecord = {
  userId: string;
  personaId: string;
  personaVersion: number;
  installedAt: string;
  pinned: boolean;
};

export async function listInstalledPersonas(
  db: D1Database,
  userId: string
): Promise<InstalledPersonaRecord[]> {
  const { results } = await db
    .prepare(
      `SELECT user_id, persona_id, persona_version, installed_at, pinned
       FROM user_personas WHERE user_id = ? ORDER BY installed_at ASC`
    )
    .bind(userId)
    .all<{
      user_id: string;
      persona_id: string;
      persona_version: number;
      installed_at: string;
      pinned: number;
    }>();

  return (results ?? []).map((r) => ({
    userId: r.user_id,
    personaId: r.persona_id,
    personaVersion: r.persona_version,
    installedAt: r.installed_at,
    pinned: r.pinned === 1,
  }));
}

export async function installPersonaForUser(
  db: D1Database,
  userId: string,
  personaId: string,
  personaVersion: number
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO user_personas (user_id, persona_id, persona_version, installed_at, pinned)
       VALUES (?, ?, ?, ?, 0)`
    )
    .bind(userId, personaId, personaVersion, now)
    .run();
}

export async function uninstallPersonaForUser(
  db: D1Database,
  userId: string,
  personaId: string
): Promise<boolean> {
  const result = await db
    .prepare(`DELETE FROM user_personas WHERE user_id = ? AND persona_id = ?`)
    .bind(userId, personaId)
    .run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function ensureAthenaInstalled(
  db: D1Database,
  userId: string,
  athenaVersion = 1
): Promise<void> {
  await installPersonaForUser(db, userId, ATHENA_PERSONA_ID, athenaVersion);
}
