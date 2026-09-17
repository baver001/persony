-- Phase 1.3 beta: Battery lazy regen fields, persona relationships, energy idempotency

ALTER TABLE energy_wallets ADD COLUMN last_energy_update_at TEXT;
ALTER TABLE energy_wallets ADD COLUMN last_billable_usage_at TEXT;
ALTER TABLE energy_wallets ADD COLUMN welcome_granted INTEGER NOT NULL DEFAULT 0;

ALTER TABLE energy_ledger ADD COLUMN inference_run_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_energy_ledger_inference_run
  ON energy_ledger(inference_run_id)
  WHERE inference_run_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS persona_relationships (
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  first_interaction_at TEXT NOT NULL,
  last_interaction_at TEXT NOT NULL,
  relationship_summary TEXT,
  interaction_preferences_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_persona_relationships_user
  ON persona_relationships(user_id, last_interaction_at DESC);

CREATE TABLE IF NOT EXISTS battery_preferences (
  user_id TEXT PRIMARY KEY,
  auto_recharge_enabled INTEGER NOT NULL DEFAULT 0,
  auto_recharge_threshold_pct INTEGER NOT NULL DEFAULT 10,
  auto_recharge_pack_id TEXT,
  updated_at TEXT NOT NULL
);
