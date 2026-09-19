# Goal mode state

**Objective:** Verified Economics & Owner Control Center — проверяемая экономика AI, versioned pricing, достоверный Owner Control Center (desktop + mobile).

**Last updated:** 2026-09-19 UTC  
**Current phase:** Milestone 1 — **complete** (automated gates); optional avatar E2E open  
**Previous phase:** Production Economy & Reliability — **shipped**

## Production snapshot

| Field | Value |
|-------|--------|
| **Current production SHA** | `53fcfd08cb60` (Owner Console apiAuthReady race fix) |
| **Production health** | `GET https://beta.persony.org/api/health` → ok, database ready |
| **Last migration (remote D1)** | `0014_pricing_catalog_db.sql` |
| **CI** | Green (deploy `35435265093`) |
| **Public smoke** | `npm run smoke:economics` (public + D1 + layout contract) |
| **Owner API smoke** | `npm run smoke:economics:mint-owner` |
| **Layout live smoke** | `npm run smoke:economics:layout-live` — **pass** 2026-09-19 |
| **D1 operator smoke** | `npm run smoke:economics:d1` (wrangler remote) |
| **Production smoke (economics)** | **PASS** — operator ✅ + owner API ✅ + layout 390/1440 ✅ |
| **Tests (local)** | 128/128 |

Full audit: [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md)

## Gate table

| Gate | Status | Evidence |
|------|--------|----------|
| Model Registry | deployed | `worker/ai/model-registry.ts`, routing matrix in Owner AI |
| Pricing Catalog 2.0 | deployed | tokens + per_minute + per_image dimensions; DB merge |
| Cost confidence | deployed | actual/estimated/unpriced, `formatMicrousd(null)` → `—` |
| Provider usage | **partial** | chat/transcribe/text-gen actual; voice_call Live `usageMetadata` + duration fallback |
| Voice / transcribe / avatar inference rows | deployed | voice-call, transcribe, avatar services |
| Call summary / persona gen inference rows | deployed | `text-generation-inference-service.ts` |
| Owner Console | **deployed** | economy, inference, pricing, users/personas detail, settings, errors |
| Economics E2E (Milestone 1) | **pass** | D1 + owner API + layout-live (`53fcfd0`) |
| DB-backed pricing admin | deployed | migration `0014`, POST `/owner/pricing/entries`, audit log |
| Immutable inference costs | deployed | `updateInferenceRunEconomics` blocks rewrite after `cost_calculated_at` |
| CI post-deploy economics smoke | deployed | `smoke:economics` public+D1+layout; optional owner via secret |
| Mobile/desktop layout gates | **pass** | `npm run smoke:economics:layout-live` 390/1440 2026-09-19 |

## Manual verification gates

| Check | Status | Inference run id | Date |
|-------|--------|------------------|------|
| Text chat → Inference detail with line-item COGS | **pass (D1 + API)** | `e2ac39dc` actual, `cost_calculated_at`, 2-line breakdown | 2026-09-19 |
| Economy coverage % after real inference | **pass (D1 + API)** | today 100% (rolling 24h UTC), 7d 63.2%; D1↔owner parity ✅ | 2026-09-19 |
| Voice note → `voice_transcription` inference row | **pass (D1 + API)** | `e643885a` actual + breakdown | 2026-09-19 |
| Avatar Studio → `avatar_generation` inference row | **open (optional)** | no runs in 7d | — |
| Owner Console 390px / 1440px | **pass (layout-live)** | `npm run smoke:economics:layout-live` on `53fcfd0` | 2026-09-19 |
| Owner auth gate (unauthenticated) | **pass** | `/owner` → «Sign in required»; API → 401 | 2026-09-19 |
| Owner API smoke (`smoke:economics:owner`) | **pass** | `npm run smoke:economics:mint-owner` | 2026-09-19 |
| Unpriced COGS truth (— not $0) | **pass (layout-live)** | unpriced filter on 1440 inference table | 2026-09-19 |

## Completion audit (2026-09-19)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Model Registry + Pricing 2.0 | ✅ | deployed, specs + owner API |
| CostEngine 2.0 + immutable costs | ✅ | D1 `e2ac39dc`, integration tests |
| Economics truth (unknown ≠ $0) | ✅ | `formatMicrousd(null)`, layout-live unpriced filter |
| Energy / retail separation | ✅ | `retail-pricing.ts`, owner economy simulated retail |
| Owner Console shipped (desktop + mobile) | ✅ | layout-live 390/1440; `apiAuthReady` fix `53fcfd0` |
| Production E2E Milestone 1 | ✅ | `smoke:economics:mint-owner` + `layout-live` |
| Tests + CI smoke | ✅ | 128/128; post-deploy `smoke:economics` green |

## Next actions (optional)

1. `gh secret set CLERK_SECRET_KEY` — enables CI owner smoke without manual session.
2. Optional: avatar_generation E2E (`PRODUCTION_ECONOMICS_SMOKE.md` §9–10).
3. Optional: persona_generation / call_summary production E2E.
