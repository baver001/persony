# Goal mode state

**Objective:** Развить Persony из локального MVP-мессенджера в платформу persistent AI personas (create · share · work) без переписывания рабочего приложения с нуля.

**Last updated:** 2026-09-15 UTC  
**Current phase:** Phase 1 — Cloud foundation (**locally verified**)

## Gate table

| Gate | Status | Evidence | Limitation / next proof |
|---|---|---|---|
| Baseline lint / build / test | verified | `npm run lint`, `build`, `test` 24/24 | — |
| SSE parser + model fallback | verified | Phase 0 commits | — |
| Health endpoint sanitized | verified | no `hasApiKey` in `/api/health` | — |
| D1 schema + migrations 0001–0002 | verified | `worker/db/migrations/` | production: `db:migrate:remote` after push |
| CORS hardened | verified | `worker/middleware/cors.ts` + tests | production same-origin |
| requireAIEntitlement on billable AI | verified | chat/transcribe/generate/live | Energy check in Phase 3 |
| Internal Persony user IDs | verified | `user-repository.ts`, lazy provisioning | — |
| Persona CRUD security + DTOs | verified | POST/PATCH/DELETE, no public systemPrompt | — |
| Cloud conversations API | verified | `worker/routes/conversations.ts` | — |
| Server-authoritative chat path | verified | `conversationId + text` | legacy `messages[]` still supported |
| Clerk UI integration | verified | `@clerk/clerk-react`, `AuthBar` | needs `VITE_CLERK_PUBLISHABLE_KEY` |
| localStorage import modal | verified | `CloudImportModal`, `/api/import/legacy` | — |
| Energy / trial | open | wallet tables in D1 | Phase 3 |
| CI green with D1 migrate step | open | workflow updated | After push |
| Production smoke test | open | — | After deploy + Clerk secrets |

## External tasks

1. **Current task:** Clerk dev instance + secrets — `docs/USER_TASKS.md` §1.
2. **Waiting:** Paddle (Phase 4), DeepSeek (Phase 2), persony.org domain.

## Next independent task

**Phase 2:** `AIProvider` interface, DeepSeek + Gemini adapters, normalized usage, Persona benchmark eval suite (`specs/07-ai-provider-router.md`).
