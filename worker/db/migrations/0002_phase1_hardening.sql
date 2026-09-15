-- Phase 1 hardening: internal user IDs, direct conversation persona link

ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'clerk';

ALTER TABLE users RENAME COLUMN auth_provider_id TO auth_provider_user_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_provider
  ON users(auth_provider, auth_provider_user_id);

ALTER TABLE conversations ADD COLUMN persona_id TEXT;

CREATE INDEX IF NOT EXISTS idx_conversations_owner
  ON conversations(owner_user_id, last_message_at);

CREATE INDEX IF NOT EXISTS idx_conversations_persona
  ON conversations(owner_user_id, persona_id);

ALTER TABLE users ADD COLUMN legacy_imported_at TEXT;
