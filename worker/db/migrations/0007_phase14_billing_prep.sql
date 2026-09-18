-- Phase 4 prep: Paddle mirror tables (not active until BILLING_ENABLED)

CREATE TABLE IF NOT EXISTS energy_packs (
  id TEXT PRIMARY KEY,
  paddle_price_id TEXT,
  label TEXT NOT NULL,
  energy_units INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  amount_cents INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS billing_purchase_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  paddle_transaction_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  custom_data_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_billing_intents_user
  ON billing_purchase_intents(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_intents_paddle_tx
  ON billing_purchase_intents(paddle_transaction_id)
  WHERE paddle_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS paddle_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  received_at TEXT NOT NULL,
  processed_at TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  payload_hash TEXT,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_paddle_webhook_status
  ON paddle_webhook_events(status, received_at DESC);
