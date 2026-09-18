# Goal mode state

**Objective:** Verified Economics & Owner Control Center — проверяемая экономика AI, versioned pricing, достоверный Owner Control Center (desktop + mobile).

**Last updated:** 2026-09-18 UTC  
**Current phase:** Phase B–D (in progress) — Model Registry + Cost confidence  
**Previous phase:** Production Economy & Reliability — **shipped** on production (see reconciliation)

## Production snapshot

| Field | Value |
|-------|--------|
| **Current production SHA** | `840608fed00c39ce731a00a95f6d8e2bbee03a2a` |
| **Last successful deploy** | GitHub Actions `35327168946` — 2026-09-18 — success |
| **Last migration applied (remote D1)** | `0009_phase15_rate_limits.sql` (0001–0009 all applied) |
| **Pending migrations (local only)** | `0010`–`0012` (cost_confidence, pricing_entry_id, cost_breakdown) — not deployed |
| **CI status (last `main` push)** | Green — verify + deploy succeeded |
| **Production health** | `GET https://beta.persony.org/api/health` → ok, database ready |
| **Production smoke (economics)** | **NOT RUN** — owner economics + inference detail E2E open |
| **Local uncommitted WIP** | UI/dev-mode fixes (not on production) — do not mix with economics commits |

Full item-by-item audit: [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md)

## Gate table

| Gate | Status | Evidence | Limitation / next proof |
|------|--------|----------|-------------------------|
| Truth reconciliation doc | implemented | `docs/ECONOMICS_RECONCILIATION.md` | expand as phases complete |
| GOAL_MODE_STATE accurate | implemented | this file | refresh after each deploy |
| Central Model Registry | implemented (local) | `worker/ai/model-registry.ts`, `specs/ai-model-registry.md` | Owner API exposure + prod smoke |
| Model IDs verified vs provider docs | partial | registry `lastVerifiedAt` 2026-09-18 | avatar still preview models |
| Versioned Pricing Catalog 2.0 | implemented (local) | `pricing-catalog.ts`, `GET /owner/pricing` | avatar/voice dimensions + DB-backed catalog |
| pricing_entry_id on inference_runs | implemented (local) | migration 0011 | deploy |
| Cost confidence (actual/estimated/unpriced) | implemented (local) | `cost-confidence.ts`, migration 0010, CostEngine | deploy + backfill verification |
| pricing_entry_id on inference_runs | open | — | Phase C/D migration |
| Provider usage from API (not estimated) | open | `mergeProviderUsage` fallback common | Phase D |
| Voice Call economics breakdown | open | single reservation path | Phase D/J |
| Energy retail config (no hardcoded 2.5) | open | `energyUnitsFromProviderCost` | Phase E |
| Owner Shell + section APIs | partial (local) | `OwnerShell`, modular sections, mobile nav | full IA + remaining sections |
| Inference Explorer + detail | implemented (local) | `GET /owner/inference`, detail + cost breakdown UI | deploy + prod E2E |
| Cost coverage in dashboards | partial (local) | `economics-service.ts`, Owner Console label | deploy migration 0010 |
| Economics vertical slice E2E | open | — | Phase M milestone 1 |
| Paddle live | not applicable | `BILLING_ENABLED=false` | separate launch |

### Carried forward from Production Economy (done on prod)

| Gate | Status | Evidence |
|------|--------|----------|
| Energy reserve → settle → release | production-verified (code) | `energy-service.ts`, migration 0008 |
| inference_runs economy columns | production-verified (schema) | migration 0008 applied remote |
| Rate limits | production-verified (code) | migration 0009 applied remote |
| Owner economics API (aggregate) | implemented | `GET /owner/economics` |
| Community Discover | implemented | Discover UI + repository |
| CI/CD deploy pipeline | ci-verified | run `35327168946` |

## Manual verification gates

| Check | Status |
|-------|--------|
| Controlled text chat inference → cost in DB → owner economics | **open** |
| Inference detail explains cost line-by-line | **open** |
| Voice Call short call → duration + cost breakdown | **open** |
| Avatar generation → image model + cost | **open** |
| Owner Console on 390px / 1440px | **open** |
| Voice device/soak tests | **open** — `specs/voice-call-device-testing.md` |

## Next task

**Milestone 1 prep:** deploy migrations `0010`–`0012`, controlled text-chat inference in production, verify Inference Explorer shows explainable COGS.

**Next:** ProviderUsage expansion (audio tokens), Owner Shell refactor, mobile layout.

## Execution order (from goal brief)

```text
A Truth reconciliation     ← current
B Model Registry
C Pricing Catalog 2.0
D ProviderUsage + CostEngine 2.0
E Energy / retail / margin
F Owner backend APIs
G Owner Console desktop
H Owner Console mobile
I Inference Explorer
J Voice / Users / Personas analytics
K Tests
L Documentation sync
M Production deploy + verification
```

**Vertical slice first (Milestone 1):** real inference → usage → pricing → cost → energy → DB → Owner Inference Detail — before scaling full dashboard.
