-- Phase 3-8 platform features

CREATE TABLE IF NOT EXISTS persona_installs (
  user_id TEXT NOT NULL,
  persona_id TEXT NOT NULL,
  persona_version INTEGER NOT NULL DEFAULT 1,
  installed_at TEXT NOT NULL,
  PRIMARY KEY (user_id, persona_id)
);

CREATE INDEX IF NOT EXISTS idx_persona_installs_persona ON persona_installs(persona_id);

CREATE TABLE IF NOT EXISTS persona_shares (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  user_id TEXT,
  channel TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS knowledge_items (
  id TEXT PRIMARY KEY,
  persona_id TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  title TEXT,
  source_url TEXT,
  r2_key TEXT,
  content_text TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_knowledge_persona ON knowledge_items(persona_id);

CREATE TABLE IF NOT EXISTS user_provider_keys (
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  key_hint TEXT,
  encrypted_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, provider)
);

CREATE TABLE IF NOT EXISTS room_settings (
  conversation_id TEXT PRIMARY KEY,
  max_agents INTEGER NOT NULL DEFAULT 3,
  max_turns INTEGER NOT NULL DEFAULT 2,
  max_cost_microusd INTEGER NOT NULL DEFAULT 500_000,
  orchestrator_enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS memory_extraction_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  conversation_id TEXT NOT NULL,
  persona_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_personas_slug ON personas(slug) WHERE slug IS NOT NULL;
