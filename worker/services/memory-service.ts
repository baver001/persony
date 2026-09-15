import type { PersonyEnv } from '../types/env';
import {
  deleteMemory,
  getMemoryContext,
  listMemories,
  upsertMemory,
  type MemoryKind,
  type MemoryScope,
} from '../repositories/memory-repository';

export async function extractMemoriesFromExchange(
  env: PersonyEnv,
  input: {
    userId: string;
    personaId: string;
    conversationId: string;
    userText: string;
    assistantText: string;
  }
): Promise<void> {
  if (!env.DB) return;

  const candidates: Array<{ kind: MemoryKind; content: string; scope: MemoryScope }> = [];

  const nameMatch = input.userText.match(/меня зовут\s+([А-Яа-яA-Za-z]+)/i);
  if (nameMatch) {
    candidates.push({ kind: 'fact', content: `Имя пользователя: ${nameMatch[1]}`, scope: 'user' });
  }

  if (input.userText.length > 20 && input.assistantText.length > 40) {
    candidates.push({
      kind: 'summary',
      content: `Обсуждали: ${input.userText.slice(0, 120)}`,
      scope: 'persona_relationship',
    });
  }

  if (/предпочитаю|люблю|не люблю/i.test(input.userText)) {
    candidates.push({
      kind: 'preference',
      content: input.userText.slice(0, 200),
      scope: 'user',
    });
  }

  for (const c of candidates) {
    await upsertMemory(env.DB, {
      userId: input.userId,
      scope: c.scope,
      kind: c.kind,
      content: c.content,
      personaId: c.scope === 'persona_relationship' ? input.personaId : undefined,
      conversationId: c.scope === 'room' ? input.conversationId : undefined,
      confidence: 0.75,
    });
  }
}

export async function buildAugmentedSystemPrompt(
  env: PersonyEnv,
  userId: string,
  basePrompt: string,
  personaId?: string,
  conversationId?: string
): Promise<string> {
  if (!env.DB) return basePrompt;
  const memoryBlock = await getMemoryContext(env.DB, userId, personaId, conversationId);
  return memoryBlock ? `${basePrompt}\n\n${memoryBlock}` : basePrompt;
}

export { listMemories, deleteMemory, upsertMemory, getMemoryContext };
