# Goal mode state

**Objective:** Production Economy & Reliability — измеримое AI-ядро, reserve/settle Energy, provider telemetry, memory lifecycle, без крупных новых фич.

**Last updated:** 2026-09-18 UTC  
**Current phase:** Production Economy & Reliability (P0 in progress)

## Gate table

| Gate | Status | Evidence | Limitation / next proof |
|------|--------|----------|-------------------------|
| Provider adapters (google + deepseek) | implemented | `worker/providers/*`, router tests | production model IDs verify manually |
| ProviderResult / route metadata | implemented | `provider-result.ts`, `model-router.ts` | streaming usage from API not wired yet |
| CostEngine + pricing catalog | implemented | `cost-engine.test.ts` | prices need periodic vendor sync |
| inference_runs economy columns | implemented | migration `0008` | apply on prod D1 |
| Energy reserve → settle → release | implemented | `energy-service.ts`, concurrency test | live/voice endpoints still on legacy charge |
| Memory waitUntil + job status | implemented | `memory-job-service.ts` | owner UI for failed jobs open |
| Rate limits | implemented | `rate-limit.ts`, migration `0009`, tests | tune limits in prod |
| Community Discover | implemented | `listCommunityPublicPersonas`, Discover UI | production smoke with public persona |
| Voice Call terminology | implemented | en i18n `Voice Call` | device/soak tests open |
| Owner economics API | implemented | `GET /owner/economics`, Owner Console | margin config open |
| Voice device/soak specs | open | — | manual only |
| Paddle live | not applicable | `BILLING_ENABLED=false` | separate Payment Launch |
| Commercial battery default | not applicable | mode exists, default simulation | enable later |
| CI green | open | last deploy `0a2d13b` success | new commits pending |
| Production verified | open | health check | post-migration smoke |

## External tasks

1. **Current task:** после push — `npm run db:migrate:remote` на production (migration `0008`).
2. **Waiting:** локально — остановить `npm run dev`, `Remove-Item node_modules`, `npm ci` если `tsc` не найден.

## Next independent task

P1: migrate live voice endpoints to reserve/settle; provider usage from API streams; production smoke with community persona.
