import { generateId } from '../lib/ids';

export async function writeAuditLog(
  db: D1Database,
  input: {
    actorUserId: string;
    action: string;
    targetType: string;
    targetId?: string;
    oldState?: unknown;
    newState?: unknown;
    reason?: string;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO audit_log (
        id, actor_user_id, action, target_type, target_id, old_state_json, new_state_json, reason, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      input.actorUserId,
      input.action,
      input.targetType,
      input.targetId ?? null,
      input.oldState != null ? JSON.stringify(input.oldState) : null,
      input.newState != null ? JSON.stringify(input.newState) : null,
      input.reason ?? null,
      now
    )
    .run();
}
