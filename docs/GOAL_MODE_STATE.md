# Goal mode state

**Objective:** Развить Persony из локального MVP-мессенджера в платформу persistent AI personas (create · share · work) без переписывания рабочего приложения с нуля.

**Last updated:** 2026-09-16 UTC  
**Current phase:** Phase 1.1 — Integrity Hardening (complete locally; deploy verification pending)

## Master roadmap (v2)

| Phase | Scope |
|-------|--------|
| **1.1** | Integrity Hardening — idempotency, soft delete, pinning, pagination, Live server context |
| **1.2** | Persona + Memory + Data + Trust Foundation |
| **1.3** | Curated Discover |
| **2** | Multi-provider AI |
| **3** | Energy + Trial |
| **4** | Payments (Paddle) |
| **5+** | Catalog, Rooms, tools, OSS |

## Phase 1.1 gate table

| Gate | Status | Evidence |
|------|--------|----------|
| `inference_runs` + E2E idempotency | local verified | migration `0003`, `chat-service`, `inference-run-repository` |
| Retry reuses `clientRequestId` (no duplicate user bubble) | local verified | `App.tsx` `runChatInference` / `handleRetryMessage` |
| Import fully idempotent (user + persona messages) | local verified | `import-service` keys `import:local_v1:*`, integration test |
| Conversation soft delete (`status`, `deleted_at`) | local verified | `conversation-repository`, DELETE route |
| Persona version pinned per conversation | local verified | `getPersonaVersion` in chat + Live |
| Frontend history pagination (scroll-up) | local verified | `ChatArea` + `App.tsx` `handleLoadOlderMessages` |
| Clear Chat → server soft-delete | local verified | `handleClearChat` + `deleteConversation` API |
| Live context server-authoritative | local verified | `live-context-service`, WS init without client history |
| Integration tests (D1 SQLite harness) | local verified | `worker/integration/phase11-integrity.test.ts` (7 cases) |
| lint / build / test | local verified | 39 tests, `tsc --noEmit`, `vite build` |
| D1 migration `0003` remote | open | `npm run db:migrate:remote` on deploy |
| CI green after push | open | GitHub Actions |
| Production smoke test | open | beta.persony.org after deploy |

## External tasks

1. Push branch + confirm CI green.
2. Apply D1 migration `0003` on production (`db:migrate:remote`).
3. Smoke: retry, clear chat, scroll history, Live call init.

## Next independent task

**Stop before Phase 1.2.** After production smoke: audit Phase 1.1 with user, then start PersonaSpec / Memory / Owner Console (Phase 1.2).

## Phase transition

- **Phase 1.1** → complete after: CI verified + production smoke + migration `0003` applied
- **Phase 1.2** → Persona + Memory + Data + Trust Foundation (not started)
