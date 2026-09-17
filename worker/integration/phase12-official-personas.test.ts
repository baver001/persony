import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { PersonaSpecV1Schema } from '../../shared/persona-spec/schema';
import { OFFICIAL_PERSONA_ROSTER } from '../../shared/personas/official-roster';
import { compilePersonaInstructions } from '../services/persona-compiler';
import { ensureOfficialPersonasSeeded } from '../repositories/persona-repository';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');

describe('Phase 1.2 official personas', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  it('validates all six PersonaSpecV1 definitions', () => {
    for (const official of OFFICIAL_PERSONA_ROSTER) {
      const parsed = PersonaSpecV1Schema.safeParse(official.spec);
      expect(parsed.success, official.id).toBe(true);
      expect(official.spec.presentation.localized.en).toBeTruthy();
      expect(official.spec.presentation.localized.ru).toBeTruthy();
    }
  });

  it('produces meaningfully different behavior profiles', () => {
    const profiles = OFFICIAL_PERSONA_ROSTER.map((p) => ({
      id: p.id,
      vector: p.spec.behavior.profile,
    }));
    const athena = profiles.find((p) => p.id === 'athena')!.vector;
    const viktor = profiles.find((p) => p.id === 'viktor')!.vector;
    const sofia = profiles.find((p) => p.id === 'sofia')!.vector;

    expect(viktor.directness).toBeGreaterThan(sofia.directness);
    expect(sofia.empathy).toBeGreaterThan(viktor.empathy);
    expect(athena.skepticism).toBeGreaterThan(sofia.skepticism);
  });

  it('compiles distinct instructions per persona', () => {
    const athena = compilePersonaInstructions(
      OFFICIAL_PERSONA_ROSTER[0]!.spec,
      'Athena',
      { locale: 'en' }
    );
    const viktor = compilePersonaInstructions(
      OFFICIAL_PERSONA_ROSTER.find((p) => p.id === 'viktor')!.spec,
      'Viktor',
      { locale: 'en' }
    );
    expect(athena).toContain('Thinking partner');
    expect(viktor).toContain('Software engineer');
    expect(athena).not.toEqual(viktor);
  });

  it('seeds official personas without duplicating versions', async () => {
    await ensureOfficialPersonasSeeded(db);
    await ensureOfficialPersonasSeeded(db);
    const count = await db
      .prepare(`SELECT COUNT(*) AS c FROM persona_versions`)
      .first<{ c: number }>();
    expect(count?.c).toBe(6);
  });
});
