import {
  findDuplicateMemory,
  insertMemory,
  retrieveRelevantMemories,
  touchMemoriesUsed,
  type MemoryKind,
  type MemoryRecord,
  type MemoryScope,
} from '../repositories/memory-repository';

const REMEMBER_PATTERNS = [
  /\bremember(?:\s+that)?\s+(.+)/i,
  /\bзапомни(?:\s+что)?\s+(.+)/i,
  /\bmy name is\s+(.+)/i,
  /\bменя зовут\s+(.+)/i,
  /\bi work on\s+(.+)/i,
  /\bя работаю над\s+(.+)/i,
  /\bi prefer\s+(.+)/i,
  /\bя предпочитаю\s+(.+)/i,
];

const SENSITIVE_KEYWORDS = [
  'health',
  'diagnosis',
  'religion',
  'political',
  'sexual',
  'здоров',
  'диагноз',
  'религ',
  'полит',
];

export type MemoryExtractionCandidate = {
  scope: MemoryScope;
  kind: MemoryKind;
  content: string;
  sensitivity: 'normal' | 'sensitive' | 'special_category';
  confidence: number;
};

export function extractMemoryCandidatesFromText(text: string): MemoryExtractionCandidate[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const candidates: MemoryExtractionCandidate[] = [];

  for (const pattern of REMEMBER_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const content = match[1].trim().replace(/[.!?]+$/, '');
      if (content.length < 3 || content.length > 500) continue;
      candidates.push({
        scope: 'user',
        kind: inferKind(content),
        content,
        sensitivity: classifySensitivity(content),
        confidence: 0.85,
      });
    }
  }

  return candidates;
}

function inferKind(content: string): MemoryKind {
  const lower = content.toLowerCase();
  if (lower.includes('prefer') || lower.includes('предпочита')) return 'preference';
  if (lower.includes('goal') || lower.includes('цель')) return 'goal';
  if (lower.includes('project') || lower.includes('проект')) return 'project';
  return 'fact';
}

function classifySensitivity(content: string): 'normal' | 'sensitive' | 'special_category' {
  const lower = content.toLowerCase();
  if (SENSITIVE_KEYWORDS.some((k) => lower.includes(k))) return 'special_category';
  return 'normal';
}

export async function persistMemoryCandidates(
  db: D1Database,
  userId: string,
  personaId: string,
  conversationId: string,
  userMessageId: string,
  text: string,
  options?: { allowSensitiveAutoStore?: boolean }
): Promise<MemoryRecord[]> {
  const candidates = extractMemoryCandidatesFromText(text);
  const stored: MemoryRecord[] = [];

  for (const candidate of candidates) {
    if (candidate.sensitivity !== 'normal' && !options?.allowSensitiveAutoStore) {
      continue;
    }

    const duplicate = await findDuplicateMemory(
      db,
      userId,
      candidate.scope,
      candidate.content,
      candidate.scope === 'relationship' ? personaId : undefined
    );
    if (duplicate) continue;

    const memory = await insertMemory(db, {
      userId,
      scope: candidate.scope,
      kind: candidate.kind,
      content: candidate.content,
      personaId: candidate.scope === 'relationship' ? personaId : undefined,
      conversationId,
      confidence: candidate.confidence,
      sensitivity: candidate.sensitivity,
      sourceMessageIds: [userMessageId],
    });
    stored.push(memory);
  }

  return stored;
}

export async function buildMemoryContextBlocks(
  db: D1Database,
  userId: string,
  personaId: string,
  latestUserText: string
): Promise<{ userBlock: string; relationshipBlock: string; usedMemoryIds: string[] }> {
  const relevant = await retrieveRelevantMemories(db, userId, personaId, latestUserText, 8);
  const userMemories = relevant.filter((m) => m.scope === 'user');
  const relationshipMemories = relevant.filter((m) => m.scope === 'relationship');

  const format = (items: MemoryRecord[]) =>
    items.map((m) => `- (${m.kind}) ${m.content}`).join('\n');

  const usedMemoryIds = relevant.map((m) => m.id);
  if (usedMemoryIds.length) {
    await touchMemoriesUsed(db, usedMemoryIds);
  }

  return {
    userBlock: userMemories.length ? format(userMemories) : '',
    relationshipBlock: relationshipMemories.length ? format(relationshipMemories) : '',
    usedMemoryIds,
  };
}
