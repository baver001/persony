-- DB-backed pricing catalog: append-only overrides, code catalog remains bootstrap

CREATE TABLE IF NOT EXISTS pricing_entries (
  id TEXT PRIMARY KEY,
  catalog_version TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  dimension TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  price_microusd_per_unit INTEGER NOT NULL,
  unit TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  pricing_tier TEXT NOT NULL DEFAULT 'default',
  time_rule TEXT NOT NULL DEFAULT 'any',
  source_reference TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by_user_id TEXT,
  reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_pricing_entries_lookup
  ON pricing_entries(provider, model, dimension, effective_from DESC);

CREATE INDEX IF NOT EXISTS idx_pricing_entries_created
  ON pricing_entries(created_at DESC);
