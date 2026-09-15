# 08 — Energy & billing

**Статус:** implemented (locally verified)

## Components

- `CostEngine` — provider COGS → retail (80% margin target)
- `PricingRegistry` — versioned rates
- `energy_wallets` + `energy_ledger` + `usage_events`
- Welcome Battery — one-time trial grant on signup
- `BatteryIndicator` UI — 0–100% + Reserve
- Paddle webhook — `POST /api/billing/webhook` (idempotent)

## API

- `GET /api/billing/wallet`
- `GET /api/billing/packages`
