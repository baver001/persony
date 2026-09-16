-- Phase 1 hardening: indexes and message idempotency

CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_slug_unique ON personas(slug) WHERE slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_conversations_owner_updated
  ON conversations(owner_user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_pagination
  ON messages(conversation_id, created_at DESC);

ALTER TABLE messages ADD COLUMN idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_messages_idempotency
  ON messages(conversation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider_id);
