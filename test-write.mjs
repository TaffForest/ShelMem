/**
 * ShelMem v2 Test Script — writes sample memories with content hashes + types
 * Run: node test-write.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const SUPABASE_URL = 'https://tjystaagxkbdpqdansow.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeXN0YWFneGtiZHBxZGFuc293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc4NDcsImV4cCI6MjA5MDczMzg0N30.9JCUFAhMn3WOBPRBxFzIOSC6v2fPY6KCPunH8s9w6TU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function computeHash(content) {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

function mockShelbyAddress(hash) {
  return `shelby://${hash}`;
}

function mockAptosTx(addr) {
  return `0x${createHash('sha256').update(addr + Date.now()).digest('hex')}`;
}

// First, clear old test data
console.log('Clearing old test memories...\n');
await supabase.from('memories').delete().neq('id', '00000000-0000-0000-0000-000000000000');

const memories = [
  {
    agent_id: 'trading-agent-01',
    context: 'market-analysis',
    memory_type: 'observation',
    memory: 'ETH RSI dropped to 28 — below oversold threshold. Price at $2,847. Volume spike detected across major exchanges.',
  },
  {
    agent_id: 'trading-agent-01',
    context: 'market-analysis',
    memory_type: 'decision',
    memory: 'Entered long ETH position at $2,847. Allocation: 15% ETH, 85% USDC. Rationale: RSI oversold + volume divergence.',
  },
  {
    agent_id: 'trading-agent-01',
    context: 'risk-management',
    memory_type: 'preference',
    memory: 'User set max drawdown to 5%. Stop-loss triggers at portfolio value -5% from high water mark. No leverage.',
  },
  {
    agent_id: 'support-agent-02',
    context: 'user-preferences',
    memory_type: 'preference',
    memory: 'User prefers concise responses. Dark mode enabled. Timezone: UTC+10 (Sydney). Notification: email only.',
  },
  {
    agent_id: 'support-agent-02',
    context: 'conversation-history',
    memory_type: 'fact',
    memory: 'User asked about staking rewards on Aptos. Current APY is ~7% via delegation. User plans to stake after mainnet launch.',
  },
  {
    agent_id: 'research-agent-03',
    context: 'protocol-analysis',
    memory_type: 'observation',
    memory: 'Shelby Protocol testnet throughput: 1.2GB/s across 12 SP nodes. Latency p99: 340ms for 1MB blob. 10x faster than Arweave for hot reads.',
  },
  {
    agent_id: 'research-agent-03',
    context: 'competitive-intel',
    memory_type: 'fact',
    memory: 'MemWal (Walrus + Sui) raised $140M. No tamper detection. Locked to elizaOS. ShelMem advantage: verifiable memory integrity via SHA-256 + Aptos.',
  },
  {
    agent_id: 'trading-agent-01',
    context: 'market-analysis',
    memory_type: 'decision',
    memory: 'Closed ETH long at $3,102. PnL: +8.95%. Moved back to 100% USDC. RSI hit 72, approaching overbought.',
  },
];

console.log('Writing', memories.length, 'v2 memories with content hashes + types...\n');

for (const m of memories) {
  const contentHash = computeHash(m.memory);
  const shelbyId = mockShelbyAddress(contentHash);
  const aptosTx = mockAptosTx(shelbyId);

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
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    console.error('✗', m.agent_id, '/', m.context, '—', error.message);
  } else {
    console.log(`✓ [${m.memory_type}]`, m.agent_id, '/', m.context);
    console.log('  hash:', contentHash.slice(0, 16) + '...');
    console.log('  time:', data.created_at);
    console.log();
  }
}

console.log('Done. Open http://localhost:3000/dashboard to see verified memories with type badges.');
