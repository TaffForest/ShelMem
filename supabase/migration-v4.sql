-- ShelMem v4: Treasury fields for AI agent payment state
-- Run this in your Supabase SQL editor after migration-v3.sql

-- Treasury-specific columns (all nullable — only used by treasury memory types)
ALTER TABLE memories ADD COLUMN IF NOT EXISTS amount NUMERIC;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS counterparty TEXT;
ALTER TABLE memories ADD COLUMN IF NOT EXISTS tx_status TEXT;
-- tx_status values: pending | confirmed | failed

-- These columns support three new memory_type values:
--   transaction_record  — records of agent payments (amount, currency, counterparty, tx_status)
--   balance_snapshot    — point-in-time balance records (amount, currency)
--   spending_policy     — agent spending rules and limits
-- No new indexes needed — existing (agent_id, memory_type) index covers treasury filtering.
