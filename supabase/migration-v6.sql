-- ShelMem v6: Per-memory ACLs, pool-aware semantic search, and access auditing.
-- Apply after migration-v5.sql.

-- ────────────────────────────────────────────────────────────────────────
-- 1. Per-memory ACLs
-- ────────────────────────────────────────────────────────────────────────
-- Optional list of agent_ids that can read this memory in addition to its
-- owner / pool members. NULL pool_id + non-empty shared_with = privately
-- shared with explicit agents (no pool involved).

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS shared_with TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_memories_shared_with
  ON memories USING gin (shared_with);

-- ────────────────────────────────────────────────────────────────────────
-- 2. Pool-aware semantic search RPC
-- ────────────────────────────────────────────────────────────────────────
-- Mirrors match_memories but filters by pool_id instead of agent_id.

CREATE OR REPLACE FUNCTION match_pool_memories(
  query_embedding vector(1536),
  filter_pool_id  UUID,
  match_threshold FLOAT DEFAULT 0.5,
  match_count     INT DEFAULT 10
)
RETURNS TABLE (
  id              UUID,
  agent_id        TEXT,
  pool_id         UUID,
  context         TEXT,
  memory_preview  TEXT,
  memory_type     TEXT,
  content_hash    TEXT,
  aptos_tx_hash   TEXT,
  created_at      TIMESTAMPTZ,
  similarity      FLOAT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    m.id, m.agent_id, m.pool_id, m.context, m.memory_preview,
    m.memory_type, m.content_hash, m.aptos_tx_hash, m.created_at,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memories m
  WHERE m.pool_id = filter_pool_id
    AND m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ────────────────────────────────────────────────────────────────────────
-- 3. Pool access audit log
-- ────────────────────────────────────────────────────────────────────────
-- One row per pool read/write. action ∈ ('write','read'). memory_id is
-- populated for writes; for reads it's NULL and result_count records the
-- number of memories returned. Owner can read the log via getPoolAuditLog.

CREATE TABLE IF NOT EXISTS pool_access_log (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id      UUID NOT NULL REFERENCES memory_pools(id) ON DELETE CASCADE,
  agent_id     TEXT NOT NULL,
  action       TEXT NOT NULL CHECK (action IN ('write','read')),
  memory_id    UUID REFERENCES memories(id) ON DELETE SET NULL,
  result_count INT,
  metadata     JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_pool_created
  ON pool_access_log(pool_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_agent
  ON pool_access_log(agent_id, created_at DESC);

ALTER TABLE pool_access_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on audit" ON pool_access_log;
CREATE POLICY "Service role full access on audit" ON pool_access_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Anon read audit"   ON pool_access_log;
DROP POLICY IF EXISTS "Anon insert audit" ON pool_access_log;
CREATE POLICY "Anon read audit"   ON pool_access_log FOR SELECT USING (true);
CREATE POLICY "Anon insert audit" ON pool_access_log FOR INSERT WITH CHECK (true);
