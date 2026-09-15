# 07 — AI provider router

**Статус:** implemented (locally verified)

## Architecture

- `worker/providers/types.ts` — `AIProvider`, `ProviderUsage`
- `worker/providers/gemini-provider.ts` — Gemini adapter
- `worker/providers/deepseek-provider.ts` — DeepSeek OpenAI-compatible adapter
- `worker/providers/router.ts` — `ModelRouter` feature flags
- `worker/services/inference-service.ts` — unified inference + usage settlement
- `eval/persona-chat.json` — 45 benchmark scenarios

## Env

- `DEEPSEEK_API_KEY`
- `PERSONY_TEXT_PROVIDER=deepseek|gemini`
- `PERSONY_ENABLE_DEEPSEEK=true`
