# Persony Battery (beta_regen)

## Product rules

- One Battery per user (not per Persona).
- User sees percentage only (`🔋 84%`), never internal units or provider cost.
- `battery_mode = simulation` (или legacy `beta_regen`) — lazy regeneration after idle delay.
- No payments, checkout, or Paddle on this phase.

## Domain pipeline

```text
InferenceRun → UsageEvent (future) → EnergyLedger → energy_wallets
```

## Config keys (`system_settings`)

| Key | Default |
|-----|---------|
| `battery_enabled` | `true` |
| `battery_mode` | `simulation` |
| `battery_capacity_units` | `10000` |
| `battery_welcome_units` | `10000` |
| `battery_regen_delay_minutes` | `30` |
| `battery_regen_full_hours` | `8` |
| `beta_usage_scale` | `1` |

## API

- `GET /api/me/battery` — snapshot for UI
- Owner: `GET /owner/battery/overview`, `POST /owner/users/:id/battery/reset`

## Idempotency

`energy_ledger.inference_run_id` unique — one charge per inference run.

## Transition policy (S0→GTM)

**Intent:** Full lazy regeneration in `battery_mode = simulation` (alias `beta_regen`) is an **intentional S0 solo-test hack** — not the long-term monetization model. It keeps founder dogfooding unblocked before Paddle and before ICP is chosen. See [Product Monitoring Framework §7](/cursor/stores/bc-f0795a01-bd63-480b-9507-2fd2147a24ad/docs/product-monitoring-framework.md).

### Stages and regen behavior

| Stage | Users | `battery_mode` | Regen behavior | Product events |
|-------|-------|----------------|----------------|----------------|
| **S0** (now) | Solo founder | `simulation` | Full lazy regen after idle (`battery_regen_delay_minutes` → `battery_regen_full_hours`) | Optional M0 log-only |
| **S1** | First 5–10 invited | `simulation` | Same full regen; **log** `battery_depleted` ([`specs/14-product-events.md`](14-product-events.md)) | M1 persist |
| **S2** | 20–100 | `simulation` or `commercial`* | Cap regen (e.g. 25%/day) **or** full regen only after 24h idle — operator choice | M2 funnel + retention |
| **S3** (GTM) | 100+ | `paid` / `commercial` | No free regen (paid-only) or tiered (free slow / Pro fast) | Full dashboard + billing |

\* `commercial` = charge on use, regen policy defined by new config keys below (not Paddle yet).

### Config keys (future modes)

Existing keys in [Config keys](#config-keys-system_settings) above. Additional keys for S2+ (defaults safe until set):

| Key | Default | Purpose |
|-----|---------|---------|
| `battery_regen_cap_percent_per_day` | `100` | Max % of capacity restorable per UTC day (S2: set to `25` for slow drip) |
| `battery_regen_idle_hours_full` | `null` (use `battery_regen_full_hours`) | S2 option D: full regen only after N hours idle |
| `battery_regen_enabled` | `true` | Master switch for any automatic regen (S3 paid: `false`) |
| `battery_trial_grant_on_signup` | `true` | One welcome battery per account (`battery_welcome_units`) |

Implementation note: `loadBatteryConfig()` in `worker/billing/battery-config.ts` must read new keys when migration lands; until then S0 behavior unchanged.

### Triggers to switch modes

| Transition | Trigger | Action |
|------------|---------|--------|
| S0 → S1 | Founder dogfooded 2+ weeks; product stable | Invite users; enable `product_events_mode = persist` |
| S1 → S2 | ≥10 users, ≥5 with `first_inference` | Experiment: set `battery_regen_cap_percent_per_day = 25` **or** `battery_regen_idle_hours_full = 24`; announce in release notes |
| S2 → S3 | ≥20 users, one ICP cluster >40%, WTP signal **or** founder go | `battery_mode = paid`; `battery_regen_enabled = false` (or tiered); Paddle live |
| Simulation → paid (any stage) | ICP chosen **or** ≥50 users **or** explicit founder decision | Same as S2→S3; **requires pricing sync** below |

Owner changes via `PUT /api/owner/system/settings` (audited). Document mode + date in deploy notes.

### Pricing sync requirement (before paid mode)

Before disabling full regen or enabling `paid` / checkout:

1. One public story: **full battery ≈ $X retail AI** — aligned across `map.md`, `worker/billing/retail-pricing.ts`, `energy-packs` catalog, and UI copy.
2. `retail_pricing_version` and `target_ai_gross_margin` reviewed in Owner Console Economics.
3. `costCoverageTodayPercent ≥ 95%` on production (economics gate).
4. Paddle catalog + webhook path verified per [`specs/billing-future.md`](billing-future.md) if taking payments.

Do **not** switch to paid-only regen off while UI still promises “recharges while you sleep” without copy update.

### Acceptance criteria (transition)

- [ ] S0: `battery_mode = simulation`, full regen documented as intentional in this spec and monitoring framework
- [ ] S1: `battery_depleted` events visible in Owner Product funnel (spec 14 M1)
- [ ] S2: operator can set `battery_regen_cap_percent_per_day` without code deploy (system_settings only)
- [ ] S2: UI shows regen policy label (simulation / capped / idle-gated / paid)
- [ ] S3: `battery_regen_enabled = false` (or tiered) + Paddle checkout returns 200 for test pack
- [ ] Any mode change: audit log entry + `map.md` stage note updated
- [ ] Pricing sync checklist complete before first paid-only user sees empty battery without purchase path
