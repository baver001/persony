-- Phase 1.5: production economy — inference telemetry, energy reservations, memory jobs

ALTER TABLE inference_runs ADD COLUMN operation_type TEXT NOT NULL DEFAULT 'text_chat';
ALTER TABLE inference_runs ADD COLUMN requested_provider TEXT;
ALTER TABLE inference_runs ADD COLUMN requested_model TEXT;
ALTER TABLE inference_runs ADD COLUMN actual_provider TEXT;
ALTER TABLE inference_runs ADD COLUMN actual_model TEXT;
ALTER TABLE inference_runs ADD COLUMN input_tokens INTEGER;
ALTER TABLE inference_runs ADD COLUMN output_tokens INTEGER;
ALTER TABLE inference_runs ADD COLUMN cached_input_tokens INTEGER;
ALTER TABLE inference_runs ADD COLUMN usage_estimated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inference_runs ADD COLUMN provider_cost_microusd INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inference_runs ADD COLUMN energy_reserved INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inference_runs ADD COLUMN energy_charged INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inference_runs ADD COLUMN latency_ms INTEGER;
ALTER TABLE inference_runs ADD COLUMN fallback_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE inference_runs ADD COLUMN fallback_reason TEXT;
ALTER TABLE inference_runs ADD COLUMN provider_request_id TEXT;

UPDATE inference_runs
SET requested_provider = provider
WHERE requested_provider IS NULL AND provider IS NOT NULL;

UPDATE inference_runs
SET requested_model = model
WHERE requested_model IS NULL AND model IS NOT NULL;

UPDATE inference_runs
SET actual_provider = provider
WHERE actual_provider IS NULL AND provider IS NOT NULL;

UPDATE inference_runs
SET actual_model = model
WHERE actual_model IS NULL AND model IS NOT NULL;

CREATE TABLE IF NOT EXISTS energy_reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  inference_run_id TEXT NOT NULL UNIQUE,
  reserved_units INTEGER NOT NULL,
  settled_units INTEGER,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  settled_at TEXT,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_energy_reservations_user
  ON energy_reservations(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS memory_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  user_message_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_memory_jobs_status
  ON memory_jobs(status, created_at DESC);
