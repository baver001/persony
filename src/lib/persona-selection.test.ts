import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Persona } from '../types';
import {
  BETA_DATA_EPOCH,
  migrateBetaPersonaCacheEpoch,
  pickDefaultPersonaId,
  readStoredSelectedPersonaId,
  resolvePersonaById,
  resolvePersonaByIdOptional,
  STORAGE_KEY_BETA_DATA_EPOCH,
  STORAGE_KEY_SELECTED_PERSONA_ID,
  writeStoredSelectedPersonaId,
} from './persona-selection';

const sample: Persona[] = [
  {
    id: 'a',
    name: 'A',
    tagline: '',
    description: '',
    systemPrompt: '',
    avatar: '',
    voice: 'Aoede',
    category: 'custom',
    color: '#000',
  },
  {
    id: 'b',
    name: 'B',
    tagline: '',
    description: '',
    systemPrompt: '',
    avatar: '',
    voice: 'Aoede',
    category: 'custom',
    color: '#000',
  },
];

function installLocalStorageMock() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  });
}

describe('persona-selection', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves selected persona by id', () => {
    expect(resolvePersonaById(sample, 'b').name).toBe('B');
  });

  it('returns null for missing optional id', () => {
    expect(resolvePersonaByIdOptional(sample, 'missing')).toBeNull();
  });

  it('picks first persona id as default', () => {
    expect(pickDefaultPersonaId(sample)).toBe('a');
  });

  it('persists selected persona id', () => {
    writeStoredSelectedPersonaId('b');
    expect(readStoredSelectedPersonaId()).toBe('b');
  });

  it('migrates beta cache epoch and clears stale keys', () => {
    localStorage.setItem(STORAGE_KEY_SELECTED_PERSONA_ID, 'stale');
    localStorage.setItem(STORAGE_KEY_BETA_DATA_EPOCH, '0');
    migrateBetaPersonaCacheEpoch();
    expect(readStoredSelectedPersonaId()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEY_BETA_DATA_EPOCH)).toBe(String(BETA_DATA_EPOCH));
  });
});
