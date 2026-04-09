#!/usr/bin/env node

/**
 * ShelMem Demo Trading Agent
 *
 * Shows every step of the ShelMem flow clearly:
 *   1. HASH    — SHA-256 content hash computed
 *   2. STORE   — content uploaded to Shelby Protocol
 *   3. ANCHOR  — Aptos transaction submitted as proof
 *   4. INDEX   — metadata + hash stored in Supabase
 *   5. RECALL  — query Supabase, download from Shelby, verify hash
 *
 * Run: node examples/trading-agent.mjs
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const { ShelMem } = await import('../sdk-ts/dist/index.js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
  process.exit(1);
}

const AGENT_ID = 'demo-trading-agent';
const STARTING_BALANCE = 10000;
const CURRENCY = 'APT';

const mem = new ShelMem({
  supabaseUrl: SUPABASE_URL,
  supabaseKey: SUPABASE_KEY,
  mock: true,
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getPrice() {
  return +(8.50 + (Math.random() - 0.5) * 0.8).toFixed(4);
}

function calculateRSI(round) {
  const pattern = [35, 65, 28, 72, 45, 68, 32, 55];
  return +(pattern[round % pattern.length] + (Math.random() - 0.5) * 8).toFixed(1);
}

function log(icon, label, msg) {
  const pad = label.padEnd(8);
  console.log(`  ${icon} ${pad} ${msg}`);
}

async function showWrite(label, result) {
  log('🔒', 'HASH', `SHA-256: ${result.content_hash}`);
  log('📦', 'STORE', `Shelby:  ${result.shelby_object_id}`);
  log('⛓️ ', 'ANCHOR', `Aptos:   ${result.aptos_tx_hash.slice(0, 24)}...`);
  log('📇', 'INDEX', `Supabase: type=${result.memory_type}, ts=${result.timestamp.slice(0, 19)}`);
}

async function run() {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  ShelMem Demo Trading Agent                          ║');
  console.log('║  Every step of the decentralised memory flow shown   ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  Agent:     ${AGENT_ID}`);
  console.log(`  Balance:   ${STARTING_BALANCE} ${CURRENCY}`);
  console.log(`  Strategy:  RSI-based (buy < 40, sell > 60)`);
  console.log(`  Storage:   Shelby Protocol (mock mode)`);
  console.log(`  Metadata:  Supabase (live)`);
  console.log('');

  let balance = STARTING_BALANCE;
  const rounds = 5;

  // ── Initial balance snapshot ──
  console.log('━━━ Initial Balance Snapshot ━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Recording ${balance} ${CURRENCY} via mem.recordBalanceSnapshot()`);
  const initResult = await mem.recordBalanceSnapshot({
    agentId: AGENT_ID,
    memory: `Starting balance: ${balance} ${CURRENCY}`,
    context: 'treasury',
    amount: balance,
    currency: CURRENCY,
  });
  await showWrite('balance', initResult);
  console.log('');

  for (let round = 1; round <= rounds; round++) {
    const price = getPrice();
    const rsi = calculateRSI(round);

    console.log(`━━━ Round ${round}/${rounds} ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`  Market: APT = $${price}  |  RSI = ${rsi}`);
    console.log('');

    // ── RECALL ──
    console.log('  ┌─ RECALL past decisions ─────────────────────────');
    console.log('  │  mem.recall(agent, "trading", 5, "decision")');
    console.log('  │');
    const past = await mem.recall(AGENT_ID, 'trading', 3, 'decision');
    if (past.length === 0) {
      console.log('  │  No past decisions found — first round');
    } else {
      for (const m of past) {
        console.log(`  │  ${m.verified === true ? '✓' : m.verified === false ? '✗' : '○'} ${m.memory.slice(0, 60)}...`);
      }
    }
    console.log('  └─────────────────────────────────────────────────');
    console.log('');

    // ── DECIDE ──
    let action = 'hold';
    let tradeAmount = 0;
    if (rsi < 40 && balance > 100) {
      action = 'buy';
      tradeAmount = Math.min(Math.round(balance * 0.1), 500);
    } else if (rsi > 60) {
      action = 'sell';
      tradeAmount = Math.min(Math.round(balance * 0.08), 400);
    }

    // ── WRITE decision ──
    console.log('  ┌─ WRITE decision ────────────────────────────────');
    console.log(`  │  mem.write(agent, "...", "trading", "decision")`);
    const decisionMemory = `Round ${round}: RSI=${rsi}, price=$${price}. Decision: ${action}${tradeAmount > 0 ? ` ${tradeAmount} ${CURRENCY}` : ''}`;
    console.log(`  │  "${decisionMemory}"`);
    console.log('  │');
    const decResult = await mem.write(AGENT_ID, decisionMemory, 'trading', 'decision');
    log('🔒', 'HASH', `${decResult.content_hash}`);
    log('📦', 'STORE', `${decResult.shelby_object_id}`);
    log('⛓️ ', 'ANCHOR', `${decResult.aptos_tx_hash.slice(0, 32)}...`);
    log('📇', 'INDEX', `memory_type=decision`);
    console.log('  └─────────────────────────────────────────────────');
    console.log('');

    // ── EXECUTE trade ──
    if (action !== 'hold' && tradeAmount > 0) {
      const counterparty = `0x${Buffer.from(`${action === 'buy' ? 'market' : 'exchange'}-${round}`).toString('hex').slice(0, 40)}`;

      if (action === 'buy') balance -= tradeAmount;
      else balance += tradeAmount;

      console.log('  ┌─ RECORD TRANSACTION ──────────────────────────');
      console.log(`  │  mem.recordTransaction({`);
      console.log(`  │    amount: ${tradeAmount}, currency: "${CURRENCY}",`);
      console.log(`  │    counterparty: "${counterparty.slice(0, 16)}...",`);
      console.log(`  │    txStatus: "confirmed"`);
      console.log(`  │  })`);
      console.log('  │');

      const txResult = await mem.recordTransaction({
        agentId: AGENT_ID,
        memory: `${action === 'buy' ? 'Bought' : 'Sold'} ${tradeAmount} ${CURRENCY} at $${price}. RSI=${rsi}.`,
        context: 'payments',
        amount: tradeAmount,
        currency: CURRENCY,
        counterparty,
        txStatus: 'confirmed',
      });

      log('🔒', 'HASH', `${txResult.content_hash}`);
      log('📦', 'STORE', `${txResult.shelby_object_id}`);
      log('⛓️ ', 'ANCHOR', `${txResult.aptos_tx_hash.slice(0, 32)}...`);
      log('📇', 'INDEX', `memory_type=transaction_record, amount=${tradeAmount}, currency=${CURRENCY}`);
      log('💰', 'STATUS', `tx_status=confirmed, counterparty=${counterparty.slice(0, 16)}...`);
      console.log('  └─────────────────────────────────────────────────');
    } else {
      console.log('  ┌─ WRITE observation ───────────────────────────');
      console.log(`  │  Holding — RSI in neutral zone`);
      await mem.write(AGENT_ID, `Round ${round}: Held. RSI=${rsi}, price=$${price}.`, 'market', 'observation');
      console.log('  │  ○ Stored as observation');
      console.log('  └─────────────────────────────────────────────────');
    }
    console.log('');

    // ── BALANCE SNAPSHOT ──
    console.log('  ┌─ BALANCE SNAPSHOT ──────────────────────────────');
    console.log(`  │  mem.recordBalanceSnapshot({ amount: ${balance}, currency: "${CURRENCY}" })`);
    console.log('  │');
    const balResult = await mem.recordBalanceSnapshot({
      agentId: AGENT_ID,
      memory: `Balance after round ${round}: ${balance} ${CURRENCY}`,
      context: 'treasury',
      amount: balance,
      currency: CURRENCY,
    });
    log('🔒', 'HASH', `${balResult.content_hash}`);
    log('📦', 'STORE', `${balResult.shelby_object_id}`);
    log('📇', 'INDEX', `memory_type=balance_snapshot, amount=${balance}`);
    console.log('  └─────────────────────────────────────────────────');
    console.log('');

    if (round < rounds) await sleep(600);
  }

  // ── Final summary ──
  console.log('━━━ Final Summary ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  console.log('  ┌─ GET LATEST BALANCE ─────────────────────────────');
  console.log('  │  mem.getLatestBalance("demo-trading-agent")');
  const latest = await mem.getLatestBalance(AGENT_ID);
  if (latest) {
    console.log(`  │  → ${latest.amount} ${latest.currency} (verified: ${latest.verified})`);
  }
  console.log('  └─────────────────────────────────────────────────');
  console.log('');

  console.log('  ┌─ RECALL ALL TRANSACTIONS ────────────────────────');
  console.log('  │  mem.recall(agent, "payments", 100, "transaction_record")');
  const allTx = await mem.recall(AGENT_ID, 'payments', 100, 'transaction_record');
  for (const tx of allTx) {
    console.log(`  │  ${tx.verified === true ? '✓' : '○'} ${tx.memory.slice(0, 55)}...`);
  }
  console.log(`  │  Total: ${allTx.length} transactions`);
  console.log('  └─────────────────────────────────────────────────');
  console.log('');

  const pnl = balance - STARTING_BALANCE;
  const pnlPct = ((pnl / STARTING_BALANCE) * 100).toFixed(2);

  console.log('  ╔═══════════════════════════════════════════════╗');
  console.log(`  ║  Balance:  ${String(balance).padEnd(8)} ${CURRENCY}                    ║`);
  console.log(`  ║  P&L:      ${(pnl >= 0 ? '+' : '') + pnl} ${CURRENCY} (${pnlPct}%)${' '.repeat(Math.max(0, 17 - pnlPct.length - String(pnl).length))}║`);
  console.log(`  ║  Trades:   ${String(allTx.length).padEnd(35)}║`);
  console.log('  ╚═══════════════════════════════════════════════╝');
  console.log('');
  console.log('  Flow: Content → HASH → SHELBY → APTOS → SUPABASE');
  console.log('');
  console.log('  Dashboard: https://shelmem.forestinfra.com/dashboard');
  console.log('  Treasury:  https://shelmem.forestinfra.com/dashboard/treasury');
  console.log('');
}

run().catch(console.error);
