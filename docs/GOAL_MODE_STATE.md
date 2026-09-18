# Goal mode state

**Objective:** Verified Economics & Owner Control Center — проверяемая экономика AI, versioned pricing, достоверный Owner Control Center (desktop + mobile).

**Last updated:** 2026-09-18 UTC  
**Current phase:** Milestone 1 — Economics Truth E2E verification  
**Previous phase:** Production Economy & Reliability — **shipped**

## Production snapshot

| Field | Value |
|-------|--------|
| **Current production SHA** | `dcad14f` — immutable inference costs guard (deploy verified) |
| **Production health** | `GET https://beta.persony.org/api/health` → ok, database ready |
| **Last migration (remote D1)** | `0014_pricing_catalog_db.sql` |
| **CI** | Green (see latest `main` deploy) |
| **Public smoke** | `npm run smoke:economics:public` |
| **Owner API smoke** | `SMOKE_OWNER_BEARER=<jwt> npm run smoke:economics:owner` |
| **Production smoke (economics)** | **NOT RUN** — owner login required |
| **Tests (local)** | 124/124 (incl. settled cost immutability) |

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
| Economics E2E (Milestone 1) | **open** | [`docs/PRODUCTION_ECONOMICS_SMOKE.md`](./PRODUCTION_ECONOMICS_SMOKE.md) |
| DB-backed pricing admin | deployed | migration `0014`, POST `/owner/pricing/entries`, audit log |
| Immutable inference costs | deployed | `updateInferenceRunEconomics` blocks rewrite after `cost_calculated_at` |
| CI post-deploy economics smoke | deployed | `.github/workflows/deploy.yml` |
| Mobile/desktop layout gates | **partial** | card lists on all main sections `<md`; manual 390/1440 sign-off open |

## Manual verification gates

| Check | Status | Inference run id | Date |
|-------|--------|------------------|------|
| Text chat → Inference detail with line-item COGS | **open** | — | — |
| Economy coverage % after real inference | **open** | — | — |
| Voice note → `voice_transcription` inference row | **open** | — | — |
| Avatar Studio → `avatar_generation` inference row | **open** | — | — |
| Owner Console 390px / 1440px | **open** | — | — |
| Owner API smoke (`smoke:economics:owner`) | **open** | �