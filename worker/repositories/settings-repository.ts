import { generateId } from '../lib/ids';

export async function getSystemSetting(
  db: D1Database,
  key: string
): Promise<unknown | null> {
  const row = await db
    .prepare(`SELECT value_json FROM system_settings WHERE key = ? LIMIT 1`)
    .bind(key)
    .first<{ value_json: string }>();
  if (!row?.value_json) return null;
  try {
    return JSON.parse(row.value_json);
  } catch {
    return row.value_json;
  }
}

export async function setSystemSetting(
  db: D1Database,
  key: string,
  value: unknown,
  changedBy: string,
  reason?: string
): Promise<void> {
  const now = new Date().toISOString();
  const valueJson = JSON.stringify(value);
  const oldRow = await db
    .prepare(`SELECT value_json FROM system_settings WHERE key = ? LIMIT 1`)
    .bind(key)
    .first<{ value_json: string }>();

  if (oldRow) {
    await db
      .prepare(`UPDATE system_settings SET value_json = ?, updated_at = ?, updated_by = ? WHERE key = ?`)
      .bind(valueJson, now, changedBy, key)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO system_settings (key, value_json, updated_at, updated_by) VALUES (?, ?, ?, ?)`
      )
      .bind(key, valueJson, now, changedBy)
      .run();
  }

  await db
    .prepare(
      `INSERT INTO system_settings_history (id, key, old_value_json, new_value_json, changed_by, changed_at, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      key,
      oldRow?.value_json ?? null,
      valueJson,
      changedBy,
      now,
      reason ?? null
    )
    .run();
}
