# Goal mode state

**Objective:** Open platform for persistent AI personas — autonomous roadmap execution.

**Last updated:** 2026-09-16 UTC  
**Current phase:** Phase 1.2 — Persona + Memory + Data + Trust + i18n Foundation (in progress)

## Roadmap

| Phase | Status |
|-------|--------|
| 1.1 Integrity Hardening | **Complete** (local + production deploy) |
| 1.2 Persona + Memory + Trust + i18n | **In progress** |
| 1.3 Curated Discover | Planned |
| 2 Multi-provider AI | Planned |
| 3 Energy + Trial | Planned |
| 4 Payments | Planned |

## Phase 1.1 gate — passed

| Gate | Status |
|------|--------|
| inference_runs idempotency | verified |
| Retry / import / soft delete / pinning / pagination / Clear Chat / Live context | verified |
| Integration tests | 40 tests |
| lint / build / test | green |
| CI | pushed (`0085fde`+) |
| Production | migration `0003`, deploy OK |

## Phase 1.2 progress

| Component | Status |
|-----------|--------|
| PersonaSpec + PersonaCompiler | implemented |
| Athena redesign + auto-install only | implemented |
| Memory service + API + UI | implemented (MVP extraction) |
| i18n EN/RU foundation | implemented |
| Owner RBAC + `/owner` overview | implemented (set `PERSONY_OWNER_CLERK_IDS`) |
| Legal drafts / consent UI | schema only |
| Data export / account deletion | planned |
| Vertical slice E2E in production | pending verification |

## External configuration

- `PERSONY_OWNER_CLERK_IDS` — comma-separated Clerk user IDs for OWNER role
- Legal review before public launch
- Paddle / DeepSeek — later phases

## Next

1. Commit + push Phase 1.2 foundation
2. Apply migration `0004` remote + deploy
3. Production smoke: memory flow, locale switch, owner console
4. Complete Phase 1.2 acceptance (feedback UI, legal acceptance flow, export)
5. Phase 1.3 Discover
