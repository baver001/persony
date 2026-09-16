import type { AuthProvider, PersonyUser } from '../domain/user';
import { createUser, findUserByAuthProviderId } from '../repositories/user-repository';

export async function getOrCreateUserByAuthIdentity(
  db: D1Database,
  provider: AuthProvider,
  providerUserId: string
): Promise<PersonyUser> {
  const authProviderId = provider === 'dev' ? providerUserId : `clerk:${providerUserId}`;

  const existing = await findUserByAuthProviderId(db, authProviderId);
  if (existing) return existing;

  return createUser(db, authProviderId, provider);
}
