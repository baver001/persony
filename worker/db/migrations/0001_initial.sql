-- Persony platform schema (Phase 1+ foundation)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  auth_provider_id TEXT UNIQUE,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  trial_granted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS personas (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  slug TEXT,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,
  avatar_url TEXT,
  voice TEXT NOT NULL DEFAULT 'Puck',
  category TEXT NOT NULL DEFAULT 'custom',
  visibility TEXT NOT NULL DEFAULT 'private',
  status TEXT NOT NULL DEFAULT 'active',
  source_persona_id TEXT,
  current_version INTEGER NOT NULL DEFAULT 1,
  badge TEXT,
  color TEXT,
  starter_messages_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_personas_owner ON personas(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_personas_visibility ON personas(visibility, published_at);

CREATE TABLE IF NOT EXISTS persona_versions (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  system_prompt TEXT NOT NULL,
  configuration_json TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (persona_id, version)
);

CREATE TABLE IF NOT EXISTS user_personas (
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  persona_version INTEGER NOT NULL,
  installed_at TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  custom_settings_json TEXT,
  PRIMARY KEY (user_id, persona_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'direct',
  title TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  last_message_at TEXT
);

CREATE TABLE IF NOT EXISTS conversation_personas (
  conversation_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  persona_version INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant',
  added_at TEXT NOT NULL,
  PRIMARY KEY (conversation_id, persona_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_user_id TEXT,
  sender_persona_id TEXT,
  text TEXT NOT NULL,
  content_json TEXT,
  created_at TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  usage_event_id TEXT,
  voice_call_session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  persona_id TEXT,
  conversation_id TEXT,
  scope TEXT NOT NULL,
  kind TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL NOT NULL DEFAULT 1,
  source_message_ids TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memories_user ON memories(user_id, persona_id);

CREATE TABLE IF NOT EXISTS energy_wallets (
  user_id TEXT PRIMARY KEY,
  available_units INTEGER NOT NULL DEFAULT 0,
  reserve_units INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS energy_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  energy_delta INTEGER NOT NULL,
  retail_value_microusd INTEGER NOT NULL DEFAULT 0,
  provider_cost_microusd INTEGER NOT NULL DEFAULT 0,
  usage_event_id TEXT,
  payment_id TEXT,
  created_at TEXT NOT NULL,
  metadata_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_energy_ledger_user ON energy_ledger(user_id, created_at);

CREATE TABLE IF NOT EXISTS usage_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT,
  persona_id TEXT,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  cached_input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  audio_input_seconds INTEGER NOT NULL DEFAULT 0,
  audio_output_seconds INTEGER NOT NULL DEFAULT 0,
  tool_cost_microusd INTEGER NOT NULL DEFAULT 0,
  provider_cost_microusd INTEGER NOT NULL DEFAULT 0,
  retail_cost_microusd INTEGER NOT NULL DEFAULT 0,
  energy_units INTEGER NOT NULL DEFAULT 0,
  pricing_version TEXT NOT NULL DEFAULT 'v0',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id, created_at);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  external_transaction_id TEXT UNIQUE,
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  energy_granted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
  provider TEXT NOT NULL,
  external_event_id TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  payload_hash TEXT,
  PRIMARY KEY (provider, external_event_id)
);

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);
