export type MemoryScope = 'user' | 'relationship';

export type MemoryKind =
  | 'fact'
  | 'preference'
  | 'goal'
  | 'project'
  | 'decision'
  | 'instruction'
  | 'relationship'
  | 'open_loop';

export type MemoryExtractionAction = 'create' | 'update' | 'supersede' | 'ignore';

export type MemoryExtractionCandidate = {
  scope: MemoryScope;
  kind: MemoryKind;
  content: string;
  normalizedKey: string;
  confidence: number;
  importance: number;
  sensitivity: 'normal' | 'sensitive' | 'special_category';
  action: MemoryExtractionAction;
};

export interface MemoryExtractor {
  extract(input: {
    userMessage: string;
    assistantMessage?: string;
    personaId: string;
    locale?: string;
  }): Promise<MemoryExtractionCandidate[]>;
}

/**
 * Regex/heuristic fallback — kept for offline tests and provider failures.
 */
export class HeuristicMemoryExtractor implements MemoryExtractor {
  async extract(input: { userMessage: string }): Promise<MemoryExtractionCandidate[]> {
    const { extractMemoryCandidatesFromText } = await import('./memory-service');
    const legacy = extractMemoryCandidatesFromText(input.userMessage);
    return legacy.map((c) => ({
      scope: c.scope,
      kind: c.kind as MemoryKind,
      content: c.content,
      normalizedKey: c.content.toLowerCase().slice(0, 120),
      confidence: c.confidence,
      importance: 0.5,
      sensitivity: c.sensitivity,
      action: 'create',
    }));
  }
}
