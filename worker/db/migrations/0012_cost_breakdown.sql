-- Immutable cost explanation snapshot for Inference Detail

ALTER TABLE inference_runs ADD COLUMN cost_breakdown_json TEXT;

CREATE INDEX IF NOT EXISTS idx_inference_runs_started_at
  ON inference_runs(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_inference_runs_owner_filters
  ON inference_runs(status, cost_confidence, started_at DESC);
