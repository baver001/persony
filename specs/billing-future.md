# Billing future (not implemented)

Payments are **out of scope** for closed beta. Architecture prepares:

- `BillingProvider` interface (`worker/billing/billing-provider.ts`)
- `battery_preferences` table for future auto-recharge
- `battery_mode` switch: `beta_regen` → `paid`

## Future Paddle flow

```text
Battery <= threshold
→ auto_recharge_enabled?
→ Paddle charge
→ verified webhook
→ EnergyLedger purchase
→ Battery refill
```

No Paddle SDK, webhooks, or checkout in beta.
