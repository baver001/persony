import type { AuthProvider, PersonyUser } from '../domain/user';
import { writeAuditLog } from './audit-service';
import { grantRole, userHasRole } from '../repositories/role-repository';
import { createUser, findUserByAuthProviderId } from '../repositories/user-repository';
import type { PersonyEnv } from '../types/env';

function parseOwnerClerkIds(env?: PersonyEnv): string[] {
  const raw = env?.PERSONY_OWNER_CLERK_IDS;
  if (!raw?.trim()) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

async function bootstrapOwnerIfNeeded(
  db: D1Database,
  userId: string,
  provider: AuthProvider,
  providerUserId: string,
  env?: PersonyEnv
): Promise<void> {
  if (provider !== 'clerk') return;
  const allowlist = parseOwnerClerkIds(env);
  if (!allowlist.includes(providerUserId)) return;

  const alreadyOwner = await userHasRole(db, userId, 'OWNER');
  if (alreadyOwner) return;

  await grantRole(db, userId, 'OWNER');
  await writeAuditLog(db, {
    actorUserId: userId,
    action: 'OWNER_ROLE_BOOTSTRAPPED',
    targetType: 'user',
    targetId: userId,
    reason: 'PERSONY_OWNER_CLERK_IDS bootstrap',
  });
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
    await bootstrapOwnerIfNeeded(db, existing.id, provider, providerUserId, env);
    return existing;
  }

  const created = await createUser(db, authProviderId, provider);
  await bootstrapOwnerIfNeeded(db, created.id, provider, providerUserId, env);
  return created;
}
