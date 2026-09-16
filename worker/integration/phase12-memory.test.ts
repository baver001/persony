import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { grantRole } from '../repositories/role-repository';
import { userHasRole } from '../repositories/role-repository';
import { listMemoriesForUser } from '../repositories/memory-repository';
import { ensureAthenaInstalled } from '../repositories/user-persona-repository';
import {
  buildMemoryContextBlocks,
  extractMemoryCandidatesFromText,
  persistMemoryCandidates,
} from '../services/memory-service';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');
const userA = 'user_a';
const userB = 'user_b';
const personaId = 'persona_test';

describe('Phase 1.2 memory foundation', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  it('extracts explicit remember statements', () => {
    const candidates = extractMemoryCandidatesFromText('Remember that I work on Persony');
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].content.toLowerCase()).toContain('work on persony');
  });

  it('does not auto-store special category memory', async () => {
    const stored = await persistMemoryCandidates(
      db,
      userA,
      personaId,
      'conv_1',
      'msg_1',
      'Remember that I have a health diagnosis'
    );
    expect(stored).toHaveLength(0);
  });

  it('stores and retrieves user memory for inference context', async () => {
    await persistMemoryCandidates(
      db,
      userA,
      personaId,
      'conv_1',
      'msg_1',
      'Remember that I work on Persony'
    );

    const memories = await listMemoriesForUser(db, userA, { scope: 'user' });
    expect(memories.length).toBeGreaterThanOrEqual(1);

    const blocks = await buildMemoryContextBlocks(db, userA, personaId, 'Tell me about my project');
    expect(blocks.userBlock).toContain('Persony');
  });

  it('prevents cross-user memory access via repository filters', async () => {
    await persistMemoryCandidates(
      db,
      userA,
      personaId,
      'conv_1',
      'msg_1',
      'Remember that my project is Alpha'
    );

    const foreign = await listMemoriesForUser(db, userB, { scope: 'user' });
    expect(foreign).toHaveLength(0);
  });

  it('grants owner role and checks RBAC', async () => {
    await grantRole(db, userA, 'OWNER');
    expect(await userHasRole(db, userA, 'OWNER')).toBe(true);
    expect(await userHasRole(db, userB, 'OWNER')).toBe(false);
  });

  it('auto-installs Athena for user', async () => {
    await ensureAthenaInstalled(db, userA, 1);
    const row = await db
      .prepare(`SELECT persona_id FROM user_personas WHERE user_id = ?`)
      .bind(userA)
      .first<{ persona_id: string }>();
    expect(row?.persona_id).toBe('athena');
  });
});
