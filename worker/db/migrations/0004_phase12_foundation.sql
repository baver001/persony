-- Phase 1.2: Persona foundation, memory, trust, i18n, owner RBAC

ALTER TABLE users ADD COLUMN preferred_locale TEXT NOT NULL DEFAULT 'en';
ALTER TABLE users ADD COLUMN conversation_locale TEXT;

ALTER TABLE memories ADD COLUMN importance REAL NOT NULL DEFAULT 0.5;
ALTER TABLE memories ADD COLUMN sensitivity TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE memories ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE memories ADD COLUMN last_used_at TEXT;
ALTER TABLE memories ADD COLUMN room_id TEXT;

CREATE INDEX IF NOT EXISTS idx_memories_scope ON memories(user_id, scope, status);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  granted_by TEXT,
  PRIMARY KEY (user_id, role)
);

CREATE TABLE IF NOT EXISTS legal_documents (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  version TEXT NOT NULL,
  locale TEXT NOT NULL,
  title TEXT NOT NULL,
  content_markdown TEXT NOT NULL,
  effective_from TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (type, version, locale)
);

CREATE TABLE IF NOT EXISTS user_legal_acceptances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  locale TEXT NOT NULL,
  region TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_legal_acceptances_user ON user_legal_acceptances(user_id, accepted_at DESC);

CREATE TABLE IF NOT EXISTS user_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  consent_type TEXT NOT NULL,
  status TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  granted_at TEXT,
  withdrawn_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_consents_user ON user_consents(user_id, consent_type);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  old_state_json TEXT,
  new_state_json TEXT,
  reason TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS system_settings_history (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL,
  old_value_json TEXT,
  new_value_json TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TEXT NOT NULL,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS product_analytics_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_name TEXT NOT NULL,
  properties_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON product_analytics_events(event_name, created_at DESC);

CREATE TABLE IF NOT EXISTS evaluation_samples (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  persona_id TEXT,
  persona_version INTEGER,
  provider TEXT,
  model TEXT,
  feedback TEXT NOT NULL,
  consent_id TEXT NOT NULL,
  fragment_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS message_feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  message_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  feedback TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, message_id)
);
