'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Box, Flex, Text, Heading, Card, Badge, Table, Code, Separator,
  Button, TextField, Select, Dialog,
} from '@radix-ui/themes';
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

type PoolRole = 'owner' | 'writer' | 'reader';

interface PoolMember {
  pool_id: string;
  agent_id: string;
  role: PoolRole;
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

const VIEWER_KEY = 'shelmem-viewer-agent';

export default function PoolsPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [viewerAgentId, setViewerAgentId] = useState<string>('');
  const [pools, setPools] = useState<Pool[]>([]);
  const [members, setMembers] = useState<PoolMember[]>([]);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [refresh, setRefresh] = useState(0);

  // Create-pool dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  // Add-member inline state
  const [addAgentId, setAddAgentId] = useState('');
  const [addRole, setAddRole] = useState<PoolRole>('writer');

  // Initial load: viewer agent_id from localStorage
  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(VIEWER_KEY) : null;
    if (stored) setViewerAgentId(stored);
  }, []);

  useEffect(() => {
    if (viewerAgentId && typeof window !== 'undefined') {
      window.localStorage.setItem(VIEWER_KEY, viewerAgentId);
    }
  }, [viewerAgentId]);

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
        if (p.length > 0 && (!selectedPool || !p.find(x => x.id === selectedPool))) {
          setSelectedPool(p[0].id);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [walletAddress, refresh]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const viewerIsOwner = !!(selected && viewerAgentId && selected.owner_agent_id === viewerAgentId);

  // ─── mutations ───────────────────────────────────────────────────────

  const reload = () => setRefresh(r => r + 1);

  async function createPool() {
    if (!newName.trim() || !viewerAgentId.trim()) return;
    const { error } = await supabase.from('memory_pools').insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      owner_agent_id: viewerAgentId,
    });
    if (error) { alert(`Create pool failed: ${error.message}`); return; }
    setCreateOpen(false); setNewName(''); setNewDesc('');
    reload();
  }

  async function addMember() {
    if (!selected || !addAgentId.trim() || !viewerIsOwner) return;
    const { error } = await supabase.from('pool_members').upsert(
      { pool_id: selected.id, agent_id: addAgentId.trim(), role: addRole },
      { onConflict: 'pool_id,agent_id' },
    );
    if (error) { alert(`Add member failed: ${error.message}`); return; }
    setAddAgentId(''); reload();
  }

  async function removeMember(agentId: string) {
    if (!selected || !viewerIsOwner) return;
    if (agentId === selected.owner_agent_id) {
      alert('Cannot remove the pool owner. Transfer ownership first.');
      return;
    }
    if (!confirm(`Remove ${agentId} from this pool?`)) return;
    const { error } = await supabase.from('pool_members')
      .delete().eq('pool_id', selected.id).eq('agent_id', agentId);
    if (error) { alert(`Remove member failed: ${error.message}`); return; }
    reload();
  }

  async function transferOwnership(newOwner: string) {
    if (!selected || !viewerIsOwner) return;
    if (newOwner === viewerAgentId) return;
    if (!confirm(`Transfer ownership of "${selected.name}" to ${newOwner}? You will be demoted to writer.`)) return;
    // Mirrors SDK transferPool: promote target, demote caller, update pool.owner_agent_id.
    const a = await supabase.from('pool_members').upsert(
      { pool_id: selected.id, agent_id: newOwner, role: 'owner' },
      { onConflict: 'pool_id,agent_id' });
    if (a.error) { alert(`Transfer failed (promote): ${a.error.message}`); return; }
    const b = await supabase.from('pool_members').upsert(
      { pool_id: selected.id, agent_id: viewerAgentId, role: 'writer' },
      { onConflict: 'pool_id,agent_id' });
    if (b.error) { alert(`Transfer failed (demote): ${b.error.message}`); return; }
    const c = await supabase.from('memory_pools')
      .update({ owner_agent_id: newOwner }).eq('id', selected.id);
    if (c.error) { alert(`Transfer failed (pool update): ${c.error.message}`); return; }
    reload();
  }

  async function deletePool() {
    if (!selected || !viewerIsOwner) return;
    if (!confirm(`Delete pool "${selected.name}"? Members are removed; memories keep their content but lose their pool_id.`)) return;
    const { error } = await supabase.from('memory_pools').delete().eq('id', selected.id);
    if (error) { alert(`Delete pool failed: ${error.message}`); return; }
    setSelectedPool(null);
    reload();
  }

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
        ) : loading && pools.length === 0 ? (
          <Flex align="center" justify="center" style={{ minHeight: 400 }}>
            <Text size="3" color="lime">Loading pools…</Text>
          </Flex>
        ) : (
          <>
            {/* viewer + create-pool */}
            <Flex align="center" justify="between" mb="4" gap="3" wrap="wrap">
              <Flex align="center" gap="2">
                <Text size="1" color="gray" style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>Viewing as</Text>
                <TextField.Root
                  size="2" placeholder="agent_id (e.g. trading-agent)"
                  value={viewerAgentId} onChange={e => setViewerAgentId(e.target.value)}
                  style={{ minWidth: 240 }}
                />
              </Flex>
              <Dialog.Root open={createOpen} onOpenChange={setCreateOpen}>
                <Dialog.Trigger>
                  <Button size="2" disabled={!viewerAgentId.trim()}>+ Create Pool</Button>
                </Dialog.Trigger>
                <Dialog.Content maxWidth="480px">
                  <Dialog.Title>Create a new pool</Dialog.Title>
                  <Dialog.Description size="2" color="gray" mb="3">
                    You will be added as the owner. Invite collaborators after creating.
                  </Dialog.Description>
                  <Flex direction="column" gap="3">
                    <Box>
                      <Text size="1" color="gray" weight="medium" style={{ display: 'block', marginBottom: 4 }}>Name</Text>
                      <TextField.Root size="2" placeholder="market-ops"
                        value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                    </Box>
                    <Box>
                      <Text size="1" color="gray" weight="medium" style={{ display: 'block', marginBottom: 4 }}>Description (optional)</Text>
                      <TextField.Root size="2" placeholder="Shared workspace for…"
                        value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                    </Box>
                    <Box>
                      <Text size="1" color="gray">Owner: <Code size="1" variant="ghost">{viewerAgentId}</Code></Text>
                    </Box>
                  </Flex>
                  <Flex gap="2" mt="4" justify="end">
                    <Dialog.Close><Button variant="soft" color="gray">Cancel</Button></Dialog.Close>
                    <Button onClick={createPool} disabled={!newName.trim()}>Create</Button>
                  </Flex>
                </Dialog.Content>
              </Dialog.Root>
            </Flex>

            {pools.length === 0 ? (
              <Card size="3" variant="surface" style={{ maxWidth: 600, margin: '64px auto', textAlign: 'center' }}>
                <Heading size="4" mb="2">No pools yet</Heading>
                <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16 }}>
                  Set your viewer agent_id and click <strong>Create Pool</strong>, or use the SDK to create one.
                </Text>
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
                      <Flex align="center" justify="between" mb="3" gap="2">
                        <Box>
                          <Heading size="6">{selected.name}</Heading>
                          {selected.description && (
                            <Text size="2" color="gray" style={{ display: 'block', marginTop: 4 }}>{selected.description}</Text>
                          )}
                        </Box>
                        <Flex direction="column" align="end" gap="2">
                          <Flex align="center" gap="1">
                            <Code size="1" variant="ghost">{selected.id}</Code>
                            <CopyButton text={selected.id} />
                          </Flex>
                          {viewerIsOwner && (
                            <Button size="1" variant="soft" color="red" onClick={deletePool}>Delete pool</Button>
                          )}
                        </Flex>
                      </Flex>

                      <Separator size="4" mb="4" />

                      {/* Members */}
                      <Flex align="center" justify="between" mb="2">
                        <Heading size="4">Members</Heading>
                        {!viewerIsOwner && viewerAgentId && selected.owner_agent_id !== viewerAgentId && (
                          <Text size="1" color="gray">Read-only — only the owner ({selected.owner_agent_id}) can edit members.</Text>
                        )}
                      </Flex>

                      {viewerIsOwner && (
                        <Card size="1" variant="surface" mb="3">
                          <Flex gap="2" align="center" wrap="wrap">
                            <TextField.Root size="2" placeholder="agent_id to invite"
                              value={addAgentId} onChange={e => setAddAgentId(e.target.value)}
                              style={{ flex: 1, minWidth: 200 }} />
                            <Select.Root value={addRole} onValueChange={(v) => setAddRole(v as PoolRole)}>
                              <Select.Trigger />
                              <Select.Content>
                                <Select.Item value="writer">Writer</Select.Item>
                                <Select.Item value="reader">Reader</Select.Item>
                              </Select.Content>
                            </Select.Root>
                            <Button size="2" onClick={addMember} disabled={!addAgentId.trim()}>Add</Button>
                          </Flex>
                        </Card>
                      )}

                      <Card size="1" variant="surface" mb="4">
                        <Table.Root size="1" variant="ghost">
                          <Table.Header>
                            <Table.Row>
                              <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
                              <Table.ColumnHeaderCell>Role</Table.ColumnHeaderCell>
                              <Table.ColumnHeaderCell>Added</Table.ColumnHeaderCell>
                              {viewerIsOwner && <Table.ColumnHeaderCell></Table.ColumnHeaderCell>}
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {selectedMembers.map(m => (
                              <Table.Row key={m.agent_id}>
                                <Table.Cell><Code size="2" variant="ghost" color="lime">{m.agent_id}</Code></Table.Cell>
                                <Table.Cell><Badge size="1" variant="soft" color={roleColor[m.role]}>{m.role}</Badge></Table.Cell>
                                <Table.Cell><Text size="1" color="gray">{formatDate(m.added_at)}</Text></Table.Cell>
                                {viewerIsOwner && (
                                  <Table.Cell>
                                    {m.role !== 'owner' && (
                                      <Flex gap="2" justify="end">
                                        <Button size="1" variant="soft" onClick={() => transferOwnership(m.agent_id)}>Transfer</Button>
                                        <Button size="1" variant="soft" color="red" onClick={() => removeMember(m.agent_id)}>Remove</Button>
                                      </Flex>
                                    )}
                                  </Table.Cell>
                                )}
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
