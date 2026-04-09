/**
 * Write treasury test data to Supabase
 * Run: node scripts/test-treasury.mjs
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function hash(s) { return createHash('sha256').update(s).digest('hex'); }
function mockAddr(h) { return `shelby://mock/${h}`; }
function mockTx(a) { return `0x${createHash('sha256').update(a + Date.now()).digest('hex')}`; }

const entries = [
  {
    agent_id: 'trading-agent-01', context: 'payments', memory_type: 'transaction_record',
    memory_preview: 'Paid 250 APT to 0xvendor for compute credits',
    amount: 250, currency: 'APT', counterparty: '0xvendor8a3f9c2d1e7b6042a5d3f8c1e9b7a6d4f2c8', tx_status: 'confirmed',
  },
  {
    agent_id: 'trading-agent-01', context: 'payments', memory_type: 'transaction_record',
    memory_preview: 'Sent 75 USDT to 0xpartner for data feed subscription',
    amount: 75, currency: 'USDT', counterparty: '0xpartner2b4e7d9f1a3c8056b2d4e7f9a1c3b5d7e9f2', tx_status: 'pending',
  },
  {
    agent_id: 'trading-agent-01', context: 'payments', memory_type: 'transaction_record',
    memory_preview: 'Received 500 APT from 0xclient as payment for analytics',
    amount: 500, currency: 'APT', counterparty: '0xclient4f8a2c6e1d3b7950c4f8a2e6d1b3c7f9a5d2', tx_status: 'confirmed',
  },
  {
    agent_id: 'trading-agent-01', context: 'treasury', memory_type: 'balance_snapshot',
    memory_preview: 'End-of-day balance: 4,725 APT after 3 transactions',
    amount: 4725, currency: 'APT', counterparty: null, tx_status: null,
  },
  {
    agent_id: 'trading-agent-01', context: 'treasury', memory_type: 'spending_policy',
    memory_preview: 'Max daily spend: 1000 APT. Requires approval above 500 APT per transaction.',
    amount: 1000, currency: 'APT', counterparty: null, tx_status: null,
  },
];

console.log('Writing', entries.length, 'treasury test entries...\n');

for (const e of entries) {
  const contentHash = hash(e.memory_preview);
  const shelbyId = mockAddr(contentHash.slice(0, 16));
  const aptosTx = mockTx(shelbyId);

  const { data, error } = await supabase.from('memories').insert({
    ...e,
    shelby_object_id: shelbyId,
    aptos_tx_hash: aptosTx,
    content_hash: contentHash,
    metadata: {},
  }).select().single();

  if (error) {
    console.error('✗', e.memory_type, '—', error.message);
  } else {
    console.log(`✓ [${e.memory_type}] ${e.amount} ${e.currency} — ${e.tx_status || 'n/a'}`);
  }
}

console.log('\nDone. Check the dashboard — treasury panel should now appear.');
