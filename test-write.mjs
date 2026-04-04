/**
 * ShelMem Test Script — writes sample agent memories to Supabase
 * Run: node test-write.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

const SUPABASE_URL = 'https://tjystaagxkbdpqdansow.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeXN0YWFneGtiZHBxZGFuc293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc4NDcsImV4cCI6MjA5MDczMzg0N30.9JCUFAhMn3WOBPRBxFzIOSC6v2fPY6KCPunH8s9w6TU';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mock Shelby address generator (same as SDK mock mode)
function mockShelbyAddress(content) {
  const hash = createHash('sha256').update(content).digest('hex');
  return `shelby://${hash}`;
}

function mockAptosTx(addr) {
  const hash = createHash('sha256').update(addr + Date.now()).digest('hex');
  return `0x${hash}`;
}

const memories = [
  {
    agent_id: 'trading-agent-01',
    context: 'market-analysis',
    memory: 'ETH RSI dropped to 28 — below oversold threshold. Entered long position at $2,847. Portfolio allocation: 15% ETH, 85% USDC.',
  },
  {
    agent_id: 'trading-agent-01',
    context: 'market-analysis',
    memory: 'BTC broke above 200-day MA at $68,400. Increased BTC exposure from 0% to 10%. Reduced USDC to 75%.',
  },
  {
    agent_id: 'trading-agent-01',
    context: 'risk-management',
    memory: 'User set max drawdown to 5%. Stop-loss triggers at portfolio value -5% from high water mark.',
  },
  {
    agent_id: 'support-agent-02',
    context: 'user-preferences',
    memory: 'User prefers concise responses. Dark mode enabled. Timezone: UTC+10 (Sydney). Language: English.',
  },
  {
    agent_id: 'support-agent-02',
    context: 'conversation-history',
    memory: 'User asked about staking rewards on Aptos. Explained ~7% APY via delegation. User said they would consider it after mainnet launch.',
  },
  {
    agent_id: 'research-agent-03',
    context: 'protocol-analysis',
    memory: 'Shelby Protocol testnet throughput: 1.2GB/s aggregate across 12 SP nodes. Latency p99: 340ms for 1MB blob upload. Compared to Arweave: 10x faster for hot reads.',
  },
];

console.log('Writing', memories.length, 'test memories to Supabase...\n');

for (const m of memories) {
  const shelbyId = mockShelbyAddress(m.memory);
  const aptosTx = mockAptosTx(shelbyId);

  const { data, error } = await supabase
    .from('memories')
    .insert({
      agent_id: m.agent_id,
      context: m.context,
      memory_preview: m.memory.slice(0, 200),
      shelby_object_id: shelbyId,
      aptos_tx_hash: aptosTx,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    console.error('✗', m.agent_id, '/', m.context, '—', error.message);
  } else {
    console.log('✓', m.agent_id, '/', m.context);
    console.log('  shelby:', shelbyId.slice(0, 40) + '...');
    console.log('  aptos:', aptosTx.slice(0, 20) + '...');
    console.log('  time:', data.created_at);
    console.log();
  }
}

console.log('Done. Open http://localhost:3000/dashboard to see them.');
