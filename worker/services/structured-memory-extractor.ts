import { GEMINI_CHAT_MODELS } from '../lib/models';
import { classifyProviderError, shouldFallbackToNextModel } from '../lib/provider-errors';
import { getAIClient } from '../lib/gemini';
import type { MemoryExtractionCandidate, MemoryExtractor } from './memory-extractor';

const SKIP_PATTERNS = [
  /^(ok|thanks|thank you|спасибо|понял|да|нет|hi|hello|привет)[.!?]*$/i,
];

export class StructuredMemoryExtractor implements MemoryExtractor {
  constructor(private readonly apiKey: string) {}

  async extract(input: {
    userMessage: string;
    assistantMessage?: string;
    personaId: string;
    locale?: string;
  }): Promise<MemoryExtractionCandidate[]> {
    const trimmed = input.userMessage.trim();
    if (!trimmed || trimmed.length < 8) return [];
    if (SKIP_PATTERNS.some((p) => p.test(trimmed))) return [];

    const replyLanguage = input.locale?.startsWith('ru') ? 'Russian' : 'English';
    const prompt = `Extract durable user context from this chat turn for a persona messenger.
Return JSON array only. Each item:
{
  "scope": "user" | "relationship",
  "kind": "fact" | "preference" | "goal" | "project" | "decision" | "instruction" | "relationship" | "open_task",
  "content": "short memory sentence",
  "normalized_key": "stable_snake_case_key",
  "confidence": 0.0-1.0,
  "importance": 0.0-1.0,
  "sensitivity": "normal" | "sensitive" | "special_category",
  "action": "create" | "update" | "supersede" | "ignore"
}

Rules:
- relationship scope only for persona-specific context (use persona id context mentally).
- Do NOT store greetings, filler, temporary details, quoted text, or assistant guesses.
- If user changes a preference, use action "supersede" with the new preference content.
- If nothing durable, return [].
- Write memory content in ${replyLanguage}.

Persona id: ${input.personaId}
User: ${trimmed}
${input.assistantMessage ? `Assistant: ${input.assistantMessage}` : ''}`;

    const ai = getAIClient(this.apiKey);
    let lastErr: unknown = null;

    for (const model of GEMINI_CHAT_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        });

        const raw = response.text?.trim() || '[]';
        type RawCandidate = {
          scope?: string;
          kind?: string;
          content?: string;
          normalized_key?: string;
          normalizedKey?: string;
          confidence?: number;
          importance?: number;
          sensitivity?: MemoryExtractionCandidate['sensitivity'];
          action?: MemoryExtractionCandidate['action'];
        };

        const parsed = JSON.parse(raw) as RawCandidate[];
        if (!Array.isArray(parsed)) return [];

        return parsed
          .filter((item) => item && item.action !== 'ignore' && item.content?.trim())
          .map((item) => ({
            scope: item.scope === 'relationship' ? 'relationship' : 'user',
            kind: (item.kind || 'fact') as MemoryExtractionCandidate['kind'],
            content: item.content!.trim(),
            normalizedKey: (item.normalized_key || item.normalizedKey || item.content || '')
              .toLowerCase()
              .slice(0, 120),
            confidence: Math.min(1, Math.max(0, Number(item.confidence) || 0.7)),
            importance: Math.min(1, Math.max(0, Number(item.importance) || 0.5)),
            sensitivity: item.sensitivity || 'normal',
            action: item.action || 'create',
          }));
      } catch (err) {
        lastErr = err;
        const kind = classifyProviderError(err);
        if (!shouldFallbackToNextModel(kind, false)) break;
      }
    }

    if (lastErr) throw lastErr;
    return [];
  }
}
