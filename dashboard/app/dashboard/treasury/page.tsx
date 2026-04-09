'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Box, Flex, Text, Heading, Card, Badge, Table, Code } from '@radix-ui/themes';
import { supabase } from '@/lib/supabase';
import type { MemoryRow } from '@/lib/supabase';
import { TREASURY_TYPES } from '@/lib/supabase';
import WalletProvider from '@/components/WalletProvider';
import TestnetBanner from '@/components/TestnetBanner';
import WalletConnect from '@/components/WalletConnect';
import CopyButton from '@/components/CopyButton';

const txStatusColor: Record<string, 'amber' | 'green' | 'red'> = {
  pending: 'amber',
  confirmed: 'green',
  failed: 'red',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function TreasuryPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) { setMemories([]); return; }

    const fetchMemories = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) { console.error('Failed to fetch:', error.message); return; }
        setMemories((data ?? []).filter(m => TREASURY_TYPES.includes(m.memory_type || '')));
      } finally { setLoading(false); }
    };

    fetchMemories();
  }, [walletAddress]);

  const stats = useMemo(() => {
    const transactions = memories.filter(m => m.memory_type === 'transaction_record');
    const balances = memories.filter(m => m.memory_type === 'balance_snapshot');
    const policies = memories.filter(m => m.memory_type === 'spending_policy');

    const totalVolume = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const confirmed = transactions.filter(t => t.tx_status === 'confirmed').length;
    const pending = transactions.filter(t => t.tx_status === 'pending').length;
    const failed = transactions.filter(t => t.tx_status === 'failed').length;
    const latestBalance = balances.length > 0 ? balances[0] : null;

    return { transactions, balances, policies, totalVolume, confirmed, pending, failed, latestBalance };
  }, [memories]);

  return (
    <WalletProvider>
      <TestnetBanner />

      <Flex
        align="center" justify="between" px="5" py="3"
        style={{ borderBottom: '1px solid var(--gray-4)', background: 'var(--color-background)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}
      >
        <Box>
          <Link href="/"><Text size="4" weight="bold">Shel<span style={{ color: 'var(--accent-9)' }}>Mem</span></Text></Link>
          <Text size="1" color="gray" style={{ display: 'block', marginTop: 2 }}>Agent Treasury</Text>
        </Box>
        <Flex align="center" gap="3">
          <Link href="/dashboard"><Text size="2" color="gray" style={{ cursor: 'pointer' }}>← All Memories</Text></Link>
          <WalletConnect onConnect={setWalletAddress} />
        </Flex>
      </Flex>

      <Box style={{ flex: 1, padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {!walletAddress ? (
          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <Text size="3" color="gray">Connect your wallet to view agent treasury</Text>
          </Box>
        ) : loading ? (
          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <Text size="3" color="lime">Loading treasury...</Text>
          </Box>
        ) : memories.length === 0 ? (
          <Box style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <Card size="3" variant="surface" style={{ maxWidth: 500, textAlign: 'center' }}>
              <Heading size="4" mb="2">No treasury records</Heading>
              <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16 }}>
                Use <Code size="2" variant="ghost">recordTransaction()</Code> or <Code size="2" variant="ghost">recordBalanceSnapshot()</Code> to create treasury entries.
              </Text>
              <Link href="/docs#treasury" style={{ color: 'var(--accent-9)', fontSize: 14 }}>Read the treasury docs →</Link>
            </Card>
          </Box>
        ) : (
          <>
            {/* Balance + Stats */}
            <Flex gap="3" mb="5" wrap="wrap">
              <Card size="2" variant="surface" style={{ flex: 2, minWidth: 240 }}>
                <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Current Balance</Text>
                {stats.latestBalance ? (
                  <>
                    <Heading size="8" weight="bold" style={{ color: 'var(--accent-9)', marginBottom: 4 }}>
                      {stats.latestBalance.amount?.toLocaleString()} <span style={{ fontSize: '0.5em', opacity: 0.7 }}>{stats.latestBalance.currency}</span>
                    </Heading>
                    <Text size="1" color="gray">Last updated {formatDate(stats.latestBalance.created_at)}</Text>
                  </>
                ) : (
                  <Text size="3" color="gray">No balance snapshots</Text>
                )}
              </Card>

              <Card size="2" variant="surface" style={{ flex: 1, minWidth: 140 }}>
                <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Transactions</Text>
                <Heading size="6" weight="bold">{stats.transactions.length}</Heading>
                <Flex gap="2" mt="2" wrap="wrap">
                  <Badge size="1" variant="soft" color="green">{stats.confirmed} confirmed</Badge>
                  <Badge size="1" variant="soft" color="amber">{stats.pending} pending</Badge>
                  {stats.failed > 0 && <Badge size="1" variant="soft" color="red">{stats.failed} failed</Badge>}
                </Flex>
              </Card>

              <Card size="2" variant="surface" style={{ flex: 1, minWidth: 140 }}>
                <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Total Volume</Text>
                <Heading size="6" weight="bold" style={{ color: 'var(--orange-9)' }}>
                  {stats.totalVolume.toLocaleString()}
                </Heading>
                <Text size="1" color="gray">across all currencies</Text>
              </Card>

              <Card size="2" variant="surface" style={{ flex: 1, minWidth: 140 }}>
                <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Snapshots</Text>
                <Heading size="6" weight="bold" style={{ color: 'var(--cyan-9)' }}>{stats.balances.length}</Heading>
                <Text size="1" color="gray">{stats.policies.length} spending {stats.policies.length === 1 ? 'policy' : 'policies'}</Text>
              </Card>
            </Flex>

            {/* Transaction History */}
            {stats.transactions.length > 0 && (
              <>
                <Heading size="4" weight="bold" mb="3">Transaction History</Heading>
                <Table.Root size="2" variant="surface" style={{ marginBottom: 32 }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Amount</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Counterparty</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Timestamp</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Proof</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {stats.transactions.map(tx => (
                      <Table.Row key={tx.id}>
                        <Table.Cell><Code size="2" variant="ghost" color="lime">{tx.agent_id}</Code></Table.Cell>
                        <Table.Cell>
                          <Text size="2" weight="bold">{tx.amount} {tx.currency}</Text>
                        </Table.Cell>
                        <Table.Cell>
                          {tx.counterparty ? (
                            <Flex align="center" gap="1">
                              <Code size="1" variant="ghost">{tx.counterparty.slice(0, 10)}...{tx.counterparty.slice(-4)}</Code>
                              <CopyButton text={tx.counterparty} />
                            </Flex>
                          ) : <Text size="1" color="gray">—</Text>}
                        </Table.Cell>
                        <Table.Cell>
                          <Badge size="1" variant="soft" color={txStatusColor[tx.tx_status || ''] || 'gray'}>
                            {tx.tx_status || '—'}
                          </Badge>
                        </Table.Cell>
                        <Table.Cell><Code size="1" variant="ghost" color="gray">{formatDate(tx.created_at)}</Code></Table.Cell>
                        <Table.Cell>
                          <Flex align="center" gap="1">
                            <Code size="1" variant="ghost" color="gray">{tx.content_hash?.slice(0, 8)}...</Code>
                            {tx.content_hash && <CopyButton text={tx.content_hash} />}
                          </Flex>
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </>
            )}

            {/* Balance History */}
            {stats.balances.length > 0 && (
              <>
                <Heading size="4" weight="bold" mb="3">Balance History</Heading>
                <Table.Root size="2" variant="surface" style={{ marginBottom: 32 }}>
                  <Table.Header>
                    <Table.Row>
                      <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Balance</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Timestamp</Table.ColumnHeaderCell>
                      <Table.ColumnHeaderCell>Verified</Table.ColumnHeaderCell>
                    </Table.Row>
                  </Table.Header>
                  <Table.Body>
                    {stats.balances.map(b => (
                      <Table.Row key={b.id}>
                        <Table.Cell><Code size="2" variant="ghost" color="lime">{b.agent_id}</Code></Table.Cell>
                        <Table.Cell><Text size="2" weight="bold" style={{ color: 'var(--cyan-9)' }}>{b.amount} {b.currency}</Text></Table.Cell>
                        <Table.Cell><Text size="2" color="gray">{b.memory_preview}</Text></Table.Cell>
                        <Table.Cell><Code size="1" variant="ghost" color="gray">{formatDate(b.created_at)}</Code></Table.Cell>
                        <Table.Cell>
                          {b.verified === true && <Badge size="1" variant="soft" color="green">Verified</Badge>}
                          {b.verified === false && <Badge size="1" variant="soft" color="red">Tampered</Badge>}
                          {b.verified === null && <Badge size="1" variant="surface" color="gray">—</Badge>}
                        </Table.Cell>
                      </Table.Row>
                    ))}
                  </Table.Body>
                </Table.Root>
              </>
            )}

            {/* Spending Policies */}
            {stats.policies.length > 0 && (
              <>
                <Heading size="4" weight="bold" mb="3">Spending Policies</Heading>
                <Flex gap="3" wrap="wrap">
                  {stats.policies.map(p => (
                    <Card key={p.id} size="2" variant="surface" style={{ flex: 1, minWidth: 280 }}>
                      <Flex align="center" gap="2" mb="2">
                        <Badge size="1" variant="soft" color="pink">spending_policy</Badge>
                        <Code size="1" variant="ghost" color="lime">{p.agent_id}</Code>
                      </Flex>
                      <Text size="2" style={{ display: 'block', marginBottom: 8 }}>{p.memory_preview}</Text>
                      {p.amount && <Text size="2" weight="bold">{p.amount} {p.currency}</Text>}
                      <Text size="1" color="gray" style={{ display: 'block', marginTop: 4 }}>{formatDate(p.created_at)}</Text>
                    </Card>
                  ))}
                </Flex>
              </>
            )}
          </>
        )}
      </Box>

      <Box style={{ padding: '24px 32px', textAlign: 'center', borderTop: '1px solid var(--gray-4)' }}>
        <Text size="1" color="gray">
          Powered by{' '}
          <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-9)' }}>Forest</a>
        </Text>
      </Box>
    </WalletProvider>
  );
}
