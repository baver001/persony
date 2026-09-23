import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createTestD1 } from '../test/sqlite-d1';
import {
  BATTERY_TOPUP_CLICK_EVENT,
  getBatteryTopupClickStats,
  recordProductAnalyticsEvent,
} from './product-analytics-repository';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('product-analytics-repository', () => {
  it('records battery top-up clicks and aggregates per user', async () => {
    const db = createTestD1(migrationsDir);
    await db
      .prepare(
        `INSERT INTO users (id, display_name, username, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind('user_a', 'Alice', 'alice', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
      .run();
    await db
      .prepare(
        `INSERT INTO users (id, display_name, username, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)`
      )
      .bind('user_b', 'Bob', 'bob', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
      .run();

    await recordProductAnalyticsEvent(db, {
      userId: 'user_a',
      eventName: BATTERY_TOPUP_CLICK_EVENT,
      properties: { source: 'battery_sheet' },
    });
    await recordProductAnalyticsEvent(db, {
      userId: 'user_a',
      eventName: BATTERY_TOPUP_CLICK_EVENT,
    });
    await recordProductAnalyticsEvent(db, {
      userId: 'user_b',
      eventName: BATTERY_TOPUP_CLICK_EVENT,
    });

    const stats = await getBatteryTopupClickStats(db);
    expect(stats.totalClicks).toBe(3);
    expect(stats.uniqueUsers).toBe(2);
    expect(stats.byUser[0]).toMatchObject({ userId: 'user_a', clickCount: 2, displayName: 'Alice' });
    expect(stats.byUser[1]).toMatchObject({ userId: 'user_b', clickCount: 1, displayName: 'Bob' });
  });
});
