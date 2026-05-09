-- ShelMem v5: Shared multi-agent memory pools
-- Run this in your Supabase SQL editor after migration-v4.sql.
--
-- Adds two new tables (memory_pools, pool_members) and a nullable pool_id
-- column on memories. NULL pool_id = private memory (existing behaviour).
--
-- Pool membership is enforced at the SDK layer in v1. Service-role policies
-- preserve full access for SDK writes; anon SELECT mirrors the existing
-- memories policy. Cryptographic agent identity (agent JWT) is intentionally
-- deferred to a follow-up.

CREATE TABLE IF NOT EXISTS memory_pools (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_agent_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pool_members (
  pool_id UUID NOT NULL REFERENCES memory_pools(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'writer', 'reader')),
  added_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (pool_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_pool_members_agent ON pool_members(agent_id);

ALTER TABLE memories
  ADD COLUMN IF NOT EXISTS pool_id UUID REFERENCES memory_pools(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_memories_pool_created
  ON memories(pool_id, created_at DESC);

ALTER TABLE memory_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on pools" ON memory_pools
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Service role full access on members" ON pool_members
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon read/write access mirrors the memories table's "Allow all" convention.
-- Pool membership is enforced at the SDK layer (assertRole). Tightening RLS
-- to require an agent JWT is deferred to a follow-up.
DROP POLICY IF EXISTS "Anon read pools" ON memory_pools;
CREATE POLICY "Anon read pools" ON memory_pools
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon insert pools" ON memory_pools;
CREATE POLICY "Anon insert pools" ON memory_pools
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon update pools" ON memory_pools;
CREATE POLICY "Anon update pools" ON memory_pools
  FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon delete pools" ON memory_pools;
CREATE POLICY "Anon delete pools" ON memory_pools
  FOR DELETE USING (true);

DROP POLICY IF EXISTS "Anon read members" ON pool_members;
CREATE POLICY "Anon read members" ON pool_members
  FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anon insert members" ON pool_members;
CREATE POLICY "Anon insert members" ON pool_members
  FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Anon update members" ON pool_members;
CREATE POLICY "Anon update members" ON pool_members
  FOR UPDATE USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Anon delete members" ON pool_members;
CREATE POLICY "Anon delete members" ON pool_members
  FOR DELETE USING (true);

CREATE OR REPLACE FUNCTION add_pool_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO pool_members (pool_id, agent_id, role)
  VALUES (NEW.id, NEW.owner_agent_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS memory_pools_add_owner ON memory_pools;
CREATE TRIGGER memory_pools_add_owner
  AFTER INSERT ON memory_pools
  FOR EACH ROW
  EXECUTE FUNCTION add_pool_owner_as_member();

DROP TRIGGER IF EXISTS memory_pools_updated_at ON memory_pools;
CREATE TRIGGER memory_pools_updated_at
  BEFORE UPDATE ON memory_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
