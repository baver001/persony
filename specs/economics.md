# Economics specification

**Status:** Milestone 1 partial — D1 verified (`e2ac39dc` chat, `e643885a` transcribe); owner API smoke + layout open  
**Last updated:** 2026-09-19

## Pipeline

```text
ProviderUsage (API or estimated fallback)
  +
PricingEntry (versioned catalog, timestamp-aware)
  +
Request metadata (provider, model, operation)
  ↓
CostEngine → provider COGS (micro-USD integer)
  ↓
Energy settlement (retail units — separate from COGS truth)
```

## Cost confidence

| Value | Meaning |
|-------|---------|
| `actual` | Provider-reported usage + known pricing rule |
| `estimated` | Usage or tariff partially estimated |
| `unpriced` | Cannot determine COGS — **never shown as $0 known cost** |

Persisted on `inference_runs.cost_confidence`.

## Pricing Catalog 2.0

Implementation: `worker/billing/pricing-catalog.ts`

- Versioned rows with `effectiveFrom` / `effectiveTo`
- Dimensions: `text_input`, `text_output`, `cached_input`, … (extensible)
- DeepSeek: peak/off-peak by UTC window + cache hit/miss tiers
- Each row has `id`, `sourceReference`, `verifiedAt`
- Owner API: `GET /api/owner/pricing`

## Historical pricing

Inference stores `pricing_entry_id` (comma-separated when multiple dimensions) and `pricing_version` at calculation time. Repricing only via explicit admin backfill for `unpriced` rows.

## Energy vs COGS

- **AI COGS** — provider cost from CostEngine (`actual` / `estimated` / `unpriced`)
- **Simulated retail** — `retail = COGS / (1 - target_ai_gross_margin)` via `retail-pricing.ts`
- **Energy units** — `ceil(simulated_retail_microusd / retail_microusd_per_energy_unit)`
- Config keys: `target_ai_gross_margin`, `retail_microusd_per_energy_unit`, `retail_pricing_version`
- Default margin: `TARGET_AI_GROSS_MARGIN` (0.8) — **not** a hidden 2.5× markup

## Provider usage

Chat providers emit `usage` on the terminal SSE `done` event when the upstream API reports token counts (`worker/providers/stream-sse.ts`). `chat-service` passes reported usage to `mergeProviderUsage`; otherwise text-length estimation sets `usageEstimated: true`.

## Open gaps

- [x] DB-backed pricing (code bootstrap + append-only `pricing_entries` table)
- [x] Owner UI for adding pricing versions (`POST /owner/pricing/entries`)
- [x] Voice Call / avatar / transcription pricing dimensions (`per_minute`, `per_image`, transcribe tokens)
- [x] Inference detail cost breakdown API — `GET /api/owner/inference/:id`
- [ ] Production E2E economics verification (owner JWT smoke + Console 390/1440; D1 operator layer ✅)
- [x] Normalize `operation_type` — `operations.ts` + migration `0013`
