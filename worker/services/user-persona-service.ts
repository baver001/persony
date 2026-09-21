import { OFFICIAL_PERSONA_IDS } from '../../shared/personas/official-roster';
import {
  ensureOfficialPersonasSeeded,
  getPersonaRecord,
} from '../repositories/persona-repository';
import {
  installPersonaForUser,
  listInstalledPersonas,
} from '../repositories/user-persona-repository';
import type { PersonyEnv } from '../types/env';

/** Ensures all official personas are installed for the user (idempotent). */
export async function ensureOfficialPersonasInstalledForUser(
  env: PersonyEnv,
  db: D1Database,
  userId: string
): Promise<void> {
  await ensureOfficialPersonasSeeded(db);
  const installed = await listInstalledPersonas(db, userId);
  const installedIds = new Set(installed.map((row) => row.personaId));

  for (const officialId of OFFICIAL_PERSONA_IDS) {
    if (installedIds.has(officialId)) continue;
    const persona = await getPersonaRecord(env, db, officialId);
    if (!persona) continue;
    await installPersonaForUser(db, userId, persona.id, persona.currentVersion);
  }
}
