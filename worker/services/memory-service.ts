import {
  retrieveRelevantMemories,
  touchMemoriesUsed,
  type MemoryKind,
  type MemoryRecord,
  type MemoryScope,
} from '../repositories/memory-repository';
import type { PersonyEnv } from '../types/env';
import { applyMemoryExtractionCandidates } from './memory-application';
import {
  HeuristicMemoryExtractor,
  type MemoryExtractionCandidate as ExtractorCandidate,
} from './memory-extractor';
import { StructuredMemoryExtractor } from './structured-memory-extractor';

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

function legacyCandidatesToExtractor(
  candidates: MemoryExtractionCandidate[]
): ExtractorCandidate[] {
  return candidates.map((c) => ({
    scope: c.scope === 'relationship' ? 'relationship' : 'user',
    kind: c.kind,
    content: c.content,
    normalizedKey: c.content.toLowerCase().slice(0, 120),
    confidence: c.confidence,
    importance: 0.5,
    sensitivity: c.sensitivity,
    action: 'create',
  }));
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
  return applyMemoryExtractionCandidates(
    db,
    userId,
    personaId,
    conversationId,
    userMessageId,
    legacyCandidatesToExtractor(extractMemoryCandidatesFromText(text)),
    options
  );
}

export async function extractAndPersistMemories(
  env: PersonyEnv,
  db: D1Database,
  userId: string,
  personaId: string,
  conversationId: string,
  userMessageId: string,
  userText: string,
  assistantText?: string,
  options?: { locale?: string; allowSensitiveAutoStore?: boolean }
): Promise<MemoryRecord[]> {
  let candidates: ExtractorCandidate[] = [];

  if (env.GEMINI_API_KEY?.trim()) {
    try {
      const extractor = new StructuredMemoryExtractor(env.GEMINI_API_KEY);
      candidates = await extractor.extract({
        userMessage: userText,
        assistantMessage: assistantText,
        personaId,
        locale: options?.locale,
      });
    } catch {
      candidates = await new HeuristicMemoryExtractor().extract({ userMessage: userText });
    }
  } else {
    candidates = await new HeuristicMemoryExtractor().extract({ userMessage: userText });
  }

  if (!candidates.length) {
    candidates = legacyCandidatesToExtractor(extractMemoryCandidatesFromText(userText));
  }

  return applyMemoryExtractionCandidates(
    db,
    userId,
    personaId,
    conversationId,
    userMessageId,
    candidates,
    options
  );
}

export async function acceptMemoryCandidateRecord(
  db: D1Database,
  userId: string,
  candidateId: string
): Promise<MemoryRecord | null> {
  const { getMemoryCandidateForUser, resolveMemoryCandidate } = await import(
    '../repositories/memory-candidate-repository'
  );
  const { insertMemory } = await import('../repositories/memory-repository');

  const candidate = await getMemoryCandidateForUser(db, userId, candidateId);
  if (!candidate || candidate.status !== 'pending') return null;

  const memory = await insertMemory(db, {
    userId,
    scope: candidate.scope === 'room' ? 'user' : candidate.scope,
    kind: candidate.kind,
    content: candidate.content,
    personaId: candidate.personaId,
    conversationId: candidate.conversationId,
    confidence: candidate.confidence,
    sensitivity:
      candidate.sensitivity === 'special_category' || candidate.sensitivity === 'sensitive'
        ? candidate.sensitivity
        : 'normal',
    sourceMessageIds: candidate.sourceMessageId ? [candidate.sourceMessageId] : [],
  });

  await resolveMemoryCandidate(db, userId, candidateId, 'accepted');
  return memory;
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
