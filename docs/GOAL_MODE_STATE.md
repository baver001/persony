# Goal mode state

**Objective:** Persony **Beta Release Candidate** — closed beta without commercial billing; all visible surfaces production-quality.

**Last updated:** 2026-09-22 UTC  
**Current phase:** Beta RC — **in progress** (~76%, automated scope complete)  
**Previous phase:** Verified Economics & Owner Control Center — **shipped**

## Production snapshot

| Field | Value |
|-------|--------|
| **Production** | Version `0e51ed4a` |
| **Health** | `GET https://beta.persony.org/api/health` → ok |
| **Billing** | `BILLING_ENABLED=false` (hidden in Settings) |
| **Tests (local)** | 165/165 vitest · `npm run ci` green |
| **Playwright beta-critical** | 11/11 on beta.persony.org (8 smoke + 3 lifecycle opt-in) |

Track live execution: [`docs/BETA_RC_PROGRESS.md`](./BETA_RC_PROGRESS.md)  
Readiness table: [`docs/BETA_READINESS.md`](./BETA_READINESS.md)

## Beta RC gates (§85)

| Gate | Status |
|------|--------|
| Persona Editor P0 | **done** (WIP) |
| Canonical persona IDs | **done** (WIP) |
| Persona DTO round-trip | **done** (WIP) |
| Async cloud save | **done** (WIP) |
| My Personas management | **done** (WIP; auth-gated fetch) |
| Official avatars | **blocked** — user style approval + GEMINI_API_KEY |
| Avatar model `gemini-3.1-flash-image` | **done** (WIP) |
| Discover install verify | **done** |
| Rooms hidden | **done** |
| Owner KPI overview | **done** |
| Playwright beta-critical smoke | **done** |
| Playwright persona lifecycle | **done** (opt-in Clerk) |
| Production acceptance §86 | partial (deployed; manual rows pending) |

## User blockers

See **BLOCKER-1…4** in [`docs/BETA_RC_PROGRESS.md`](./BETA_RC_PROGRESS.md).

## Prior milestone (economics)

Economics milestone evidence remains in [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md) and [`docs/PRODUCTION_ECONOMICS_SMOKE.md`](./PRODUCTION_ECONOMICS_SMOKE.md).
