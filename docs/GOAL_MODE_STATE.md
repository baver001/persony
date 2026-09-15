# Goal mode state

**Objective:** Развить Persony из локального MVP-мессенджера в платформу persistent AI personas (create · share · work) без переписывания рабочего приложения с нуля.

**Last updated:** 2026-09-15 UTC  
**Current phase:** Phase 1 — Cloud foundation (in progress)

## Gate table

| Gate | Status | Evidence | Limitation / next proof |
|---|---|---|---|
| Baseline lint / build / test | verified | `npm run lint`, `build`, `test` 14/14 | — |
| SSE parser + model fallback | verified | Phase 0 commits | — |
| Health endpoint sanitized | verified | no `hasApiKey` in `/api/health` | — |
| D1 schema + remote migration | verified | `db:migrate:remote` 20 queries OK | — |
| Server-authoritative chat/live | verified | `personaId` API, `specs/06` | Custom personas: dev mode or Clerk |
| AuthContext interface | verified | `worker/middleware/auth.ts` | Clerk UI not wired |
| Clerk production auth | open | — | `docs/USER_TASKS.md` §1 |
| Cloud conversations | open | schema only | Phase 1b |
| Energy / trial | open | wallet tables in D1 | Phase 3 |
| CI green with D1 migrate step | open | workflow updated | After push |

## External tasks

1. **Current task:** Clerk dev instance + secrets — `docs/USER_TASKS.md` §1.
2. **Waiting:** Paddle (Phase 4), DeepSeek (Phase 2), persony.org domain.

## Next independent task

Clerk sign-in UI + user webhook → `users` table + localStorage import modal.
