# Goal mode state

**Objective:** Verified Economics & Owner Control Center — проверяемая экономика AI, versioned pricing, достоверный Owner Control Center (desktop + mobile).

**Last updated:** 2026-09-19 UTC  
**Current phase:** Milestone 1 — Economics Truth E2E verification  
**Previous phase:** Production Economy & Reliability — **shipped**

## Production snapshot

| Field | Value |
|-------|--------|
| **Current production SHA** | `905f21c3ac5a` (status auto-discover owner id) |
| **Production health** | `GET https://beta.persony.org/api/health` → ok, database ready |
| **Last migration (remote D1)** | `0014_pricing_catalog_db.sql` |
| **CI** | Green (see latest `main` deploy) |
| **Public smoke** | `npm run smoke:economics` (public + D1 + layout contract) |
| **Owner API smoke** | `SMOKE_OWNER_BEARER=<jwt> npm run smoke:economics:owner` |
| **D1 operator smoke** | `npm run smoke:economics:d1` (wrangler remote) |
| **Production smoke (economics)** | **PARTIAL** — operator ✅ + owner API ✅ 2026-09-19; layout 390/1440 open |
| **Tests (local)** | 127/127 (incl. economics snapshot + energy/retail separation) |

Full audit: [`docs/ECONOMICS_RECONCILIATION.md`](./ECONOMICS_RECONCILIATION.md)

## Gate table

| Gate | Status | Evidence |
|------|--------|----------|
| Model Registry | deployed | `worker/ai/model-registry.ts`, routing matrix in Owner AI |
| Pricing Catalog 2.0 | deployed | tokens + per_minute + per_image dimensions |
| Cost confidence | deployed | actual/estimated/unpriced, `formatMicrousd(null)` → `—` |
| Provider usage | **partial** | chat/transcribe/text-gen actual; voice_call Live `usageMetadata` + duration fallback |
| Voice / transcribe / avatar inference rows | deployed | voice-call, transcribe, avatar services |
| Call summary / persona gen inference rows | deployed | `text-generation-inference-service.ts` |
| Owner Console | **partial** | economy, inference, pricing, users/personas detail, settings, errors |
| Economics E2E (Milestone 1) | **partial** | D1 + owner API verified (`npm run smoke:economics:mint-owner`); layout 390/1440 open |
| DB-backed pricing admin | deployed | migration `0014`, POST `/owner/pricing/entries`, audit log |
| Immutable inference costs | deployed | `updateInferenceRunEconomics` blocks rewrite after `cost_calculated_at` |
| CI post-deploy economics smoke | deployed | `smoke:economics` public+D1+layout; optional owner via secret |
| Mobile/desktop layout gates | **partial** | static layout contract in CI; manual 390/1440 sign-off open |

## Manual verification gates

| Check | Status | Inference run id | Date |
|-------|--------|------------------|------|
| Text chat → Inference detail with line-item COGS | **pass (D1)** | `e2ac39dc` actual, `cost_calculated_at`, 2-line breakdown | 2026-09-19 |
| Economy coverage % after real inference | **pass (D1 + API)** | today 100% (rolling 24h UTC), 7d 63.2%; D1↔owner parity ✅ | 2026-09-19 |
| Voice note → `voice_transcription` inference row | **pass (D1)** | `e643885a` actual + breakdown | 2026-09-19 |
| Avatar Studio → `avatar_generation` inference row | **open** | no runs in 7d | — |
| Owner Console 390px / 1440px | **open** | — | — |
| Owner auth gate (unauthenticated) | **pass** | `/owner` → «Sign in required» at 390/1440; API → 401 | 2026-09-19 |
| Owner API smoke (`smoke:economics:owner`) | **pass** | `npm run smoke:economics:mint-owner` (active Clerk session + `CLERK_SECRET_KEY`) | 2026-09-19 |

## Completion audit (2026-09-19)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Model Registry + Pricing 2.0 | ✅ | deployed, specs + owner API |
| CostEngine 2.0 + immutable costs | ✅ | D1 `e2ac39dc`, integration tests |
| Economics truth (unknown ≠ $0) | ✅ | `formatMicrousd(null)`, economics-service test |
| Owner Console shipped | ✅ partial | code deployed; layout sign-off open |
| Production E2E Milestone 1 | **partial** | operator + owner API ✅; layout 390/1440 open |
| Tests + CI smoke | ✅ | 127/127; `smoke:economics` + optional `SMOKE_OWNER_BEARER` in deploy |

## Next actions

1. Owner Console layout 390px / 1440px per `PRODUCTION_ECONOMICS_SMOKE.md` §15–23 (or say «layout OK»).
2. `gh secret set CLERK_SECRET_KEY` — enables CI owner smoke when owner has active Clerk session on beta.
3. Optional: avatar_generation E2E.
