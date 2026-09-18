# AI Model Registry

**Status:** Phase B — initial registry in code (`worker/ai/model-registry.ts`)  
**Last verified:** 2026-09-18

## Purpose

Single source of truth for:

- ModelRouter / provider adapters
- Owner Console → AI → Models
- Pricing catalog keys
- Route compatibility validation

## Structure

See `AIModelDefinition` in `worker/ai/model-registry.ts`.

## Operations

Normalized in `worker/ai/operations.ts`:

- `chat_text`
- `memory_extract`
- `call_summary`
- `voice_transcription`
- `voice_call`
- `persona_generation`
- `avatar_generation`

## Verification policy

1. Compare every `modelId` to official provider documentation.
2. Set `lastVerifiedAt` and `source` on each entry.
3. Mark `preview` models explicitly; prefer `stable` for production routes when available.
4. Owner Console shows stale warning when `lastVerifiedAt` exceeds configured threshold (TBD).

## Known gaps (2026-09-18)

| Model | Issue |
|-------|--------|
| `gemini-2.0-flash-preview-image-generation` | Preview — needs stable image model decision |
| `gemini-2.0-flash-exp-image-generation` | Experimental preview fallback |
| All Gemini IDs | Not yet live-verified against production API in controlled test |

## Definition of Done (registry phase)

- [x] Central registry file + tests
- [x] `worker/lib/models.ts` derives from registry
- [ ] DeepSeek provider imports models from registry
- [ ] Owner API exposes registry read-only
- [ ] Production model smoke per operation
