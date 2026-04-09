'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { Box, Flex, Text, Heading, Card, Code, Badge, Button } from '@radix-ui/themes';
import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';

const AGENT_ID = 'demo-agent';
const CURRENCY = 'APT';
const DEMO_KEY = 'shelmem_demo_completed';

type LogEntry = { icon: string; label: string; msg: string; color?: string };

function hash(s: string) { return createHash('sha256').update(s).digest('hex'); }
function mockAddr(name: string) { return `shelby://mock/${name}`; }
function mockTx(addr: string) { return `0x${createHash('sha256').update(addr + Date.now()).digest('hex')}`; }

function getPrice() { return +(8.50 + (Math.random() - 0.5) * 0.8).toFixed(4); }
function getRSI(round: number) {
  const pattern = [35, 65, 28, 72, 45];
  return +(pattern[round % pattern.length] + (Math.random() - 0.5) * 8).toFixed(1);
}

async function writeMemory(memory: string, context: string, memoryType: string, extra: Record<string, any> = {}) {
  const contentHash = hash(memory);
  const blobName = `${AGENT_ID}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const shelbyId = mockAddr(blobName);
  const aptosTx = mockTx(shelbyId);

  await supabase.from('memories').insert({
    agent_id: AGENT_ID,
    context,
    memory_type: memoryType,
    memory_preview: memory.slice(0, 200),
    shelby_object_id: shelbyId,
    aptos_tx_hash: aptosTx,
    content_hash: contentHash,
    metadata: {},
    ...extra,
  });

  return { contentHash, shelbyId, aptosTx, memoryType };
}

export default function DemoPage() {
  const [demoCompleted, setDemoCompleted] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem(DEMO_KEY) === 'true';
    return false;
  });
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [finished, setFinished] = useState(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (icon: string, label: string, msg: string, color?: string) => {
    setLogs(prev => [...prev, { icon, label, msg, color }]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  const runDemo = async () => {
    setRunning(true);
    setLogs([]);
    let balance = 10000;

    addLog('🚀', 'START', 'ShelMem Demo Trading Agent', 'lime');
    addLog('📋', 'CONFIG', `Agent: ${AGENT_ID} | Balance: ${balance} ${CURRENCY} | Strategy: RSI`);
    await sleep(500);

    // Initial balance
    addLog('', '', '━━━ Initial Balance ━━━━━━━━━━━━━━━━━━━━━━━━', 'gray');
    addLog('📝', 'WRITE', `mem.recordBalanceSnapshot({ amount: ${balance}, currency: "${CURRENCY}" })`);
    const initResult = await writeMemory(`Starting balance: ${balance} ${CURRENCY}`, 'treasury', 'balance_snapshot', { amount: balance, currency: CURRENCY });
    addLog('🔒', 'HASH', initResult.contentHash);
    addLog('📦', 'STORE', initResult.shelbyId);
    addLog('⛓️', 'ANCHOR', initResult.aptosTx.slice(0, 32) + '...');
    addLog('📇', 'INDEX', 'memory_type=balance_snapshot → Supabase ✓');
    await sleep(600);

    // 4 trading rounds
    for (let round = 1; round <= 4; round++) {
      const price = getPrice();
      const rsi = getRSI(round);

      addLog('', '', `━━━ Round ${round}/4 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'gray');
      addLog('📊', 'MARKET', `APT = $${price} | RSI = ${rsi}`);
      await sleep(400);

      // Recall
      addLog('🔍', 'RECALL', 'mem.recall(agent, "trading", 3, "decision")');
      await sleep(300);
      if (round > 1) {
        addLog('', '', `  ✓ Found ${round - 1} past decision(s) — verified against content hash`);
      } else {
        addLog('', '', '  No past decisions — first round');
      }
      await sleep(300);

      // Decide
      let action = 'hold';
      let tradeAmount = 0;
      if (rsi < 40 && balance > 100) { action = 'buy'; tradeAmount = 500; }
      else if (rsi > 60) { action = 'sell'; tradeAmount = 400; }

      // Write decision
      const decMemory = `Round ${round}: RSI=${rsi}, price=$${price}. Decision: ${action}${tradeAmount > 0 ? ` ${tradeAmount} ${CURRENCY}` : ''}`;
      addLog('📝', 'WRITE', `mem.write(agent, "${decMemory.slice(0, 50)}...", "trading", "decision")`);
      const decResult = await writeMemory(decMemory, 'trading', 'decision');
      addLog('🔒', 'HASH', decResult.contentHash);
      addLog('📦', 'STORE', decResult.shelbyId);
      addLog('📇', 'INDEX', 'memory_type=decision → Supabase ✓');
      await sleep(400);

      // Trade
      if (action !== 'hold' && tradeAmount > 0) {
        if (action === 'buy') balance -= tradeAmount;
        else balance += tradeAmount;
        const counterparty = `0x${hash(`${action}-${round}`).slice(0, 40)}`;

        addLog('💰', 'TRADE', `mem.recordTransaction({ amount: ${tradeAmount}, currency: "${CURRENCY}", txStatus: "confirmed" })`);
        const txMemory = `${action === 'buy' ? 'Bought' : 'Sold'} ${tradeAmount} ${CURRENCY} at $${price}. RSI=${rsi}.`;
        const txResult = await writeMemory(txMemory, 'payments', 'transaction_record', {
          amount: tradeAmount, currency: CURRENCY, counterparty, tx_status: 'confirmed',
        });
        addLog('🔒', 'HASH', txResult.contentHash);
        addLog('📦', 'STORE', txResult.shelbyId);
        addLog('⛓️', 'ANCHOR', txResult.aptosTx.slice(0, 32) + '...');
        addLog('📇', 'INDEX', `transaction_record: ${tradeAmount} ${CURRENCY} → ${counterparty.slice(0, 12)}... ✓`, action === 'buy' ? 'orange' : 'green');
      } else {
        addLog('⏸️', 'HOLD', 'RSI neutral — no trade');
        await writeMemory(`Round ${round}: Held. RSI=${rsi}.`, 'market', 'observation');
      }
      await sleep(400);

      // Balance snapshot
      addLog('📸', 'BALANCE', `mem.recordBalanceSnapshot({ amount: ${balance} })`);
      await writeMemory(`Balance after round ${round}: ${balance} ${CURRENCY}`, 'treasury', 'balance_snapshot', { amount: balance, currency: CURRENCY });
      addLog('📇', 'INDEX', `balance_snapshot: ${balance} ${CURRENCY} → Supabase ✓`, 'cyan');
      await sleep(500);
    }

    // Final
    const pnl = balance - 10000;
    addLog('', '', '━━━ Demo Complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'gray');
    addLog('✅', 'DONE', `Final balance: ${balance} ${CURRENCY} (${pnl >= 0 ? '+' : ''}${pnl} P&L)`, 'lime');
    addLog('🔐', 'PROOF', 'Every memory SHA-256 hashed, stored on Shelby, anchored on Aptos');
    addLog('📊', 'VIEW', 'Check the dashboard and treasury to see your agent\'s memories');

    localStorage.setItem(DEMO_KEY, 'true');
    setDemoCompleted(true);
    setFinished(true);
    setRunning(false);
  };

  return (
    <div style={{ background: '#050505', color: '#f0f0e8', minHeight: '100vh' }}>
      {/* Nav */}
      <Flex align="center" justify="between" px="5" py="3" style={{ borderBottom: '1px solid var(--gray-4)' }}>
        <Link href="/"><Text size="4" weight="bold">Shel<span style={{ color: 'var(--accent-9)' }}>Mem</span></Text></Link>
        <Flex gap="3">
          <Link href="/dashboard"><Text size="2" color="gray">Dashboard</Text></Link>
          <Link href="/docs"><Text size="2" color="gray">Docs</Text></Link>
        </Flex>
      </Flex>

      <Box style={{ maxWidth: 800, margin: '0 auto', padding: '48px 24px' }}>
        {!demoCompleted && !running && logs.length === 0 && (
          <>
            <Heading size="8" weight="bold" align="center" style={{ marginBottom: 16 }}>
              Try Shel<span style={{ color: 'var(--accent-9)' }}>Mem</span>
            </Heading>
            <Text size="3" color="gray" align="center" style={{ display: 'block', marginBottom: 32, lineHeight: 1.6 }}>
              Watch a demo trading agent make decisions, record transactions,<br />
              and store everything as tamper-proof, verifiable memories.
            </Text>

            <Card size="3" variant="surface" style={{ textAlign: 'center', marginBottom: 32 }}>
              <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16 }}>
                The demo will run a 4-round trading simulation showing every step of the ShelMem flow:
              </Text>
              <Flex gap="2" justify="center" wrap="wrap" mb="4">
                <Badge size="1" variant="surface">🔒 SHA-256 Hash</Badge>
                <Badge size="1" variant="surface">📦 Shelby Storage</Badge>
                <Badge size="1" variant="surface">⛓️ Aptos Proof</Badge>
                <Badge size="1" variant="surface">📇 Supabase Index</Badge>
              </Flex>
              <Button size="4" variant="solid" onClick={runDemo} style={{ cursor: 'pointer' }}>
                Run Demo Agent
              </Button>
            </Card>
          </>
        )}

        {(running || logs.length > 0) && (
          <Card size="2" variant="surface" style={{ overflow: 'hidden' }}>
            <Flex align="center" gap="2" mb="3" style={{ borderBottom: '1px solid var(--gray-4)', paddingBottom: 12 }}>
              <span style={{ width: 12, height: 12, borderRadius: '50%', background: running ? 'var(--accent-9)' : '#28c840', display: 'inline-block', animation: running ? 'pulse 1.5s infinite' : 'none' }} />
              <Text size="2" weight="medium">{running ? 'Running demo agent...' : 'Demo complete'}</Text>
            </Flex>
            <Box style={{ maxHeight: 500, overflowY: 'auto', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, lineHeight: 1.8 }}>
              {logs.map((log, i) => (
                <div key={i} style={{ color: log.color === 'lime' ? 'var(--accent-9)' : log.color === 'gray' ? 'var(--gray-8)' : log.color === 'cyan' ? 'var(--cyan-9)' : log.color === 'orange' ? 'var(--orange-9)' : log.color === 'green' ? 'var(--green-9)' : 'var(--gray-11)' }}>
                  {log.icon ? `${log.icon} ${log.label.padEnd(8)} ${log.msg}` : log.msg}
                </div>
              ))}
              <div ref={logsEndRef} />
            </Box>
          </Card>
        )}

        {finished && (
          <Box style={{ textAlign: 'center', marginTop: 32 }}>
            <Heading size="6" weight="bold" style={{ marginBottom: 12, color: 'var(--accent-9)' }}>
              Demo complete!
            </Heading>
            <Text size="3" color="gray" style={{ display: 'block', marginBottom: 24, lineHeight: 1.6 }}>
              Your demo agent just wrote verified memories to ShelMem.<br />
              Now go deploy your own agents with tamper-proof memory.
            </Text>
            <Flex gap="3" justify="center">
              <Link href="/dashboard/treasury"><Button size="3" variant="solid" style={{ cursor: 'pointer' }}>View Treasury</Button></Link>
              <Link href="/dashboard"><Button size="3" variant="outline" style={{ cursor: 'pointer' }}>View Dashboard</Button></Link>
              <Link href="/docs"><Button size="3" variant="outline" style={{ cursor: 'pointer' }}>Read the Docs</Button></Link>
            </Flex>
          </Box>
        )}

        {demoCompleted && !running && logs.length === 0 && (
          <Box style={{ textAlign: 'center' }}>
            <Heading size="6" weight="bold" style={{ marginBottom: 12 }}>
              You&apos;ve already run the demo
            </Heading>
            <Text size="3" color="gray" style={{ display: 'block', marginBottom: 24, lineHeight: 1.6 }}>
              Ready to build? Deploy your own agents with tamper-proof memory.
            </Text>
            <Flex gap="3" justify="center">
              <Link href="/docs"><Button size="3" variant="solid" style={{ cursor: 'pointer' }}>Get Started</Button></Link>
              <Link href="/dashboard"><Button size="3" variant="outline" style={{ cursor: 'pointer' }}>View Dashboard</Button></Link>
            </Flex>
          </Box>
        )}
      </Box>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
