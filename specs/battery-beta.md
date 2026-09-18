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
