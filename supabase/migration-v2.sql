-- ShelMem v2: Verifiable Memory & Typed Schemas
-- Run this in your Supabase SQL editor after schema.sql

ALTER TABLE memories ADD COLUMN IF NOT EXISTS content_hash CHAR(64);
ALTER TABLE memories ADD COLUMN IF NOT EXISTS memory_type TEXT DEFAULT 'observation';
ALTER TABLE memories ADD COLUMN IF NOT EXISTS verified BOOLEAN;

-- Index for filtering by memory type
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(agent_id, memory_type);
