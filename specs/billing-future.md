# Billing future (Paddle — prepared, not live)

Payments are **not enabled** in closed beta. Battery runs in **simulation** mode (`battery_mode = simulation`).

## Current state

| Layer | Status |
|-------|--------|
| `BillingProvider` interface | ✅ |
| `PaddleBillingProvider` stub | ✅ — throws until `BILLING_ENABLED=true` |
| D1 tables (`0007`) | ✅ `energy_packs`, `billing_purchase_intents`, `paddle_webhook_events` |
| API `GET /api/me/billing` | ✅ status only |
| API `POST /api/billing/checkout` | ✅ returns `501 BILLING_NOT_CONFIGURED` |
| API `POST /api/billing/webhook/paddle` | ✅ returns `503` until enabled |
| Settings UI | ✅ “coming soon” copy |
| Live Paddle checkout | ❌ not wired |

## Enable later (operator checklist)

1. Create Paddle Live catalog (LevelUp seller) — map `paddle_price_id` in `energy_packs` / `ENERGY_PACK_CATALOG`.
2. Set secrets: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_CLIENT_TOKEN`.
3. Set `BILLING_ENABLED=true` in Worker vars.
4. Implement `PaddleBillingProvider.createCheckout` + signed webhook handler.
5. Legal pages + support channel before public checkout.

## Simulation battery

```text
AI action → EnergyLedger usage → wallet decreases
idle delay → lazy regen → wallet increases
```

No Paddle, no checkout, no auto-recharge charges until `battery_mode = paid` and billing enabled.

## Future flow

```text
Battery <= threshold
→ auto_recharge_enabled?
→ Paddle charge (server)
→ verified webhook → EnergyLedger purchase
→ Battery refill
```
