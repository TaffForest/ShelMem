'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { MemoryRow as MemoryRowType } from '@/lib/supabase';
import { Table, Text, Box, Flex, TextField, Select, Card, Code, Heading, Button } from '@radix-ui/themes';
import MemoryRow from './MemoryRow';
import StatsBar from './StatsBar';

export default function MemoryTable({ walletAddress }: { walletAddress: string | null }) {
  const [memories, setMemories] = useState<MemoryRowType[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');

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
        setMemories(data ?? []);
      } finally { setLoading(false); }
    };

    fetchMemories();
  }, [walletAddress]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) { console.error('Delete failed:', error.message); return; }
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  // Derived data
  const agents = useMemo(() => {
    const set = new Set(memories.map(m => m.agent_id));
    return Array.from(set).sort();
  }, [memories]);

  const filtered = useMemo(() => {
    let result = memories;
    if (agentFilter !== 'all') {
      result = result.filter(m => m.agent_id === agentFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        (m.memory_preview?.toLowerCase().includes(q)) ||
        m.agent_id.toLowerCase().includes(q) ||
        m.context.toLowerCase().includes(q) ||
        (m.memory_type?.toLowerCase().includes(q))
      );
    }
    return result;
  }, [memories, agentFilter, searchQuery]);

  if (!walletAddress) {
    return (
      <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Text size="3" color="gray">Connect your wallet to view agent memories</Text>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Text size="3" color="lime">Loading memories...</Text>
      </Box>
    );
  }

  if (memories.length === 0) {
    return (
      <Box style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <Card size="3" variant="surface" style={{ maxWidth: 500, textAlign: 'center' }}>
          <Heading size="4" mb="2">No memories yet</Heading>
          <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16 }}>
            Use the ShelMem SDK to write your first agent memory.
          </Text>
          <Card size="1" variant="surface" style={{ textAlign: 'left', marginBottom: 16 }}>
            <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Quick Start</Text>
            <Code size="2" variant="ghost" style={{ display: 'block', whiteSpace: 'pre', lineHeight: 1.8 }}>
{`npm install @forestinfra/shelmem

import { ShelMem } from '@forestinfra/shelmem';
const mem = new ShelMem({ supabaseUrl, supabaseKey });
await mem.write('my-agent', 'Hello world', 'test');`}
            </Code>
          </Card>
          <a href="/docs" style={{ color: 'var(--accent-9)', fontSize: 14 }}>Read the docs →</a>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      {/* Stats */}
      <StatsBar memories={memories} />

      {/* Filters */}
      <Flex gap="3" mb="4" align="center">
        <Box style={{ flex: 1 }}>
          <TextField.Root
            size="2"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>
        <Select.Root value={agentFilter} onValueChange={setAgentFilter}>
          <Select.Trigger placeholder="All agents" variant="surface" />
          <Select.Content>
            <Select.Item value="all">All agents</Select.Item>
            {agents.map(a => (
              <Select.Item key={a} value={a}>{a}</Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <Text size="1" color="gray">{filtered.length} of {memories.length}</Text>
      </Flex>

      {/* Table */}
      <Table.Root size="2" variant="surface">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeaderCell>Agent</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Context</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Memory</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Timestamp</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Proof</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell>Verified</Table.ColumnHeaderCell>
            <Table.ColumnHeaderCell></Table.ColumnHeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {filtered.map(row => (
            <MemoryRow key={row.id} row={row} onDelete={handleDelete} />
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
