# Economics specification

**Status:** Phase C in progress (local)  
**Last updated:** 2026-09-18

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

- **AI COGS** — provider cost from CostEngine
- **Energy** — user-facing units; retail markup configured separately (Phase E: remove hardcoded 2.5)

## Open gaps

- [ ] DB-backed pricing (catalog is code-defined today)
- [ ] Owner UI for adding pricing versions
- [ ] Voice Call / avatar / transcription pricing dimensions populated
- [ ] Inference detail cost breakdown API
- [ ] Production E2E economics verification
