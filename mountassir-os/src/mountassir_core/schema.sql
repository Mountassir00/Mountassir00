-- MOUNTASSIR CORE — schema v1 (SQLite >= 3.35, FTS5 required)
-- Every statement is idempotent so the file can be replayed on an existing database.
-- Design rules enforced here (not only in application code):
--   * C5 (vault) can never be stored in memories, documents or segments: CHECK classification <= 4.
--   * An agent can never be granted C5: CHECK max_classification <= 4.
--   * The audit log is append-only (triggers) and hash-chained (application).
--   * Derived data (versions, provenance, index rows, package items) cascades on deletion.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- IDENTITY REGISTRY ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS entities (
  id             TEXT PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('owner','person','organization','project','concept','role_model','other')),
  name           TEXT NOT NULL,
  classification INTEGER NOT NULL DEFAULT 3 CHECK (classification BETWEEN 0 AND 4),
  created_at     TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_entities_single_owner ON entities(kind) WHERE kind = 'owner';

-- SOURCE REGISTRY -----------------------------------------------------------
-- A source is an origin of information: an export (ChatGPT, Claude...), a notes folder,
-- the owner's manual input, or an agent (each agent gets its own source).
CREATE TABLE IF NOT EXISTS sources (
  id             TEXT PRIMARY KEY,
  kind           TEXT NOT NULL CHECK (kind IN ('manual','agent','chatgpt_export','claude_export','markdown','jsonl')),
  label          TEXT NOT NULL,
  classification INTEGER NOT NULL DEFAULT 3 CHECK (classification BETWEEN 0 AND 4),
  created_at     TEXT NOT NULL,
  UNIQUE (kind, label)
);

CREATE TABLE IF NOT EXISTS import_runs (
  id          TEXT PRIMARY KEY,
  source_id   TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  file_name   TEXT NOT NULL,
  file_hash   TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('running','completed','failed')),
  started_at  TEXT NOT NULL,
  finished_at TEXT,
  stats       TEXT
);
CREATE INDEX IF NOT EXISTS ix_import_runs_hash ON import_runs(source_id, file_hash, status);

-- ARCHIVE (raw material: conversations, notes) --------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id             TEXT PRIMARY KEY,
  source_id      TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  external_id    TEXT NOT NULL,
  kind           TEXT NOT NULL CHECK (kind IN ('conversation','note','file')),
  title          TEXT,
  observed_at    TEXT,
  content_hash   TEXT NOT NULL,
  classification INTEGER NOT NULL CHECK (classification BETWEEN 0 AND 4),
  imported_at    TEXT NOT NULL,
  updated_at     TEXT NOT NULL,
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS segments (
  id                TEXT PRIMARY KEY,
  document_id       TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  seq               INTEGER NOT NULL,
  author_type       TEXT NOT NULL CHECK (author_type IN ('owner','ai','third_party','system','unknown')),
  author_label      TEXT,
  content           TEXT NOT NULL,
  content_hash      TEXT NOT NULL,
  observed_at       TEXT,
  classification    INTEGER NOT NULL CHECK (classification BETWEEN 0 AND 4),
  flags             TEXT NOT NULL DEFAULT '[]',
  quarantined       INTEGER NOT NULL DEFAULT 0 CHECK (quarantined IN (0,1)),
  quarantine_reason TEXT,
  UNIQUE (document_id, seq)
);
CREATE INDEX IF NOT EXISTS ix_segments_quarantine ON segments(quarantined);

-- MEMORY CORE ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memories (
  id               TEXT PRIMARY KEY,
  subject_id       TEXT NOT NULL REFERENCES entities(id),
  category         TEXT NOT NULL CHECK (category IN ('autobiographical','semantic','episodic','procedural','decisional','prospective','relational','emotional','behavioral','creative','preferential','normative')),
  epistemic_type   TEXT NOT NULL CHECK (epistemic_type IN ('verified_fact','self_statement','third_party_statement','preference','observation','intention','hypothesis','inference','prediction','evaluation_result','aspiration')),
  content          TEXT NOT NULL,
  slot             TEXT,
  value            TEXT,
  context          TEXT,
  classification   INTEGER NOT NULL CHECK (classification BETWEEN 0 AND 4),
  confidence       REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  status           TEXT NOT NULL CHECK (status IN ('proposed','validated','rejected','needs_review','superseded')),
  author_type      TEXT NOT NULL CHECK (author_type IN ('owner','ai','third_party','system','unknown')),
  author_id        TEXT NOT NULL,
  observed_at      TEXT,
  acquired_at      TEXT NOT NULL,
  last_verified_at TEXT,
  valid_from       TEXT,
  valid_until      TEXT,
  expires_at       TEXT,
  content_hash     TEXT NOT NULL,
  version          INTEGER NOT NULL DEFAULT 1,
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_memories_status ON memories(status, classification);
CREATE INDEX IF NOT EXISTS ix_memories_slot ON memories(subject_id, slot) WHERE slot IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_memories_hash ON memories(subject_id, content_hash);
CREATE INDEX IF NOT EXISTS ix_memories_author ON memories(author_id, status);

CREATE VIEW IF NOT EXISTS memory_candidates AS
  SELECT * FROM memories WHERE status = 'proposed';

CREATE TABLE IF NOT EXISTS memory_versions (
  memory_id      TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  version        INTEGER NOT NULL,
  content        TEXT NOT NULL,
  slot           TEXT,
  value          TEXT,
  classification INTEGER NOT NULL,
  epistemic_type TEXT NOT NULL,
  confidence     REAL NOT NULL,
  status         TEXT NOT NULL,
  changed_at     TEXT NOT NULL,
  changed_by     TEXT NOT NULL,
  change_reason  TEXT,
  PRIMARY KEY (memory_id, version)
);

-- role 'author'  : the source that wrote/proposed the memory (owner manual input, an agent).
-- role 'evidence': the archive material the memory was derived from.
CREATE TABLE IF NOT EXISTS memory_provenance (
  memory_id   TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  source_id   TEXT NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('author','evidence')),
  document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
  segment_id  TEXT REFERENCES segments(id) ON DELETE SET NULL,
  added_at    TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_provenance ON memory_provenance(memory_id, source_id, role, IFNULL(segment_id, ''));
CREATE INDEX IF NOT EXISTS ix_provenance_source ON memory_provenance(source_id);

CREATE TABLE IF NOT EXISTS contradictions (
  id          TEXT PRIMARY KEY,
  memory_a    TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  memory_b    TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  slot        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  detected_at TEXT NOT NULL,
  resolved_at TEXT,
  resolution  TEXT
);
CREATE INDEX IF NOT EXISTS ix_contradictions_a ON contradictions(memory_a, status);
CREATE INDEX IF NOT EXISTS ix_contradictions_b ON contradictions(memory_b, status);

-- Tombstones keep the fact that something was deleted (never its content), so that
-- deletions survive a restore from an older backup and sync stays idempotent.
CREATE TABLE IF NOT EXISTS tombstones (
  id         TEXT PRIMARY KEY,
  item_type  TEXT NOT NULL CHECK (item_type IN ('memory','source')),
  item_id    TEXT NOT NULL,
  deleted_at TEXT NOT NULL,
  actor      TEXT NOT NULL,
  reason     TEXT
);
CREATE INDEX IF NOT EXISTS ix_tombstones_item ON tombstones(item_type, item_id);

-- SEARCH ENGINE (derived, rebuildable) -----------------------------------------
CREATE TABLE IF NOT EXISTS search_items (
  rowid     INTEGER PRIMARY KEY,
  item_type TEXT NOT NULL CHECK (item_type IN ('memory','segment')),
  item_id   TEXT NOT NULL,
  UNIQUE (item_type, item_id)
);
CREATE VIRTUAL TABLE IF NOT EXISTS search_fts USING fts5(
  content,
  tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TABLE IF NOT EXISTS embeddings (
  item_type TEXT NOT NULL,
  item_id   TEXT NOT NULL,
  model     TEXT NOT NULL,
  dim       INTEGER NOT NULL,
  vector    BLOB NOT NULL,
  PRIMARY KEY (item_type, item_id, model)
);

-- AI GATEWAY: agents, quotas, context packages -----------------------------------
CREATE TABLE IF NOT EXISTS agents (
  id                 TEXT PRIMARY KEY,
  name               TEXT NOT NULL UNIQUE,
  token_hash         TEXT NOT NULL UNIQUE,
  status             TEXT NOT NULL CHECK (status IN ('active','revoked')),
  max_classification INTEGER NOT NULL CHECK (max_classification BETWEEN 0 AND 4),
  scopes             TEXT NOT NULL,
  categories         TEXT NOT NULL,
  quota_per_hour     INTEGER NOT NULL CHECK (quota_per_hour > 0),
  max_results        INTEGER NOT NULL CHECK (max_results > 0),
  source_id          TEXT REFERENCES sources(id) ON DELETE SET NULL,
  created_at         TEXT NOT NULL,
  revoked_at         TEXT
);

CREATE TABLE IF NOT EXISTS agent_usage (
  agent_id     TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  window_start TEXT NOT NULL,
  count        INTEGER NOT NULL,
  PRIMARY KEY (agent_id, window_start)
);

-- Packages store references only (never content, never the query text); content is
-- re-assembled live under current policy. Deleting a memory deletes every package citing it.
CREATE TABLE IF NOT EXISTS context_packages (
  id                     TEXT PRIMARY KEY,
  agent_id               TEXT REFERENCES agents(id) ON DELETE CASCADE,
  purpose                TEXT NOT NULL,
  created_at             TEXT NOT NULL,
  expires_at             TEXT NOT NULL,
  classification_ceiling INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS context_package_items (
  package_id TEXT NOT NULL REFERENCES context_packages(id) ON DELETE CASCADE,
  memory_id  TEXT NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  section    TEXT NOT NULL,
  position   INTEGER NOT NULL,
  PRIMARY KEY (package_id, memory_id)
);
CREATE INDEX IF NOT EXISTS ix_cpi_memory ON context_package_items(memory_id);

-- GUARDIAN: emergency stop flags -----------------------------------------------
CREATE TABLE IF NOT EXISTS system_flags (
  key    TEXT PRIMARY KEY CHECK (key IN ('gateway_stopped','writes_frozen','learning_paused')),
  value  INTEGER NOT NULL CHECK (value IN (0,1)),
  set_at TEXT NOT NULL,
  set_by TEXT NOT NULL
);

-- AUDIT (append-only, hash-chained, never stores content) -------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          TEXT NOT NULL,
  actor       TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  outcome     TEXT NOT NULL CHECK (outcome IN ('allowed','denied','error')),
  detail      TEXT,
  prev_hash   TEXT NOT NULL,
  entry_hash  TEXT NOT NULL
);
CREATE TRIGGER IF NOT EXISTS audit_log_no_update BEFORE UPDATE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_log_no_delete BEFORE DELETE ON audit_log
BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
