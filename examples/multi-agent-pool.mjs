#!/usr/bin/env node

/**
 * ShelMem Shared Multi-Agent Memory — Demo
 *
 * Four agents collaborate through a single shared pool:
 *
 *   trading-agent     (owner)   writes a market decision
 *   execution-agent   (writer)  reads the decision, records the trade
 *   risk-agent        (writer)  validates the trade
 *   reporting-agent   (reader)  archives a summary; cannot write
 *
 * Prerequisite: apply supabase/migration-v5.sql to your Supabase project.
 * Run:          node examples/multi-agent-pool.mjs
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const { ShelMem, PermissionError } = await import('../sdk-ts/dist/index.js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const TRADING = 'trading-agent';
const EXECUTION = 'execution-agent';
const RISK = 'risk-agent';
const REPORTING = 'reporting-agent';

const mem = new ShelMem({
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY,
  mock: true,
});

function header(title) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(72));
}

function log(icon, label, msg) {
  console.log(`  ${icon} ${label.padEnd(10)} ${msg}`);
}

async function main() {
  header('1. trading-agent creates a shared pool "market-ops"');
  const pool = await mem.createPool({
    name: 'market-ops',
    ownerAgentId: TRADING,
    description: 'Shared workspace for trading + execution + risk + reporting',
  });
  log('🏛️', 'POOL', `id=${pool.id}  name=${pool.name}`);
  log('👤', 'MEMBER', `${TRADING} (owner — auto-added)`);

  header('2. trading-agent invites the other three agents');
  await mem.addPoolMember(pool.id, TRADING, EXECUTION, 'writer');
  log('➕', 'INVITE', `${EXECUTION} → writer`);
  await mem.addPoolMember(pool.id, TRADING, RISK, 'writer');
  log('➕', 'INVITE', `${RISK} → writer`);
  await mem.addPoolMember(pool.id, TRADING, REPORTING, 'reader');
  log('➕', 'INVITE', `${REPORTING} → reader`);

  header('3. trading-agent writes a market decision into the pool');
  await mem.writeToPool({
    poolId: pool.id,
    agentId: TRADING,
    memory: 'Round 1: RSI=35, price=$8.50. Decision: buy 500 APT',
    context: 'trading',
    memory_type: 'decision',
  });
  log('📝', 'WRITE', `${TRADING}: market decision recorded`);

  header('4. execution-agent reads the decision and records the trade');
  const decisions = await mem.recallFromPool({
    poolId: pool.id,
    agentId: EXECUTION,
    memory_type: 'decision',
    limit: 1,
  });
  log('📖', 'READ', `${EXECUTION} sees: "${decisions[0].memory}"`);
  await mem.writeToPool({
    poolId: pool.id,
    agentId: EXECUTION,
    memory: 'Filled 500 APT at $8.5012 (counterparty 0xabc…)',
    context: 'trading',
    memory_type: 'transaction_record',
    treasury: { amount: 500, currency: 'APT', counterparty: '0xabc', tx_status: 'confirmed' },
  });
  log('💸', 'TX', `${EXECUTION}: transaction recorded`);

  header('5. risk-agent validates the trade against limits');
  const all = await mem.recallFromPool({ poolId: pool.id, agentId: RISK, limit: 10 });
  log('📖', 'READ', `${RISK} sees ${all.length} pool memories`);
  await mem.writeToPool({
    poolId: pool.id,
    agentId: RISK,
    memory: 'Trade size 500 APT within position limit 1000 — APPROVED',
    context: 'trading',
    memory_type: 'observation',
  });
  log('✅', 'CHECK', `${RISK}: approval recorded`);

  header('6. reporting-agent (reader) summarises and tries to write');
  const summary = await mem.recallFromPool({
    poolId: pool.id,
    agentId: REPORTING,
    limit: 10,
  });
  log('📊', 'SUMMARY', `${REPORTING} sees ${summary.length} memories from ${
    new Set(summary.map(r => r.agent_id)).size
  } agents:`);
  for (const r of summary) {
    console.log(`     • [${r.memory_type.padEnd(20)}] ${r.agent_id.padEnd(16)} — ${r.memory.slice(0, 70)}`);
  }

  try {
    await mem.writeToPool({
      poolId: pool.id,
      agentId: REPORTING,
      memory: 'this should fail',
      context: 'trading',
    });
    log('❌', 'BUG', 'reader was allowed to write — this should not happen');
    process.exit(1);
  } catch (err) {
    if (err instanceof PermissionError) {
      log('🛡️', 'BLOCKED', `${REPORTING} tried to write → PermissionError: ${err.message}`);
    } else {
      throw err;
    }
  }

  header('Done — all four agents collaborated through one shared pool.');
}

main().catch(err => {
  console.error('\nExample failed:', err);
  process.exit(1);
});
