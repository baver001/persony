import type { Persona, ChatMessage } from '../types';
import { getApiHeaders } from './api/headers';

const MIGRATION_VERSION_KEY = 'persony_cloud_migration_v1';
const IMPORT_PROMPT_DISMISSED_KEY = 'persony_import_prompt_dismissed_v1';
const STORAGE_KEY_PERSONAS = 'persony_personas_v1';
const STORAGE_KEY_MESSAGES = 'persony_messages_v1';

export type LocalImportPayload = {
  schemaVersion: 1;
  personas: Array<{
    localId: string;
    name: string;
    tagline: string;
    description: string;
    systemPrompt: string;
    avatarUrl: string;
    voice: string;
    category: string;
    badge?: string;
    color?: string;
    starterMessages?: string[];
  }>;
  conversations: Array<{
    localPersonaId: string;
    messages: Array<{
      localId: string;
      sender: 'user' | 'character';
      text: string;
      timestamp?: number;
    }>;
  }>;
};

export function isImportPromptDismissed(): boolean {
  return localStorage.getItem(IMPORT_PROMPT_DISMISSED_KEY) === '1';
}

export function markImportPromptDismissed(): void {
  localStorage.setItem(IMPORT_PROMPT_DISMISSED_KEY, '1');
}

export function shouldOfferLocalImport(): boolean {
  return hasLegacyLocalData() && !isImportPromptDismissed();
}

export function hasLegacyLocalData(): boolean {
  if (isCloudMigrationCompleted()) return false;
  try {
    const personasRaw = localStorage.getItem(STORAGE_KEY_PERSONAS);
    const messagesRaw = localStorage.getItem(STORAGE_KEY_MESSAGES);
    if (!personasRaw && !messagesRaw) return false;

    const personas = personasRaw ? JSON.parse(personasRaw) : [];
    const hasCustom = Array.isArray(personas) && personas.some((p: Persona) => p.isCustom);
    const messages = messagesRaw ? JSON.parse(messagesRaw) : {};
    const hasMessages = Object.values(messages as Record<string, ChatMessage[]>).some(
      (list) => Array.isArray(list) && list.length > 0
    );
    return hasCustom || hasMessages;
  } catch {
    return false;
  }
}

export function buildLocalImportPayload(
  personas: Persona[],
  messagesByPersona: Record<string, ChatMessage[]>
): LocalImportPayload {
  const custom = personas.filter((p) => p.isCustom);

  return {
    schemaVersion: 1,
    personas: custom.map((p) => ({
      localId: p.id,
      name: p.name,
      tagline: p.tagline,
      description: p.description,
      systemPrompt: p.systemPrompt,
      avatarUrl: p.avatar,
      voice: p.voice,
      category: p.category,
      badge: p.badge,
      color: p.color,
      starterMessages: p.starterMessages,
    })),
    conversations: custom
      .map((p) => ({
        localPersonaId: p.id,
        messages: (messagesByPersona[p.id] || [])
          .filter((m) => !m.isCallSummary && !m.isError && !m.isFromVoiceCall)
          .map((m) => ({
            localId: m.id,
            sender: (m.sender === 'user' ? 'user' : 'character') as 'user' | 'character',
            text: m.transcript || m.text,
            timestamp: m.timestamp,
          })),
      }))
      .filter((c) => c.messages.length > 0),
  };
}

export async function importLocalDataToCloud(
  personas: Persona[],
  messagesByPersona: Record<string, ChatMessage[]>
): Promise<{ personaIdMap: Record<string, string> } | null> {
  const payload = buildLocalImportPayload(personas, messagesByPersona);
  if (payload.personas.length === 0 && payload.conversations.length === 0) {
    markCloudMigrationCompleted();
    return { personaIdMap: {} };
  }

  const res = await fetch('/api/import/local-v1', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { personaIdMap?: Record<string, string> };
  markCloudMigrationCompleted();
  return { personaIdMap: data.personaIdMap ?? {} };
}

export function isCloudMigrationCompleted(): boolean {
  return localStorage.getItem(MIGRATION_VERSION_KEY) === 'done';
}

export function markCloudMigrationCompleted(): void {
  localStorage.setItem(MIGRATION_VERSION_KEY, 'done');
}

export function remapPersonaIds(
  personas: Persona[],
  personaIdMap: Record<string, string>
): Persona[] {
  return personas.map((p) => {
    const mapped = personaIdMap[p.id];
    if (!mapped) return p;
    return { ...p, id: mapped };
  });
}

export function remapMessagesByPersona(
  messagesByPersona: Record<string, ChatMessage[]>,
  personaIdMap: Record<string, string>
): Record<string, ChatMessage[]> {
  const next: Record<string, ChatMessage[]> = {};
  for (const [personaId, messages] of Object.entries(messagesByPersona)) {
    const mappedId = personaIdMap[personaId] || personaId;
    next[mappedId] = messages.map((m) => ({ ...m, characterId: mappedId }));
  }
  return next;
}
