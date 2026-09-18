# Goal mode state

**Objective:** Verified Economics & Owner Control Center — проверяемая экономика AI, versioned pricing, достоверный Owner Control Center (desktop + mobile).

**Last updated:** 2026-09-18 UTC  
**Current phase:** Milestone 1 — Economics Truth E2E verification  
**Previous phase:** Production Economy & Reliability — **shipped** on production

## Production snapshot

| Field | Value |
|-------|--------|
| **Current production SHA** | `d999491` — gitSha health, Inference Explorer, settings/routing, users detail |
| **Local ahead of origin** | synced (`main` pushed 2026-09-18) |
| **Last successful deploy** | GitHub Actions — 2026-09-18 |
| **Last migration applied (remote D1)** | `0013_operation_type_normalize.sql` (0001–0013) |
| **CI status (last `main` push)** | Green |
| **Production health** | `GET https://beta.persony.org/api/health` → ok, `gitSha: d99949180a3c`, database ready |
| **Production smoke (economics)** | **NOT RUN** |
| **Local uncommitted WIP** | UI/dev-mode fixes — separate from economics commits |

Full item-by-item audit: [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md)

## Gate table

| Gate | Status | Evidence | Limitation / next proof |
|------|--------|----------|-------------------------|
| Truth reconciliation doc | implemented | `docs/ECONOMICS_RECONCILIATION.md` | refresh after deploy |
| Central Model Registry | deployed | `worker/ai/model-registry.ts` | prod model smoke per operation |
| Versioned Pricing Catalog 2.0 | deployed | `pricing-catalog.ts`, `GET /owner/pricing` | DB-backed catalog admin |
| Cost confidence | deployed | migration 0010, CostEngine | controlled inference E2E |
| Provider usage from API | **partial** | Gemini/DeepSeek stream usage | voice/transcribe/avatar estimated |
| Voice Call economics | deployed | `voice-call-inference-service.ts` | duration estimate, not provider usage |
| Owner Shell + sections | **partial** | economy/inference/pricing/users/personas/errors/settings | users detail, voice section |
| Inference Explorer | deployed + local | filters, operation column, detail meta | prod E2E smoke |
| Routing matrix UI | **local** | `listOwnerRoutingMatrix`, Owner AI section | deploy + verify |
| Feature flags UI | **local** | Owner Settings section | deploy + verify |
| METRICS.md + owner-console.md | implemented | docs synced | — |
| Economics vertical slice E2E | open | — | Milestone 1 |

## Manual verification gates

| Check | Status |
|-------|--------|
| Controlled text chat inference → cost in DB → owner economics | **open** |
| Inference detail explains cost line-by-line | **open** |
| Voice Call short call → duration + cost breakdown | **open** |
| Owner Console on 390px / 1440px | **open** |

## Next task

1. **Push + deploy** `c64ac1f` and follow-up owner settings commit → confirm `gitSha` on `/api/health`
2. **Milestone 1 smoke:** [`docs/PRODUCTION_ECONOMICS_SMOKE.md`](./PRODUCTION_ECONOMICS_SMOKE.md)
3. Users detail view, DB-backed pricing admin, provider-reported voice usage
