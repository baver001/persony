-- Phase 1.5: D1-backed rate limit buckets (per scope + window)

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start_ms INTEGER NOT NULL
);
