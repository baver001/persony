export function toSqlCount(row: { count?: number | bigint | string } | null | undefined): number {
  if (row?.count == null) return 0;
  const value = typeof row.count === 'bigint' ? Number(row.count) : Number(row.count);
  return Number.isFinite(value) ? value : 0;
}
