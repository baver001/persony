import { describe, expect, it } from 'vitest';
import type { Persona } from '../types';
import { behaviorProfileFromPersona, resetPersonaForm } from './persona-form';

const personaA: Persona = {
  id: 'persona_a',
  name: 'Alpha',
  tagline: 'Tag A',
  description: 'Desc A',
  systemPrompt: 'Prompt A',
  avatar: 'https://example.com/a.png',
  voice: 'Aoede',
  category: 'tech',
  color: '#111',
  starterMessages: ['Hello A'],
  behaviorProfile: { warmth: 80, directness: 70, creativity: 40, formality: 30, verbosity: 50, humor: 20 },
  isCustom: true,
};

const personaB: Persona = {
  id: 'persona_b',
  name: 'Bravo',
  tagline: 'Tag B',
  description: 'Desc B',
  systemPrompt: 'Prompt B',
  avatar: 'https://example.com/b.png',
  voice: 'Puck',
  category: 'mentor',
  color: '#222',
  starterMessages: ['Hello B'],
  behaviorProfile: { warmth: 10, directness: 90, creativity: 95, formality: 80, verbosity: 15, humor: 5 },
  isCustom: true,
};

const opts = { defaultStarter: 'Hi', defaultGreeting: 'Hey' };

describe('resetPersonaForm', () => {
  it('loads all fields from persona A', () => {
    const form = resetPersonaForm(personaA, opts);
    expect(form.name).toBe('Alpha');
    expect(form.tagline).toBe('Tag A');
    expect(form.systemPrompt).toBe('Prompt A');
    expect(form.avatar).toBe(personaA.avatar);
    expect(form.starter1).toBe('Hello A');
    expect(form.behaviorProfile.warmth).toBe(80);
  });

  it('does not leak persona A values when switching to persona B', () => {
    const formA = resetPersonaForm(personaA, opts);
    const formB = resetPersonaForm(personaB, opts);

    expect(formB.name).toBe('Bravo');
    expect(formB.name).not.toBe(formA.name);
    expect(formB.systemPrompt).toBe('Prompt B');
    expect(formB.behaviorProfile.warmth).toBe(10);
    expect(formB.behaviorProfile).not.toEqual(formA.behaviorProfile);
  });

  it('reads behavior from configurationJson when behaviorProfile missing', () => {
    const persona: Persona = {
      ...personaA,
      behaviorProfile: undefined,
      configurationJson: JSON.stringify({
        behavior: {
          profile: {
            warmth: 42,
            directness: 43,
            creativity: 44,
            formality: 45,
            verbosity: 46,
            humor: 47,
          },
        },
      }),
    };
    const profile = behaviorProfileFromPersona(persona);
    expect(profile.warmth).toBe(42);
    expect(profile.humor).toBe(47);
  });

  it('round-trips B → C → A without stale B in A', () => {
    const personaC: Persona = {
      ...personaB,
      id: 'persona_c',
      name: 'Charlie',
      tagline: 'Tag C',
      systemPrompt: 'Prompt C',
    };
    const a = resetPersonaForm(personaA, opts);
    const b = resetPersonaForm(personaB, opts);
    const c = resetPersonaForm(personaC, opts);
    const aAgain = resetPersonaForm(personaA, opts);

    expect(b.name).toBe('Bravo');
    expect(c.name).toBe('Charlie');
    expect(aAgain.name).toBe('Alpha');
    expect(aAgain.systemPrompt).toBe(a.systemPrompt);
    expect(aAgain.name).not.toBe(b.name);
  });
});
