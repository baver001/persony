import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildCustomPersonaSpec } from '../../shared/persona-spec/build-custom-spec';
import { toPersonaOwnerDTO } from '../domain/persona-dto';
import {
  createPersonaInDb,
  updatePersonaInDb,
} from '../repositories/persona-repository';
import { enrichPersonaCreateInput } from '../services/persona-spec-builder';
import { parsePersonaSpec } from '../services/persona-compiler';
import { createTestD1 } from '../test/sqlite-d1';

const migrationsDir = join(process.cwd(), 'worker/db/migrations');
const userId = 'user_roundtrip_1';

function buildSpecJson(name: string, warmth: number) {
  return JSON.stringify(
    buildCustomPersonaSpec({
      slug: `custom_${name.toLowerCase()}`,
      name,
      description: `${name} description`,
      tagline: `${name} tagline`,
      style: { warmth, directness: 50, creativity: 50, formality: 40, verbosity: 45, humor: 35 },
      starterMessages: [`Hello from ${name}`],
    })
  );
}

describe('persona configurationJson round-trip', () => {
  let db: D1Database;

  beforeEach(() => {
    db = createTestD1(migrationsDir);
  });

  it('persists configurationJson through create → owner DTO → reload', async () => {
    const configurationJson = buildSpecJson('Alpha', 72);
    const enriched = enrichPersonaCreateInput({
      name: 'Alpha',
      tagline: 'Alpha tagline',
      description: 'Alpha description',
      systemPrompt: 'fallback prompt',
      avatarUrl: 'https://example.com/a.png',
      voice: 'Puck',
      category: 'custom',
      visibility: 'private',
      configurationJson,
      behaviorProfile: { warmth: 72 },
    });

    const created = await createPersonaInDb(db, userId, enriched, { slug: 'alpha' });
    const dto = toPersonaOwnerDTO(created);

    expect(dto.configurationJson).toBeTruthy();
    const parsed = parsePersonaSpec(dto.configurationJson);
    expect(parsed?.behavior.profile.warmth).toBe(72);
    expect(dto.systemPrompt).toContain('Alpha');
    expect(dto.systemPrompt).not.toBe('fallback prompt');
  });

  it('updates configurationJson on edit without losing prior version semantics', async () => {
    const created = await createPersonaInDb(
      db,
      userId,
      enrichPersonaCreateInput({
        name: 'Beta',
        tagline: 'Beta tag',
        description: 'Beta desc',
        systemPrompt: 'Beta prompt',
        avatarUrl: 'https://example.com/b.png',
        voice: 'Aoede',
        category: 'creative',
        visibility: 'private',
        configurationJson: buildSpecJson('Beta', 40),
      }),
      { slug: 'beta' }
    );

    const updated = await updatePersonaInDb(db, userId, created.id, {
      name: 'Beta Prime',
      tagline: 'Updated tag',
      description: 'Updated desc',
      systemPrompt: 'Updated prompt',
      avatarUrl: 'https://example.com/b2.png',
      voice: 'Aoede',
      category: 'creative',
      visibility: 'unlisted',
      configurationJson: buildSpecJson('Beta Prime', 88),
    });

    expect(updated.currentVersion).toBe(2);
    expect(updated.visibility).toBe('unlisted');
    const parsed = parsePersonaSpec(updated.configurationJson);
    expect(parsed?.behavior.profile.warmth).toBe(88);
    expect(updated.name).toBe('Beta Prime');
  });
});
