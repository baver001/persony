import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { createTestD1 } from '../test/sqlite-d1';
import {
  getOwnerPersonasAnalytics,
  getOwnerUsersAnalytics,
} from './owner-analytics-service';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('owner-analytics-service', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  it('returns personas with zero inference when no runs', async () => {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO users (id, auth_provider_id, created_at, updated_at)
         VALUES ('u1', 'clerk_1', ?, ?)`
      )
      .bind(now, now)
      .run();
    await db
      .prepare(
        `INSERT INTO personas (
          id, owner_user_id, name, slug, status, visibility, voice, category, created_at, updated_at
        ) VALUES ('p1', 'u1', 'Athena', 'athena', 'active', 'public', 'Puck', 'custom', ?, ?)`
      )
      .bind(now, now)
      .run();

    const rows = await getOwnerPersonasAnalytics(db);
    expect(rows).toHaveLength(1);
    expect(rows[0].inferenceCount30d).toBe(0);
    expect(rows[0].knownCostMicrousd30d).toBe(0);
  });

  it('aggregates user and persona inference counts', async () => {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO users (id, auth_provider_id, created_at, updated_at)
         VALUES ('u1', 'clerk_1', ?, ?)`
      )
      .bind(now, now)
      .run();
    await db
      .prepare(
        `INSERT INTO personas (
          id, owner_user_id, name, slug, status, visibility, voice, category, created_at, updated_at
        ) VALUES ('p1', 'u1', 'Athena', 'athena', 'active', 'public', 'Puck', 'custom', ?, ?)`
      )
      .bind(now, now)
      .run();
    await db
      .prepare(
        `INSERT INTO inference_runs (
          id, user_id, conversation_id, client_request_id, persona_id, persona_version,
          status, provider, model, operation_type, started_at,
          cost_confidence, provider_cost_microusd
        ) VALUES ('r1', 'u1', 'c1', 'req1', 'p1', 1, 'completed', 'google', 'gemini', 'chat_text', ?, 'actual', 5000)`
      )
      .bind(now)
      .run();

    const users = await getOwnerUsersAnalytics(db);
    expect(users[0].inferenceCount7d).toBe(1);
    expect(users[0].knownCostMicrousd7d).toBe(5000);

    const personas = await getOwnerPersonasAnalytics(db);
    expect(personas[0].inferenceCount30d).toBe(1);
    expect(personas[0].knownCostMicrousd30d).toBe(5000);
  });
});
