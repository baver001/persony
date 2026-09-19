/**
 * SQL time windows aligned with worker/services/economics-service.ts (isoDaysAgo).
 */
export function isoDaysAgo(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

/** Escape single quotes for inline D1 SQL literals. */
export function sqlLiteral(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

export function sinceStartedAtSql(days) {
  return `started_at >= ${sqlLiteral(isoDaysAgo(days))}`;
}
