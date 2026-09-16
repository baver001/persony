import type { AuthProvider, PersonyUser } from '../domain/user';
import { generateId } from '../lib/ids';

type UserRow = {
  id: string;
  auth_provider_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  preferred_locale?: string | null;
  conversation_locale?: string | null;
  created_at: string;
  updated_at: string;
};

function rowToUser(row: UserRow, provider: AuthProvider): PersonyUser {
  return {
    id: row.id,
    authProvider: provider,
    authProviderId: row.auth_provider_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserByAuthProviderId(
  db: D1Database,
  authProviderId: string
): Promise<PersonyUser | null> {
  const row = await db
    .prepare('SELECT * FROM users WHERE auth_provider_id = ?')
    .bind(authProviderId)
    .first<UserRow>();

  if (!row) return null;
  const provider: AuthProvider = authProviderId.startsWith('dev_') ? 'dev' : 'clerk';
  return rowToUser(row, provider);
}

export async function createUser(
  db: D1Database,
  authProviderId: string,
  provider: AuthProvider
): Promise<PersonyUser> {
  const now = new Date().toISOString();
  const id = generateId();

  await db
    .prepare(
      `INSERT INTO users (id, auth_provider_id, display_name, avatar_url, created_at, updated_at)
       VALUES (?, ?, NULL, NULL, ?, ?)`
    )
    .bind(id, authProviderId, now, now)
    .run();

  return {
    id,
    authProvider: provider,
    authProviderId,
    displayName: null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function getUserLocale(db: D1Database, userId: string): Promise<string> {
  const row = await db
    .prepare(`SELECT preferred_locale FROM users WHERE id = ? LIMIT 1`)
    .bind(userId)
    .first<{ preferred_locale?: string | null }>();
  return row?.preferred_locale || 'en';
}

export async function updateUserLocale(
  db: D1Database,
  userId: string,
  preferredLocale: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(`UPDATE users SET preferred_locale = ?, updated_at = ? WHERE id = ?`)
    .bind(preferredLocale, now, userId)
    .run();
}
