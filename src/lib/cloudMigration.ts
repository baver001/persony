import type { Persona } from '../types';
import type { ChatMessage } from '../types';

const MIGRATION_VERSION_KEY = 'persony_cloud_migration_v1';

export type LocalPersonyExport = {
  schemaVersion: 1;
  personas: Persona[];
  messagesByPersona: Record<string, ChatMessage[]>;
  exportedAt: number;
};

export function buildLocalExport(
  personas: Persona[],
  messagesByPersona: Record<string, ChatMessage[]>
): LocalPersonyExport {
  return {
    schemaVersion: 1,
    personas,
    messagesByPersona,
    exportedAt: Date.now(),
  };
}

export function isCloudMigrationCompleted(): boolean {
  return localStorage.getItem(MIGRATION_VERSION_KEY) === 'done';
}

export function markCloudMigrationCompleted(): void {
  localStorage.setItem(MIGRATION_VERSION_KEY, 'done');
}
