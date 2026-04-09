#!/usr/bin/env node

/**
 * ShelMem Demo Trading Agent
 *
 * A simple agent that uses the ShelMem SDK to:
 * 1. Start with a balance and snapshot it
 * 2. Check a price feed (simulated)
 * 3. Decide whether to buy or sell based on RSI
 * 4. Record transactions via recordTransaction()
 * 5. Snapshot balance via recordBalanceSnapshot()
 * 6. Recall past decisions before making new ones
 *
 * Content → Shelby Protocol (decentralised storage)
 * Metadata → Supabase (queryable index)
 *
 * Run: node examples/trading-agent.mjs
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

// Import from the built SDK
const { ShelMem } = await import('../sdk-ts/dist/index.js');

// --- Config ---
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const AGENT_ID = 'demo-trading-agent';
const STARTING_BALANCE = 10000;
const CURRENCY = 'APT';

// Initialise ShelMem — mock mode stores content locally, metadata to Supabase
const mem = new ShelMem({
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY,
  mock: true, // Content stored in local mock. Set false + provide aptosPrivateKey for real Shelby.
});

// --- Helpers ---
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getPrice() {
  const base = 8.50;
  const volatility = 0.4;
  return +(base + (Math.random() - 0.5) * volatility * 2).toFixed(4);
}

function calculateRSI(round) {
  const pattern = [35, 65, 28, 72, 45, 68, 32, 55];
  const base = pattern[round % pattern.length];
  const noise = (Math.random() - 0.5) * 8;
  return +(base + noise).toFixed(1);
}

// --- Main agent loop ---
async function run() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║     ShelMem Demo Trading Agent                  ║');
  console.log('║     Content → Shelby  |  Metadata → Supabase   ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`Agent:    ${AGENT_ID}`);
  console.log(`Balance:  ${STARTING_BALANCE} ${CURRENCY}`);
  console.log(`Strategy: RSI-based (buy < 40, sell > 60)`);
  console.log(`Mode:     ${mem.constructor.name} (mock — content in local store)`);
  console.log('');

  let balance = STARTING_BALANCE;
  const rounds = 6;

  // Record initial balance via SDK
  const initResult = await mem.recordBalanceSnapshot({
    agentId: AGENT_ID,
    memory: `Starting balance: ${balance} ${CURRENCY}`,
    context: 'treasury',
    amount: balance,
    currency: CURRENCY,
  });
  console.log(`✓ [balance_snapshot] ${balance} ${CURRENCY}  hash:${initResult.content_hash.slice(0, 12)}...`);
  console.log('');

  for (let round = 1; round <= rounds; round++) {
    console.log(`── Round ${round}/${rounds} ${'─'.repeat(38)}`);

    // 1. Check price
    const price = getPrice();
    const rsi = calculateRSI(round);
    console.log(`  Price: ${price} ${CURRENCY}  |  RSI: ${rsi}`);

    // 2. Recall past decisions via SDK
    const pastDecisions = await mem.recall(AGENT_ID, 'trading', 5, 'decision');
    if (pastDecisions.length > 0) {
      console.log(`  Recalled ${pastDecisions.length} past decision(s)`);
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

    // 4. Record decision via SDK
    const decisionResult = await mem.write(
      AGENT_ID,
      `Round ${round}: RSI=${rsi}, price=${price}. Decision: ${action}${tradeAmount > 0 ? ` ${tradeAmount} ${CURRENCY}` : ''}`,
      'trading',
      'decision'
    );
    console.log(`  Decision: ${action.toUpperCase()}${tradeAmount > 0 ? ` ${tradeAmount} ${CURRENCY}` : ''}  hash:${decisionResult.content_hash.slice(0, 12)}...`);

    // 5. Execute trade via SDK
    if (action === 'buy' && tradeAmount > 0) {
      balance -= tradeAmount;
      const counterparty = `0x${Buffer.from(`market-maker-${round}`).toString('hex').slice(0, 40)}`;

      const txResult = await mem.recordTransaction({
        agentId: AGENT_ID,
        memory: `Bought ${tradeAmount} ${CURRENCY} at price ${price}. RSI was ${rsi} (oversold).`,
        context: 'payments',
        amount: tradeAmount,
        currency: CURRENCY,
        counterparty,
        txStatus: 'confirmed',
      });
      console.log(`  ✓ [tx] Bought ${tradeAmount} ${CURRENCY} → ${counterparty.slice(0, 14)}...  hash:${txResult.content_hash.slice(0, 12)}...`);

    } else if (action === 'sell' && tradeAmount > 0) {
      balance += tradeAmount;
      const counterparty = `0x${Buffer.from(`exchange-${round}`).toString('hex').slice(0, 40)}`;

      const txResult = await mem.recordTransaction({
        agentId: AGENT_ID,
        memory: `Sold ${tradeAmount} ${CURRENCY} at price ${price}. RSI was ${rsi} (overbought).`,
        context: 'payments',
        amount: tradeAmount,
        currency: CURRENCY,
        counterparty,
        txStatus: 'confirmed',
      });
      console.log(`  ✓ [tx] Sold ${tradeAmount} ${CURRENCY} → ${counterparty.slice(0, 14)}...  hash:${txResult.content_hash.slice(0, 12)}...`);

    } else {
      await mem.write(
        AGENT_ID,
        `Round ${round}: Held position. RSI=${rsi} is neutral. Price=${price}.`,
        'market',
        'observation'
      );
      console.log(`  ○ [observation] Held position`);
    }

    // 6. Snapshot balance via SDK
    const balResult = await mem.recordBalanceSnapshot({
      agentId: AGENT_ID,
      memory: `Balance after round ${round}: ${balance} ${CURRENCY}`,
      context: 'treasury',
      amount: balance,
      currency: CURRENCY,
    });
    console.log(`  ✓ [balance] ${balance} ${CURRENCY}  hash:${balResult.content_hash.slice(0, 12)}...`);
    console.log('');

    if (round < rounds) await sleep(800);
  }

  // Final — use SDK to get latest balance
  const latestBalance = await mem.getLatestBalance(AGENT_ID);
  const allMemories = await mem.recall(AGENT_ID, 'payments', 100, 'transaction_record');

  const pnl = balance - STARTING_BALANCE;
  const pnlPct = ((pnl / STARTING_BALANCE) * 100).toFixed(2);

  console.log('══════════════════════════════════════════════════');
  console.log(`  Final Balance:  ${latestBalance?.amount ?? balance} ${latestBalance?.currency ?? CURRENCY}`);
  console.log(`  P&L:            ${pnl >= 0 ? '+' : ''}${pnl} ${CURRENCY} (${pnlPct}%)`);
  console.log(`  Total Trades:   ${allMemories.length}`);
  console.log(`  Rounds:         ${rounds}`);
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('Every memory content-hashed (SHA-256) and stored via ShelMem SDK.');
  console.log('Metadata queryable at Supabase. Content on Shelby (mock mode).');
  console.log('');
  console.log('View:     https://shelmem.forestinfra.com/dashboard');
  console.log('Treasury: https://shelmem.forestinfra.com/dashboard/treasury');
  console.log('');
}

run().catch(console.error);
