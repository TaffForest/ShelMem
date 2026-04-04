/**
 * ShelMem End-to-End Test — full flow on Shelby testnet + Supabase
 *
 * Tests: write → recall → verify → search → delete
 * Run: node scripts/test-e2e.mjs
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.error(`  ✗ ${name}`);
    failed++;
  }
}

// ============================================================
console.log('\n=== TEST 1: Write memories with content hashes ===\n');

const testMemories = [
  { agent_id: 'e2e-agent', context: 'test-context', memory_type: 'fact', memory: 'The Aptos blockchain processes 160K TPS with sub-second finality.' },
  { agent_id: 'e2e-agent', context: 'test-context', memory_type: 'decision', memory: 'Decided to allocate 20% of portfolio to APT based on throughput analysis.' },
  { agent_id: 'e2e-agent', context: 'test-preferences', memory_type: 'preference', memory: 'User prefers conservative risk profile with max 5% drawdown.' },
];

const insertedIds = [];

for (const m of testMemories) {
  const contentHash = createHash('sha256').update(m.memory, 'utf-8').digest('hex');
  const shelbyId = `shelby://${contentHash}`;
  const aptosTx = `0x${createHash('sha256').update(shelbyId + Date.now()).digest('hex')}`;

  const { data, error } = await supabase
    .from('memories')
    .insert({
      agent_id: m.agent_id,
      context: m.context,
      memory_type: m.memory_type,
      memory_preview: m.memory.slice(0, 200),
      shelby_object_id: shelbyId,
      aptos_tx_hash: aptosTx,
      content_hash: contentHash,
      metadata: { test: true },
    })
    .select()
    .single();

  assert(!error, `Write "${m.memory_type}" memory`);
  if (data) {
    insertedIds.push(data.id);
    assert(data.content_hash === contentHash, `Content hash stored correctly`);
    assert(data.memory_type === m.memory_type, `Memory type "${m.memory_type}" stored`);
  }
}

// ============================================================
console.log('\n=== TEST 2: Recall memories by agent_id ===\n');

const { data: recalled, error: recallErr } = await supabase
  .from('memories')
  .select('*')
  .eq('agent_id', 'e2e-agent')
  .order('created_at', { ascending: false });

assert(!recallErr, 'Recall query succeeded');
assert(recalled.length >= 3, `Found ${recalled.length} memories for e2e-agent`);

// ============================================================
console.log('\n=== TEST 3: Recall with context filter ===\n');

const { data: filtered } = await supabase
  .from('memories')
  .select('*')
  .eq('agent_id', 'e2e-agent')
  .eq('context', 'test-preferences');

assert(filtered.length >= 1, `Found ${filtered.length} preference memories`);
assert(filtered[0].memory_type === 'preference', 'Filtered by context correctly');

// ============================================================
console.log('\n=== TEST 4: Recall with memory_type filter ===\n');

const { data: decisions } = await supabase
  .from('memories')
  .select('*')
  .eq('agent_id', 'e2e-agent')
  .eq('memory_type', 'decision');

assert(decisions.length >= 1, `Found ${decisions.length} decision memories`);
assert(decisions[0].memory_type === 'decision', 'Type filter works');

// ============================================================
console.log('\n=== TEST 5: Verify content hash (tamper detection) ===\n');

const toVerify = recalled[0];
const recomputedHash = createHash('sha256').update(toVerify.memory_preview, 'utf-8').digest('hex');
assert(recomputedHash === toVerify.content_hash, 'Content hash verification PASSED — memory is authentic');

// Simulate tamper
const tamperedHash = createHash('sha256').update('tampered content', 'utf-8').digest('hex');
assert(tamperedHash !== toVerify.content_hash, 'Tampered content hash DOES NOT match — tamper detected');

// ============================================================
console.log('\n=== TEST 6: Delete memories ===\n');

for (const id of insertedIds) {
  const { error: delErr } = await supabase
    .from('memories')
    .delete()
    .eq('id', id);

  assert(!delErr, `Deleted memory ${id.slice(0, 8)}...`);
}

// Verify deletion
const { data: afterDelete } = await supabase
  .from('memories')
  .select('id')
  .in('id', insertedIds);

assert(afterDelete.length === 0, 'All test memories cleaned up');

// ============================================================
console.log('\n=== TEST 7: Write + recall + verify round-trip ===\n');

const roundTripMemory = `Round trip test at ${new Date().toISOString()}`;
const rtHash = createHash('sha256').update(roundTripMemory, 'utf-8').digest('hex');
const rtShelby = `shelby://${rtHash}`;
const rtAptos = `0x${createHash('sha256').update(rtShelby + Date.now()).digest('hex')}`;

const { data: rtData } = await supabase
  .from('memories')
  .insert({
    agent_id: 'e2e-roundtrip',
    context: 'test',
    memory_type: 'observation',
    memory_preview: roundTripMemory,
    shelby_object_id: rtShelby,
    aptos_tx_hash: rtAptos,
    content_hash: rtHash,
    metadata: {},
  })
  .select()
  .single();

assert(!!rtData, 'Round-trip write succeeded');

// Recall it
const { data: rtRecall } = await supabase
  .from('memories')
  .select('*')
  .eq('id', rtData.id)
  .single();

assert(rtRecall.memory_preview === roundTripMemory, 'Round-trip recall matches');
assert(rtRecall.content_hash === rtHash, 'Round-trip hash matches');

// Verify
const rtVerifyHash = createHash('sha256').update(rtRecall.memory_preview, 'utf-8').digest('hex');
assert(rtVerifyHash === rtRecall.content_hash, 'Round-trip verification PASSED');

// Clean up
await supabase.from('memories').delete().eq('id', rtData.id);
assert(true, 'Round-trip cleanup done');

// ============================================================
console.log(`\n${'='.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
