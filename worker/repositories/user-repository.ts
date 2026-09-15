export type AuthProvider = 'clerk' | 'dev';

export type UserRecord = {
  id: string;
  authProvider: AuthProvider;
  authProviderUserId: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

type UserRow = {
  id: string;
  auth_provider: string;
  auth_provider_user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

function rowToUser(row: UserRow): UserRecord {
  return {
    id: row.id,
    authProvider: row.auth_provider as AuthProvider,
    authProviderUserId: row.auth_provider_user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function findUserByAuth(
  db: D1Database,
  authProvider: AuthProvider,
  authProviderUserId: string
): Promise<UserRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, auth_provider, auth_provider_user_id, display_name, avatar_url, created_at, updated_at
       FROM users
       WHERE auth_provider = ? AND auth_provider_user_id = ?`
    )
    .bind(authProvider, authProviderUserId)
    .first<UserRow>();

  return row ? rowToUser(row) : null;
}

export async function createUser(
  db: D1Database,
  authProvider: AuthProvider,
  authProviderUserId: string
): Promise<UserRecord> {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO users (id, auth_provider, auth_provider_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(id, authProvider, authProviderUserId, now, now)
    .run();

  return {
    id,
    authProvider,
    authProviderUserId,
    displayName: null,
    avatarUrl: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function resolveOrCreateUser(
  db: D1Database,
  authProvider: AuthProvider,
  authProviderUserId: string
): Promise<UserRecord> {
  const existing = await findUserByAuth(db, authProvider, authProviderUserId);
  if (existing) return existing;
  return createUser(db, authProvider, authProviderUserId);
}
