# 07 — AI provider router

**Status:** Implemented (Phase 2)  
**Scope:** Text chat only — voice, transcribe, avatar remain Gemini.

## Providers

| ID | Adapter | Models |
|----|---------|--------|
| `google` | `worker/providers/gemini-chat-provider.ts` | `gemini-3.8-flash`, `gemini-3.5-flash-lite` |
| `deepseek` | `worker/providers/deepseek-chat-provider.ts` | `deepseek-chat`, `deepseek-reasoner` |

## Routing

System setting `chat_text_provider`:

- `google` (default) — Gemini only, DeepSeek fallback if Gemini key missing
- `deepseek` — DeepSeek primary, Gemini fallback
- `auto` — Gemini primary, DeepSeek fallback on transient/model errors

`ModelRouter`: `worker/services/model-router.ts`  
Chat pipeline: `chat-service.ts` → `streamChatWithRouter`.

## Secrets

| Env | Required |
|-----|----------|
| `GEMINI_API_KEY` | Yes (default path) |
| `DEEPSEEK_API_KEY` | Optional — enables DeepSeek routes |

## Eval

Fixture: `eval/persona-chat.json` — manual / future CI persona consistency checks.
