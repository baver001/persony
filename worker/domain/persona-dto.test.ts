import { describe, expect, it } from 'vitest';
import { toPersonaOwnerDTO, toPersonaPublicDTO } from './persona-dto';
import type { PersonaRecord } from './persona';

const sample: PersonaRecord = {
  id: 'p1',
  ownerUserId: 'user-1',
  name: 'Test',
  tagline: 'tag',
  description: 'desc',
  avatarUrl: 'https://example.com/a.png',
  voice: 'Puck',
  category: 'custom',
  visibility: 'private',
  currentVersion: 1,
  systemPrompt: 'SECRET_PROMPT',
};

describe('persona DTO', () => {
  it('never exposes systemPrompt in public DTO', () => {
    const dto = toPersonaPublicDTO(sample);
    expect(dto).not.toHaveProperty('systemPrompt');
    expect(JSON.stringify(dto)).not.toContain('SECRET_PROMPT');
  });

  it('never exposes systemPrompt for system persona public DTO', () => {
    const systemPersona = { ...sample, ownerUserId: 'system' };
    const dto = toPersonaPublicDTO(systemPersona, true);
    expect(dto.isSystem).toBe(true);
    expect(dto).not.toHaveProperty('systemPrompt');
  });

  it('includes systemPrompt only in owner DTO', () => {
    const dto = toPersonaOwnerDTO(sample);
    expect(dto.systemPrompt).toBe('SECRET_PROMPT');
  });
});
