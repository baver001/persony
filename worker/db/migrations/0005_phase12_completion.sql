-- Phase 1.2 completion: memory candidates, account lifecycle, memory supersede

CREATE TABLE IF NOT EXISTS memory_candidates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  persona_id TEXT,
  conversation_id TEXT,
  scope TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  sensitivity TEXT NOT NULL DEFAULT 'normal',
  confidence REAL NOT NULL DEFAULT 0.8,
  status TEXT NOT NULL DEFAULT 'pending',
  source_message_id TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_memory_candidates_user_status
  ON memory_candidates(user_id, status, created_at DESC);

ALTER TABLE memories ADD COLUMN superseded_by TEXT;

ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN deletion_requested_at TEXT;
