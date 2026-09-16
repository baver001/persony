-- Phase 1.1: inference lifecycle, conversation soft delete, import message keys

CREATE TABLE IF NOT EXISTS inference_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  client_request_id TEXT NOT NULL,
  user_message_id TEXT,
  persona_message_id TEXT,
  persona_id TEXT NOT NULL,
  persona_version INTEGER NOT NULL,
  status TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  started_at TEXT NOT NULL,
  completed_at TEXT,
  error_code TEXT,
  UNIQUE (conversation_id, client_request_id)
);

CREATE INDEX IF NOT EXISTS idx_inference_runs_conversation
  ON inference_runs(conversation_id, started_at DESC);

ALTER TABLE conversations ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE conversations ADD COLUMN deleted_at TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_owner_status
  ON conversations(owner_user_id, status, updated_at DESC);
