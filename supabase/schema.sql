-- ShelMem: Supabase schema for agent memory metadata
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  context TEXT NOT NULL,
  memory_preview TEXT,
  shelby_object_id TEXT NOT NULL,
  aptos_tx_hash TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_memories_agent_id ON memories(agent_id);
CREATE INDEX IF NOT EXISTS idx_memories_agent_context ON memories(agent_id, context);
CREATE INDEX IF NOT EXISTS idx_memories_created_at ON memories(created_at DESC);

-- Row Level Security
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Policy: service role has full access (used by SDK with service key)
CREATE POLICY "Service role full access" ON memories
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy: anon users can read all memories (dashboard uses anon key)
CREATE POLICY "Anon read access" ON memories
  FOR SELECT
  USING (true);

-- Policy: anon users can delete their own memories (dashboard delete)
CREATE POLICY "Anon delete access" ON memories
  FOR DELETE
  USING (true);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER memories_updated_at
  BEFORE UPDATE ON memories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
