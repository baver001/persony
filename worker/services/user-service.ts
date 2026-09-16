import type { AuthProvider, PersonyUser } from '../domain/user';
import { grantRole } from '../repositories/role-repository';
import { createUser, findUserByAuthProviderId } from '../repositories/user-repository';
import { ensureAthenaInstalled } from '../repositories/user-persona-repository';
import type { PersonyEnv } from '../types/env';

function parseOwnerClerkIds(env?: PersonyEnv): string[] {
  const raw = env?.PERSONY_OWNER_CLERK_IDS;
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export async function getOrCreateUserByAuthIdentity(
  db: D1Database,
  provider: AuthProvider,
  providerUserId: string,
  env?: PersonyEnv
): Promise<PersonyUser> {
  const authProviderId = provider === 'dev' ? providerUserId : `clerk:${providerUserId}`;

  const existing = await findUserByAuthProviderId(db, authProviderId);
  if (existing) {
    await ensureAthenaInstalled(db, existing.id);
    if (provider === 'clerk' && parseOwnerClerkIds(env).includes(providerUserId)) {
      await grantRole(db, existing.id, 'OWNER');
    }
    return existing;
  }

  const created = await createUser(db, authProviderId, provider);
  await ensureAthenaInstalled(db, created.id);
  if (provider === 'clerk' && parseOwnerClerkIds(env).includes(providerUserId)) {
    await grantRole(db, created.id, 'OWNER');
  }
  return created;
}
