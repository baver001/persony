# Goal mode state

**Objective:** Persony **Beta Release Candidate** — closed beta without commercial billing; all visible surfaces production-quality.

**Last updated:** 2026-09-23 UTC  
**Current phase:** Beta RC — **in progress** (~76%, automated scope complete)  
**Previous phase:** Verified Economics & Owner Control Center — **shipped**

## Production snapshot

| Field | Value |
|-------|--------|
| **Production** | git `af3a78d` · https://beta.persony.org |
| **Health** | `GET /api/health` → ok |
| **Local `main`** | **9 commits ahead** of `origin/main` (E2E + docs; not deployed) |
| **Billing** | `BILLING_ENABLED=false` (hidden in Settings) |
| **Tests (local)** | 165/165 vitest · `npm run ci` green |
| **Playwright beta-critical** | **12/12** on prod (2026-09-23; Clerk opt-in for 4 specs) |

Track live execution: [`docs/BETA_RC_PROGRESS.md`](./BETA_RC_PROGRESS.md)  
Readiness table: [`docs/BETA_READINESS.md`](./BETA_READINESS.md)

## Beta RC gates (§85)

| Gate | Status |
|------|--------|
| Persona Editor P0 | **done** |
| Canonical persona IDs | **done** |
| Persona DTO round-trip | **done** |
| Async cloud save | **done** |
| My Personas management | **done** |
| Official avatars | **blocked** — paid Gemini image quota + visual approve |
| Avatar model `gemini-3.1-flash-image` | **done** |
| Discover install | **done** (E2E discover-install) |
| Rooms hidden | **done** |
| Owner KPI overview | **done** |
| Playwright beta-critical | **done** (12/12) |
| Production acceptance §86 | **partial** (manual rows + user blockers) |

## User blockers

See **BLOCKER-1…4** in [`docs/BETA_RC_PROGRESS.md`](./BETA_RC_PROGRESS.md) and [`docs/USER_TASKS.md`](./USER_TASKS.md) §8.

## Prior milestone (economics)

Economics milestone evidence remains in [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md) and [`docs/PRODUCTION_ECONOMICS_SMOKE.md`](./PRODUCTION_ECONOMICS_SMOKE.md).
