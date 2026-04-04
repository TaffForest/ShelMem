-- ShelMem v3: Semantic Search with pgvector
-- Run this in your Supabase SQL editor after migration-v2.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (1536 dimensions = OpenAI text-embedding-3-small)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- HNSW index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops);

-- Semantic search function — called via supabase.rpc('match_memories', ...)
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding vector(1536),
  filter_agent_id text DEFAULT NULL,
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  agent_id text,
  context text,
  memory_preview text,
  memory_type text,
  content_hash char(64),
  aptos_tx_hash text,
  created_at timestamptz,
  similarity float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.agent_id,
    m.context,
    m.memory_preview,
    m.memory_type,
    m.content_hash,
    m.aptos_tx_hash,
    m.created_at,
    (1 - (m.embedding <=> query_embedding))::float AS similarity
  FROM memories m
  WHERE m.embedding IS NOT NULL
    AND (filter_agent_id IS NULL OR m.agent_id = filter_agent_id)
    AND (1 - (m.embedding <=> query_embedding)) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;
