# Goal mode state

**Objective:** Развить Persony из локального MVP-мессенджера в платформу persistent AI personas (create · share · work) без переписывания рабочего приложения с нуля.

**Last updated:** 2026-09-15 UTC  
**Current phase:** Phase 1 — Cloud foundation (hardening complete locally)

## Gate table

| Gate | Status | Evidence | Limitation / next proof |
|---|---|---|---|
| Baseline lint / build / test | local verified | `npm run lint`, `build`, `test` 32/32 | — |
| SSE parser + model fallback | local verified | Phase 0 commits | — |
| Health endpoint sanitized | local verified | no `hasApiKey` in `/api/health` | — |
| CORS strict (no arbitrary Origin) | local verified | `cors-policy.test.ts`, integration test | — |
| Dev auth disabled in production | local verified | `env.test.ts`, security integration | — |
| Anonymous billable AI blocked | local verified | security integration tests | — |
| D1 migrations via wrangler apply | local verified | `0001` + `0002`, CI order fixed | remote apply on next deploy |
| Internal user identity (Clerk sub → UUID) | local verified | `user-service`, lazy provisioning | — |
| Persona CRUD + ownership + DTO | local verified | routes + `persona-dto.test.ts` | ownership 403 needs D1 e2e |
| Cloud conversations + server history | local verified | `chat-service`, conversation routes | — |
| localStorage import endpoint + UI | local verified | `/api/import/local-v1`, modal | — |
| Clerk React UI | local verified | `PersonyAuthProvider`, `AuthMenu` | needs `VITE_CLERK_PUBLISHABLE_KEY` |
| Clerk production auth | open | — | `docs/USER_TASKS.md` §1 |
| CI green after push | open | workflow updated | GitHub Actions |
| Production sign-in + cloud chat | open | — | after Clerk secrets + deploy |
| Energy / trial | open | wallet tables in D1 | Phase 3 |

## External tasks

1. **Current task:** Clerk Production instance + `CLERK_SECRET_KEY` + `VITE_CLERK_PUBLISHABLE_KEY` — `docs/USER_TASKS.md` §1.
2. **Waiting:** Paddle (Phase 4), DeepSeek (Phase 2), persony.org domain.

## Next independent task

Push → confirm CI green → configure Clerk production secrets → smoke test cloud chat + import on production URL.

## Phase transition

- **Phase 1** → complete after: CI verified + production Clerk smoke test
- **Phase 2** → Multi-provider AI (DeepSeek adapter, ModelRouter) — separate sprint
