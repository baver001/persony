# Goal mode state

**Objective:** Verified Economics & Owner Control Center — проверяемая экономика AI, versioned pricing, достоверный Owner Control Center (desktop + mobile).

**Last updated:** 2026-09-18 UTC  
**Current phase:** Milestone 1 — Economics Truth E2E verification  
**Previous phase:** Production Economy & Reliability — **shipped** on production (see reconciliation)

## Production snapshot

| Field | Value |
|-------|--------|
| **Current production SHA** | `6778bd5d07922e7b68658240acd188c4fbf677a8` |
| **Last successful deploy** | GitHub Actions `35341016507` — 2026-09-18 — success |
| **Last migration applied (remote D1)** | `0012_cost_breakdown.sql` (0001–0012 all applied) |
| **CI status (last `main` push)** | Green — verify + deploy succeeded |
| **Production health** | `GET https://beta.persony.org/api/health` → ok, database ready |
| **Production smoke (economics)** | **NOT RUN** — controlled inference E2E + Inference Detail verification open |
| **Local uncommitted WIP** | UI/dev-mode fixes (ChatArea, battery, icons, dev auth) — separate from deployed economics |

Full item-by-item audit: [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md)

## Gate table

| Gate | Status | Evidence | Limitation / next proof |
|------|--------|----------|-------------------------|
| Truth reconciliation doc | implemented | `docs/ECONOMICS_RECONCILIATION.md` | expand as phases complete |
| GOAL_MODE_STATE accurate | implemented | this file | refresh after each deploy |
| Central Model Registry | deployed | `worker/ai/model-registry.ts` | prod model smoke per operation |
| Model IDs verified vs provider docs | partial | registry `lastVerifiedAt` 2026-09-18 | avatar still preview models |
| Versioned Pricing Catalog 2.0 | deployed | `pricing-catalog.ts`, `GET /owner/pricing` | avatar/voice dimensions + DB-backed catalog |
| pricing_entry_id on inference_runs | production-verified (schema) | migration 0011 applied remote | — |
| Cost confidence (actual/estimated/unpriced) | deployed | migration 0010, CostEngine | controlled inference E2E |
| Provider usage from API (not estimated) | open | `mergeProviderUsage` fallback common | Phase D |
| Voice Call economics breakdown | open | single reservation path | Phase D/J |
| Energy retail config (no hardcoded 2.5) | open | `energyUnitsFromProviderCost` | Phase E |
| Owner Shell + section APIs | deployed (partial IA) | `OwnerShell`, mobile nav, economy/inference/pricing | full sections per spec |
| Inference Explorer + detail | deployed | `GET /owner/inference`, Owner Console section | prod E2E smoke |
| Cost coverage in dashboards | deployed | economics API + Owner Console | verify with real inference |
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

**Milestone 1 (Economics Truth):** run controlled text-chat inference in production → verify Inference Explorer cost breakdown + economics coverage %.

**Next:** ProviderUsage expansion, Energy retail config (remove hardcoded 2.5), remaining Owner Console sections.

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
