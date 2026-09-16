export type UserRole = 'OWNER' | 'ADMIN' | 'SUPPORT' | 'MODERATOR' | 'ANALYST';

export async function getUserRoles(db: D1Database, userId: string): Promise<UserRole[]> {
  const { results } = await db
    .prepare(`SELECT role FROM user_roles WHERE user_id = ?`)
    .bind(userId)
    .all<{ role: string }>();
  return (results ?? []).map((r) => r.role as UserRole);
}

export async function userHasRole(
  db: D1Database,
  userId: string,
  role: UserRole
): Promise<boolean> {
  const row = await db
    .prepare(`SELECT 1 as ok FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1`)
    .bind(userId, role)
    .first<{ ok: number }>();
  return Boolean(row?.ok);
}

export async function grantRole(
  db: D1Database,
  userId: string,
  role: UserRole,
  grantedBy?: string
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT OR IGNORE INTO user_roles (user_id, role, granted_at, granted_by)
       VALUES (?, ?, ?, ?)`
    )
    .bind(userId, role, now, grantedBy ?? null)
    .run();
}
