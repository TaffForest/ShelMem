#!/usr/bin/env node

/**
 * ShelMem Demo Trading Agent
 *
 * A simple agent that:
 * 1. Starts with a balance
 * 2. Checks a price (simulated)
 * 3. Decides whether to buy or sell based on simple RSI logic
 * 4. Records the transaction with recordTransaction()
 * 5. Snapshots its balance with recordBalanceSnapshot()
 * 6. Recalls past decisions before making new ones
 *
 * Run: node examples/trading-agent.mjs
 *
 * Requires: SUPABASE_URL and SUPABASE_KEY env vars (or uses defaults below)
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// --- Config ---
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tjystaagxkbdpqdansow.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqeXN0YWFneGtiZHBxZGFuc293Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTc4NDcsImV4cCI6MjA5MDczMzg0N30.9JCUFAhMn3WOBPRBxFzIOSC6v2fPY6KCPunH8s9w6TU';

const AGENT_ID = 'demo-trading-agent';
const STARTING_BALANCE = 10000;
const CURRENCY = 'APT';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Helpers ---
function hash(s) { return createHash('sha256').update(s).digest('hex'); }
function mockShelby(h) { return `shelby://mock/${h}`; }
function mockTx(a) { return `0x${createHash('sha256').update(a + Date.now()).digest('hex')}`; }

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Simulated price feed
function getPrice() {
  const base = 8.50;
  const volatility = 0.4;
  return +(base + (Math.random() - 0.5) * volatility * 2).toFixed(4);
}

// Simulated RSI that creates interesting trading decisions
function calculateRSI(prices, round) {
  // Alternate between oversold/overbought to guarantee trades in the demo
  const pattern = [35, 65, 28, 72, 45, 68, 32, 55];
  const base = pattern[round % pattern.length];
  const noise = (Math.random() - 0.5) * 8;
  return +(base + noise).toFixed(1);
}

// --- ShelMem write helpers (using Supabase directly for the demo) ---
async function writeMemory(memory, context, memoryType, extra = {}) {
  const contentHash = hash(memory);
  const shelbyId = mockShelby(contentHash.slice(0, 16));
  const aptosTx = mockTx(shelbyId);

  const { data, error } = await supabase.from('memories').insert({
    agent_id: AGENT_ID,
    context,
    memory_type: memoryType,
    memory_preview: memory.slice(0, 200),
    shelby_object_id: shelbyId,
    aptos_tx_hash: aptosTx,
    content_hash: contentHash,
    metadata: {},
    ...extra,
  }).select().single();

  if (error) console.error('  Write failed:', error.message);
  return data;
}

async function recallMemories(context, limit = 5) {
  const { data } = await supabase
    .from('memories')
    .select('*')
    .eq('agent_id', AGENT_ID)
    .eq('context', context)
    .order('created_at', { ascending: false })
    .limit(limit);
  return data || [];
}

// --- Main agent loop ---
async function run() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     ShelMem Demo Trading Agent                  ║');
  console.log('║     Tamper-proof memory for AI agent payments   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Agent:    ${AGENT_ID}`);
  console.log(`Balance:  ${STARTING_BALANCE} ${CURRENCY}`);
  console.log(`Strategy: RSI-based (buy < 40, sell > 60)`);
  console.log('');

  let balance = STARTING_BALANCE;
  const priceHistory = [];
  const rounds = 6;

  // Record initial balance
  await writeMemory(
    `Starting balance: ${balance} ${CURRENCY}`,
    'treasury', 'balance_snapshot',
    { amount: balance, currency: CURRENCY }
  );
  console.log(`✓ [balance_snapshot] Starting balance: ${balance} ${CURRENCY}`);
  console.log('');

  for (let round = 1; round <= rounds; round++) {
    console.log(`── Round ${round}/${rounds} ${'─'.repeat(38)}`);

    // 1. Check price
    const price = getPrice();
    priceHistory.push(price);
    const rsi = calculateRSI(priceHistory, round);
    console.log(`  Price: ${price} ${CURRENCY}  |  RSI: ${rsi}`);

    // 2. Recall past decisions
    const pastDecisions = await recallMemories('trading');
    if (pastDecisions.length > 0) {
      console.log(`  Recalling ${pastDecisions.length} past decision(s)...`);
    }

    // 3. Decide
    let action = 'hold';
    let tradeAmount = 0;

    if (rsi < 40 && balance > 100) {
      action = 'buy';
      tradeAmount = Math.min(Math.round(balance * 0.1), 500);
    } else if (rsi > 60) {
      action = 'sell';
      tradeAmount = Math.min(Math.round(balance * 0.08), 400);
    }

    // 4. Record decision
    const decisionMemory = `Round ${round}: RSI=${rsi}, price=${price}. Decision: ${action}${tradeAmount > 0 ? ` ${tradeAmount} ${CURRENCY}` : ''}`;
    await writeMemory(decisionMemory, 'trading', 'decision');
    console.log(`  Decision: ${action.toUpperCase()}${tradeAmount > 0 ? ` ${tradeAmount} ${CURRENCY}` : ''}`);

    // 5. Execute trade + record transaction
    if (action === 'buy' && tradeAmount > 0) {
      balance -= tradeAmount;
      const counterparty = `0x${hash('market-maker-' + round).slice(0, 40)}`;
      await writeMemory(
        `Bought ${tradeAmount} ${CURRENCY} at price ${price}. RSI was ${rsi} (oversold).`,
        'payments', 'transaction_record',
        { amount: tradeAmount, currency: CURRENCY, counterparty, tx_status: 'confirmed' }
      );
      console.log(`  ✓ [transaction] Bought ${tradeAmount} ${CURRENCY} → ${counterparty.slice(0, 12)}...`);
    } else if (action === 'sell' && tradeAmount > 0) {
      balance += tradeAmount;
      const counterparty = `0x${hash('exchange-' + round).slice(0, 40)}`;
      await writeMemory(
        `Sold ${tradeAmount} ${CURRENCY} at price ${price}. RSI was ${rsi} (overbought).`,
        'payments', 'transaction_record',
        { amount: tradeAmount, currency: CURRENCY, counterparty, tx_status: 'confirmed' }
      );
      console.log(`  ✓ [transaction] Sold ${tradeAmount} ${CURRENCY} → ${counterparty.slice(0, 12)}...`);
    } else {
      // Record observation
      await writeMemory(
        `Round ${round}: Held position. RSI=${rsi} is neutral. Price=${price}.`,
        'market', 'observation'
      );
      console.log(`  ○ [observation] Held position`);
    }

    // 6. Snapshot balance
    await writeMemory(
      `Balance after round ${round}: ${balance} ${CURRENCY}`,
      'treasury', 'balance_snapshot',
      { amount: balance, currency: CURRENCY }
    );
    console.log(`  ✓ [balance] ${balance} ${CURRENCY}`);
    console.log('');

    if (round < rounds) await sleep(800);
  }

  // Final summary
  const pnl = balance - STARTING_BALANCE;
  const pnlPct = ((pnl / STARTING_BALANCE) * 100).toFixed(2);
  const totalTrades = (await recallMemories('payments', 100)).length;

  console.log('══════════════════════════════════════════════════');
  console.log(`  Final Balance:  ${balance} ${CURRENCY}`);
  console.log(`  P&L:            ${pnl >= 0 ? '+' : ''}${pnl} ${CURRENCY} (${pnlPct}%)`);
  console.log(`  Total Trades:   ${totalTrades}`);
  console.log(`  Rounds:         ${rounds}`);
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('All memories stored with SHA-256 hashes and Shelby addresses.');
  console.log('View them at: https://shelmem.forestinfra.com/dashboard');
  console.log('Treasury view: https://shelmem.forestinfra.com/dashboard/treasury');
  console.log('');
}

run().catch(console.error);
