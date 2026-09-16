import { describe, expect, it } from 'vitest';
import { ATHENA_SPEC_V1 } from '../../shared/personas/athena-spec';
import { compilePersonaInstructions, parsePersonaSpec } from './persona-compiler';

describe('PersonaCompiler', () => {
  it('parses PersonaSpec v1 from configuration JSON', () => {
    const parsed = parsePersonaSpec(JSON.stringify(ATHENA_SPEC_V1));
    expect(parsed?.identity.slug).toBe('athena');
  });

  it('compiles platform safety and mission into runtime instructions', () => {
    const compiled = compilePersonaInstructions(ATHENA_SPEC_V1, 'Athena', {
      locale: 'en',
      userMemoryBlock: '- (fact) Works on Persony',
    });
    expect(compiled).toContain('platform safety');
    expect(compiled).toContain('Thinking partner');
    expect(compiled).toContain('Works on Persony');
  });
});
