import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  hasLegacyLocalData,
  isImportPromptDismissed,
  markImportPromptDismissed,
  shouldOfferLocalImport,
} from './cloudMigration';

const PERSONAS_KEY = 'persony_personas_v1';
const MIGRATION_KEY = 'persony_cloud_migration_v1';

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

beforeEach(() => {
  installLocalStorageMock();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('cloudMigration import prompt', () => {
  it('offers import when legacy custom personas exist and prompt not dismissed', () => {
    localStorage.setItem(
      PERSONAS_KEY,
      JSON.stringify([{ id: 'local-1', name: 'Test', isCustom: true }])
    );
    expect(hasLegacyLocalData()).toBe(true);
    expect(shouldOfferLocalImport()).toBe(true);
  });

  it('suppresses import prompt after dismiss without clearing legacy data', () => {
    localStorage.setItem(
      PERSONAS_KEY,
      JSON.stringify([{ id: 'local-1', name: 'Test', isCustom: true }])
    );
    markImportPromptDismissed();
    expect(isImportPromptDismissed()).toBe(true);
    expect(hasLegacyLocalData()).toBe(true);
    expect(shouldOfferLocalImport()).toBe(false);
  });

  it('does not offer import after migration completed', () => {
    localStorage.setItem(
      PERSONAS_KEY,
      JSON.stringify([{ id: 'local-1', name: 'Test', isCustom: true }])
    );
    localStorage.setItem(MIGRATION_KEY, 'done');
    expect(shouldOfferLocalImport()).toBe(false);
  });
});
