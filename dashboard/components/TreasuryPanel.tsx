'use client';

import { useMemo } from 'react';
import { Card, Flex, Text, Heading, Badge } from '@radix-ui/themes';
import type { MemoryRow } from '@/lib/supabase';
import { TREASURY_TYPES } from '@/lib/supabase';

const txStatusColor: Record<string, 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  confirmed: 'green',
  failed: 'red',
};

export default function TreasuryPanel({ memories }: { memories: MemoryRow[] }) {
  const treasury = useMemo(() => {
    const rows = memories.filter(m => TREASURY_TYPES.includes(m.memory_type || ''));
    if (rows.length === 0) return null;

    // Latest balance snapshot
    const balances = rows.filter(m => m.memory_type === 'balance_snapshot');
    const latestBalance = balances.length > 0 ? balances[0] : null;

    // Transactions today
    const today = new Date().toISOString().slice(0, 10);
    const txToday = rows.filter(
      m => m.memory_type === 'transaction_record' && m.created_at.startsWith(today)
    );

    // Most recent transaction
    const transactions = rows.filter(m => m.memory_type === 'transaction_record');
    const lastTx = transactions.length > 0 ? transactions[0] : null;

    return { latestBalance, txTodayCount: txToday.length, lastTx };
  }, [memories]);

  if (!treasury) return null;

  return (
    <Flex gap="3" mb="4" wrap="wrap">
      {/* Latest Balance */}
      <Card size="1" variant="surface" style={{ flex: 1, minWidth: 180 }}>
        <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Latest Balance
        </Text>
        {treasury.latestBalance ? (
          <>
            <Heading size="5" weight="bold" style={{ color: 'var(--cyan-9)' }}>
              {treasury.latestBalance.amount} {treasury.latestBalance.currency}
            </Heading>
            <Text size="1" color="gray">
              {new Date(treasury.latestBalance.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </Text>
          </>
        ) : (
          <Text size="2" color="gray">No snapshots</Text>
        )}
      </Card>

      {/* Transactions Today */}
      <Card size="1" variant="surface" style={{ flex: 1, minWidth: 140 }}>
        <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Transactions Today
        </Text>
        <Heading size="5" weight="bold" style={{ color: 'var(--orange-9)' }}>
          {treasury.txTodayCount}
        </Heading>
      </Card>

      {/* Last Transaction */}
      <Card size="1" variant="surface" style={{ flex: 2, minWidth: 240 }}>
        <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
          Last Transaction
        </Text>
        {treasury.lastTx ? (
          <Flex align="center" gap="2" wrap="wrap">
            <Text size="3" weight="bold">
              {treasury.lastTx.amount} {treasury.lastTx.currency}
            </Text>
            {treasury.lastTx.counterparty && (
              <Text size="1" color="gray" style={{ fontFamily: 'var(--font-mono, monospace)' }}>
                → {treasury.lastTx.counterparty.slice(0, 8)}...{treasury.lastTx.counterparty.slice(-4)}
              </Text>
            )}
            {treasury.lastTx.tx_status && (
              <Badge size="1" variant="soft" color={txStatusColor[treasury.lastTx.tx_status] || 'gray'}>
                {treasury.lastTx.tx_status}
              </Badge>
            )}
          </Flex>
        ) : (
          <Text size="2" color="gray">No transactions</Text>
        )}
      </Card>
    </Flex>
  );
}
