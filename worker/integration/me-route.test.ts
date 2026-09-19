import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { grantRole } from '../repositories/role-repository';
import { getOrCreateUserByAuthIdentity } from '../services/user-service';
import { createTestD1 } from '../test/sqlite-d1';
import app from '../index';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('GET /api/me', () => {
  it('returns owner profile fields (not shadowed by legacy persona route)', async () => {
    const db = createTestD1(migrationsDir);
    const user = await getOrCreateUserByAuthIdentity(db, 'dev', 'dev_owner_me', {
      DB: db,
      ENVIRONMENT: 'development',
      PERSONY_DEV_MODE: 'true',
    });
    await grantRole(db, user.id, 'OWNER');

    const res = await app.request(
      '/api/me',
      { headers: { 'X-Persony-Dev-User-Id': 'dev_owner_me' } },
      {
        DB: db,
        ENVIRONMENT: 'development',
        PERSONY_DEV_MODE: 'true',
        GEMINI_API_KEY: 'test-key',
      }
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      userId: string;
      isOwner: boolean;
      isAuthenticated: boolean;
      roles: string[];
    };
    expect(body.userId).toBe(user.id);
    expect(body.isAuthenticated).toBe(true);
    expect(body.isOwner).toBe(true);
    expect(body.roles).toContain('OWNER');
    expect((body as { authProvider?: string }).authProvider).toBe('dev');
  });
});
