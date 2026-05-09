'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Box, Flex, Text, Heading, Card, Badge, Table, Code, Separator } from '@radix-ui/themes';
import { supabase } from '@/lib/supabase';
import type { MemoryRow } from '@/lib/supabase';
import WalletProvider from '@/components/WalletProvider';
import TestnetBanner from '@/components/TestnetBanner';
import WalletConnect from '@/components/WalletConnect';
import CopyButton from '@/components/CopyButton';
import DashboardNav from '@/components/DashboardNav';

interface Pool {
  id: string;
  name: string;
  description: string | null;
  owner_agent_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface PoolMember {
  pool_id: string;
  agent_id: string;
  role: 'owner' | 'writer' | 'reader';
  added_at: string;
}

interface AuditEntry {
  id: string;
  pool_id: string;
  agent_id: string;
  action: 'write' | 'read';
  memory_id: string | null;
  result_count: number | null;
  created_at: string;
}

const roleColor: Record<string, 'iris' | 'lime' | 'gray'> = {
  owner: 'iris',
  writer: 'lime',
  reader: 'gray',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function PoolsPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [pools, setPools] = useState<Pool[]>([]);
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setPools([]); setMembers([]); setMemories([]); setAudit([]);
      setSelectedPool(null);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const [poolsRes, membersRes, memoriesRes, auditRes] = await Promise.all([
          supabase.from('memory_pools').select('*').order('created_at', { ascending: false }),
          supabase.from('pool_members').select('*'),
          supabase.from('memories').select('*').not('pool_id', 'is', null).order('created_at', { ascending: false }),
          supabase.from('pool_access_log').select('*').order('created_at', { ascending: false }).limit(500),
        ]);
        if (poolsRes.error) console.error('pools:', poolsRes.error.message);
        if (membersRes.error) console.error('members:', membersRes.error.message);
        if (memoriesRes.error) console.error('memories:', memoriesRes.error.message);
        if (auditRes.error) console.error('audit:', auditRes.error.message);
        const p = (poolsRes.data ?? []) as Pool[];
        setPools(p);
        setMembers((membersRes.data ?? []) as PoolMember[]);
        setMemories((memoriesRes.data ?? []) as MemoryRow[]);
        setAudit((auditRes.data ?? []) as AuditEntry[]);
        if (p.length > 0 && !selectedPool) setSelectedPool(p[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, [walletAddress, selectedPool]);

  const selected = useMemo(() => pools.find(p => p.id === selectedPool) ?? null, [pools, selectedPool]);
  const selectedMembers = useMemo(
    () => members.filter(m => m.pool_id === selectedPool).sort((a, b) => a.role.localeCompare(b.role)),
    [members, selectedPool],
  );
  const selectedMemories = useMemo(
    () => memories.filter(m => m.pool_id === selectedPool),
    [memories, selectedPool],
  );
  const selectedAudit = useMemo(
    () => audit.filter(a => a.pool_id === selectedPool).slice(0, 50),
    [audit, selectedPool],
  );

  return (
    <WalletProvider>
      <TestnetBanner />

      <Flex
        align="center" justify="between" px="5" py="3"
        style={{
          borderBottom: '1px solid var(--gray-4)', background: 'var(--color-background)',
          backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100,
        }}
      >
        <Box>
          <Link href="/">
            <Text size="4" weight="bold">Shel<span style={{ color: 'var(--accent-9)' }}>Mem</span></Text>
          </Link>
          <Text size="1" color="gray" style={{ display: 'block', marginTop: 2 }}>Shared Pools</Text>
        </Box>
        <Flex align="center" gap="3">
          <DashboardNav />
          <WalletConnect onConnect={setWalletAddress} />
        </Flex>
      </Flex>

      <Box style={{ flex: 1, padding: '24px 32px' }}>
        {!walletAddress ? (
          <Flex align="center" justify="center" style={{ minHeight: 400 }}>
            <Text size="3" color="gray">Connect your wallet to view shared pools</Text>
          </Flex>
        ) : loading ? (
          <Flex align="center" justify="center" style={{ minHeight: 400 }}>
            <Text size="3" color="lime">Loading pools…</Text>
          </Flex>
        ) : pools.length === 0 ? (
          <Card size="3" variant="surface" style={{ maxWidth: 600, margin: '64px auto', textAlign: 'center' }}>
            <Heading size="4" mb="2">No pools yet</Heading>
            <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16 }}>
              Create a shared memory pool with the SDK and it will appear here.
            </Text>
            <Card size="1" variant="surface" style={{ textAlign: 'left' }}>
              <Code size="2" variant="ghost" style={{ display: 'block', whiteSpace: 'pre', lineHeight: 1.8 }}>
{`const pool = await mem.createPool({
  name: 'market-ops',
  ownerAgentId: 'trading-agent',
});
await mem.addPoolMember(pool.id, 'trading-agent', 'execution-agent', 'writer');`}
              </Code>
            </Card>
            <Box mt="3"><a href="/docs#pools" style={{ color: 'var(--accent-9)', fontSize: 14 }}>Read pool docs →</a></Box>
          </Card>
        ) : (
          <Flex gap="4" align="start">
            {/* Pool list */}
            <Box style={{ width: 280, flexShrink: 0 }}>
              <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                Pools ({pools.length})
              </Text>
              <Flex direction="column" gap="2">
                {pools.map(p => {
                  const memberCount = members.filter(m => m.pool_id === p.id).length;
                  const memoryCount = memories.filter(m => m.pool_id === p.id).length;
                  const isSel = p.id === selectedPool;
                  return (
                    <Card
                      key={p.id} size="2"
                      variant={isSel ? 'classic' : 'surface'}
                      style={{ cursor: 'pointer', borderColor: isSel ? 'var(--accent-9)' : undefined }}
                      onClick={() => setSelectedPool(p.id)}
                    >
                      <Heading size="3" mb="1">{p.name}</Heading>
                      <Flex gap="2" align="center" mb="1">
                        <Badge size="1" variant="soft" color="iris">{memberCount} member{memberCount === 1 ? '' : 's'}</Badge>
                        <Badge size="1" variant="soft" color="lime">{memoryCount} memor{memoryCount === 1 ? 'y' : 'ies'}</Badge>
                      </Flex>
                      <Text size="1" color="gray">owner: <Code size="1" variant="ghost">{p.owner_agent_id}</Code></Text>
                    </Card>
                  );
                })}
              </Flex>
            </Box>

            {/* Detail panel */}
            <Box style={{ flex: 1, minWidth: 0 }}>
              {selected && (
                <>
                  <Flex align="center" justify="between" mb="3">
                    <Box>
                      <Heading size="6">{selected.name}</Heading>
                      {selected.description && (
                        <Text size="2" color="gray" style={{ display: 'block', marginTop: 4 }}>{selected.description}</Text>
                      )}
                    </Box>
                    <Flex direction="column" align="end">
                      <Text size="1" color="gray">Created {formatDate(selected.created_at)}</Text>
                      <Flex align="center" gap="1" mt="1">
                        <Code size="1" variant="ghost">{selected.id}</Code>
                        <CopyButton text={selected.id} />
                      </Flex>
                    </Flex>
                  </Flex>

                  <Separator size="4" mb="4" />

                  {/* Members */}
                  <Heading size="4" mb="2">Members</Heading>
                  <Card size="1" variant="surface" mb="4">
                    <Table.Root size="1" variant="ghost">
                      <Table.Header>
                        <Table.Row>
                          <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                          <Table.ColumnHeaderCell>Added</Table.ColumnHeaderCell>
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {selectedMembers.map(m => (
                          <Table.Row key={m.agent_id}>
                            <Table.Cell><Code size="2" variant="ghost" color="lime">{m.agent_id}</Code></Table.Cell>
                            <Table.Cell><Badge size="1" variant="soft" color={roleColor[m.role]}>{m.role}</Badge></Table.Cell>
                            <Table.Cell><Text size="1" color="gray">{formatDate(m.added_at)}</Text></Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </Card>

                  {/* Memories */}
                  <Heading size="4" mb="2">Memories ({selectedMemories.length})</Heading>
                  {selectedMemories.length === 0 ? (
                    <Text size="2" color="gray">No memories in this pool yet.</Text>
                  ) : (
                    <Card size="1" variant="surface" mb="4">
                      <Table.Root size="1" variant="ghost">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell>Author</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Memory</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {selectedMemories.map(m => (
                            <Table.Row key={m.id}>
                              <Table.Cell><Code size="2" variant="ghost" color="lime">{m.agent_id}</Code></Table.Cell>
                              <Table.Cell><Badge size="1" variant="soft">{m.memory_type ?? 'observation'}</Badge></Table.Cell>
                              <Table.Cell style={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                <Text size="2" color="gray">{m.memory_preview ?? '—'}</Text>
                              </Table.Cell>
                              <Table.Cell><Text size="1" color="gray">{formatDate(m.created_at)}</Text></Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </Card>
                  )}

                  {/* Audit log */}
                  <Heading size="4" mb="2">Recent activity</Heading>
                  {selectedAudit.length === 0 ? (
                    <Text size="2" color="gray">No activity recorded yet.</Text>
                  ) : (
                    <Card size="1" variant="surface">
                      <Table.Root size="1" variant="ghost">
                        <Table.Header>
                          <Table.Row>
                            <Table.ColumnHeaderCell>Action</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>Result</Table.ColumnHeaderCell>
                            <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {selectedAudit.map(a => (
                            <Table.Row key={a.id}>
                              <Table.Cell><Badge size="1" variant="soft" color={a.action === 'write' ? 'lime' : 'cyan'}>{a.action}</Badge></Table.Cell>
                              <Table.Cell><Code size="2" variant="ghost" color="lime">{a.agent_id}</Code></Table.Cell>
                              <Table.Cell>
                                <Text size="1" color="gray">
                                  {a.action === 'read' ? `${a.result_count ?? 0} memor${a.result_count === 1 ? 'y' : 'ies'}` : (a.memory_id ? 'memory written' : '—')}
                                </Text>
                              </Table.Cell>
                              <Table.Cell><Text size="1" color="gray">{formatDate(a.created_at)}</Text></Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </Card>
                  )}
                </>
              )}
            </Box>
          </Flex>
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
