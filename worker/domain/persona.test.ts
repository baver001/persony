import { describe, expect, it } from 'vitest';
import { toPersonaOwnerDTO, toPersonaPublicDTO, type PersonaRecord } from './persona';

const sample: PersonaRecord = {
  id: 'athena',
  ownerUserId: 'system',
  name: 'Athena',
  tagline: 'Strategist',
  description: 'Test persona',
  avatarUrl: 'https://example.com/a.png',
  voice: 'Puck',
  category: 'mentor',
  visibility: 'public',
  currentVersion: 1,
  systemPrompt: 'SECRET PROMPT',
  badge: 'Pro',
  color: '#fff',
  starterMessages: ['Hi'],
};

describe('Persona DTOs', () => {
  it('public DTO never exposes systemPrompt', () => {
    const dto = toPersonaPublicDTO(sample);
    expect(dto.id).toBe('athena');
    expect(dto).not.toHaveProperty('systemPrompt');
    expect(JSON.stringify(dto)).not.toContain('SECRET PROMPT');
  });

  it('owner DTO includes systemPrompt for editing', () => {
    const dto = toPersonaOwnerDTO(sample);
    expect(dto.systemPrompt).toBe('SECRET PROMPT');
    expect(dto.ownerUserId).toBe('system');
  });
});
