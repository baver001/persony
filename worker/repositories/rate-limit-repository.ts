export async function incrementRateLimitBucket(
  db: D1Database,
  bucketKey: string,
  windowStartMs: number
): Promise<number> {
  const row = await db
    .prepare(
      `INSERT INTO rate_limit_buckets (bucket_key, count, window_start_ms)
       VALUES (?, 1, ?)
       ON CONFLICT(bucket_key) DO UPDATE SET count = count + 1
       RETURNING count`
    )
    .bind(bucketKey, windowStartMs)
    .first<{ count: number }>();

  return row?.count ?? 1;
}
