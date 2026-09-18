# Persony metrics reference

**Status:** Economics & Owner Control Center phase  
**Last updated:** 2026-09-18

This document defines owner-facing and operational metrics. Values marked **simulated** are not revenue until Paddle billing is live.

## Core economics (Owner API: `GET /api/owner/economics`)

| Metric | Field | Unit | Definition | Decision it informs |
|--------|-------|------|------------|---------------------|
| AI COGS today | `aiCostTodayMicrousd` | micro-USD | Sum of `provider_cost_microusd` where `cost_confidence` ∈ `actual`, `estimated` | Daily burn vs budget |
| AI COGS 7d / 30d | `aiCost7dMicrousd`, `aiCost30dMicrousd` | micro-USD | Same aggregation over rolling windows | Trend / runway |
| Cost coverage | `costCoverageTodayPercent` | % | `(total_calls - unpriced_calls) / total_calls × 100` | Whether economics truth is trustworthy |
| Unpriced calls | `unpricedCallsToday` | count | `cost_confidence = unpriced` | Missing pricing or usage gaps |
| Estimated-cost calls | `estimatedCostCallsToday` | count | `cost_confidence = estimated` | Provider usage or tariff uncertainty |
| Energy consumed | `energyConsumedToday` | Energy units | Sum of `energy_charged` | Product consumption vs COGS |
| Inference volume | `callsToday`, `successfulCallsToday`, `failedCallsToday` | count | `inference_runs` by status | Reliability |
| Latency | `avgLatencyMsToday` | ms | Mean `latency_ms` for completed runs | UX / provider health |
| Fallback rate | `fallbackRateToday` | ratio | Runs with `fallback_count > 0` / total | Router stability |
| COGS by provider | `costByProvider[]` | micro-USD | Grouped known COGS | Provider mix |
| COGS by model | `costByModel[]` | micro-USD | Grouped known COGS | Model mix |
| Active inferrers | `activeUsersWithInference7d` | users | Distinct `user_id` with inference in 7d | Engagement |
| Simulated retail | `simulatedRetailValueTodayMicrousd` | micro-USD | `retailMicrousdFromProviderCost(known COGS)` | **Not revenue** — pricing hypothesis |
| Simulated gross profit | `simulatedGrossProfitTodayMicrousd` | micro-USD | retail − COGS | Margin model sanity |
| Simulated gross margin | `simulatedGrossMarginTodayPercent` | % | profit / retail | Target margin check |
| Retail config | `retailPricingVersion`, `targetAiGrossMargin` | — | From `system_settings` | Energy retail policy |

### Invariants

- **Unknown cost is never zero COGS.** `unpriced` rows contribute `0` to known COGS sums but increment `unpricedCallsToday`.
- Historical inference costs are immutable at settle time (`pricing_entry_id`, `cost_breakdown_json`).

## Per-inference (Owner API: `GET /api/owner/inference/:id`)

| Field | Meaning |
|-------|---------|
| `costConfidence` | `actual` \| `estimated` \| `unpriced` |
| `usageEstimated` | `true` when token counts came from text heuristic |
| `providerCostMicrousd` | `null` when unpriced |
| `pricingEntryId` | Catalog row ids used at calculation time |
| `costBreakdown` | Line items: dimension, units, rate, microusd |
| `energyCharged` | Retail Energy units debited |
| `fallbackCount` | Provider/model fallbacks during route |

## Pricing catalog freshness (`GET /api/owner/pricing`)

| Field | Meaning |
|-------|---------|
| `catalogVersion` | Code-defined catalog version string |
| `freshness.staleEntryCount` | Entries past recommended re-verify window |
| `entries[]` | Versioned multidimensional rates with `effectiveFrom` / `effectiveTo` |

## Platform overview (`GET /api/owner/overview`)

| Metric | Field | Notes |
|--------|-------|-------|
| Total users | `metrics.totalUsers` | D1 `users` count |
| Total messages | `metrics.totalMessages` | D1 `messages` count |
| Active personas | `metrics.activePersonas` | `status = active` |
| Failed inferences | `metrics.failedInferenceRuns` | All-time failed runs |
| Revenue / COGS / margin | `null` | Reserved until billing integration |

## Product value metric (recommended)

**Primary value metric:** completed persona conversations where the user receives a streamed reply (`inference_runs.status = completed` per user per day).

**Activation:** first completed inference after signup.  
**Economics gate:** `costCoverageTodayPercent ≥ 95%` before treating aggregate COGS dashboards as authoritative.

## Observability

Structured logs: `logEvent` in chat-service records inference id, provider, model, `usageEstimated`, `costConfidence`.

Health: `GET /api/health` — worker + D1 readiness.
