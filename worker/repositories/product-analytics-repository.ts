import { generateId } from '../lib/ids';

export const BATTERY_TOPUP_CLICK_EVENT = 'battery_topup_click';

export async function recordProductAnalyticsEvent(
  db: D1Database,
  input: {
    userId: string;
    eventName: string;
    properties?: Record<string, unknown>;
  }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .prepare(
      `INSERT INTO product_analytics_events (id, user_id, event_name, properties_json, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(
      generateId(),
      input.userId,
      input.eventName,
      input.properties ? JSON.stringify(input.properties) : null,
      now
    )
    .run();
}

export type BatteryTopupClickRow = {
  userId: string;
  displayName: string | null;
  username: string | null;
  clickCount: number;
  lastClickedAt: string;
};

export async function getBatteryTopupClickStats(db: D1Database): Promise<{
  totalClicks: number;
  uniqueUsers: number;
  byUser: BatteryTopupClickRow[];
}> {
  const totals = await db
    .prepare(
      `SELECT COUNT(*) as total, COUNT(DISTINCT user_id) as unique_users
       FROM product_analytics_events
       WHERE event_name = ?`
    )
    .bind(BATTERY_TOPUP_CLICK_EVENT)
    .first<{ total: number; unique_users: number }>();

  const rows = await db
    .prepare(
      `SELECT
         e.user_id as user_id,
         u.display_name as display_name,
         u.username as username,
         COUNT(*) as click_count,
         MAX(e.created_at) as last_clicked_at
       FROM product_analytics_events e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.event_name = ?
       GROUP BY e.user_id
       ORDER BY click_count DESC, last_clicked_at DESC
       LIMIT 100`
    )
    .bind(BATTERY_TOPUP_CLICK_EVENT)
    .all<{
      user_id: string;
      display_name: string | null;
      username: string | null;
      click_count: number;
      last_clicked_at: string;
    }>();

  return {
    totalClicks: totals?.total ?? 0,
    uniqueUsers: totals?.unique_users ?? 0,
    byUser: (rows.results ?? []).map((row) => ({
      userId: row.user_id,
      displayName: row.display_name,
      username: row.username,
      clickCount: row.click_count,
      lastClickedAt: row.last_clicked_at,
    })),
  };
}
