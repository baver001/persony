import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertRateLimit, RateLimitError } from '../middleware/rate-limit';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('rate limits', () => {
  it('blocks after limit exceeded in window', async () => {
    const db = createTestD1(migrationsDir);
    const scope = 'test';
    const subject = 'user-1';

    await assertRateLimit(db, scope, subject, 2, 60);
    await assertRateLimit(db, scope, subject, 2, 60);

    await expect(assertRateLimit(db, scope, subject, 2, 60)).rejects.toBeInstanceOf(
      RateLimitError
    );
  });
});
