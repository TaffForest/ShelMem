'use client';

import { useState, useMemo } from 'react';
import type { MemoryRow as MemoryRowType } from '@/lib/supabase';
import { TREASURY_TYPES } from '@/lib/supabase';
import { Table, Text, Box, Flex, TextField, Select, Card, Code, Heading } from '@radix-ui/themes';
import MemoryRow from './MemoryRow';
import StatsBar from './StatsBar';

interface MemoryTableProps {
  memories: MemoryRowType[];
  loading: boolean;
  walletAddress: string | null;
  onDelete: (id: string) => void;
}

export default function MemoryTable({ memories, loading, walletAddress, onDelete }: MemoryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [agentFilter, setAgentFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const agents = useMemo(() => {
    return Array.from(new Set(memories.map(m => m.agent_id))).sort();
  }, [memories]);

  const filtered = useMemo(() => {
    let result = memories;

    if (agentFilter !== 'all') {
      result = result.filter(m => m.agent_id === agentFilter);
    }

    if (typeFilter === 'treasury') {
      result = result.filter(m => TREASURY_TYPES.includes(m.memory_type || ''));
    } else if (typeFilter !== 'all') {
      result = result.filter(m => m.memory_type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        (m.memory_preview?.toLowerCase().includes(q)) ||
        m.agent_id.toLowerCase().includes(q) ||
        m.context.toLowerCase().includes(q) ||
        (m.memory_type?.toLowerCase().includes(q)) ||
        (m.counterparty?.toLowerCase().includes(q)) ||
        (m.currency?.toLowerCase().includes(q))
      );
    }

    return result;
  }, [memories, agentFilter, typeFilter, searchQuery]);

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
      <StatsBar memories={memories} />

      {/* Filters */}
      <Flex gap="3" mb="4" align="center">
        <Box style={{ flex: 1 }}>
          <TextField.Root
            size="2"
            placeholder="Search memories..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
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
        <Select.Root value={typeFilter} onValueChange={setTypeFilter}>
          <Select.Trigger placeholder="All types" variant="surface" />
          <Select.Content>
            <Select.Item value="all">All types</Select.Item>
            <Select.Item value="treasury">Treasury</Select.Item>
            <Select.Separator />
            <Select.Item value="fact">Fact</Select.Item>
            <Select.Item value="decision">Decision</Select.Item>
            <Select.Item value="preference">Preference</Select.Item>
            <Select.Item value="observation">Observation</Select.Item>
            <Select.Separator />
            <Select.Item value="transaction_record">Transaction</Select.Item>
            <Select.Item value="balance_snapshot">Balance</Select.Item>
            <Select.Item value="spending_policy">Spending Policy</Select.Item>
          </Select.Content>
        </Select.Root>
        <Text size="1" color="gray">{filtered.length} of {memories.length}</Text>
      </Flex>

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
            <MemoryRow key={row.id} row={row} onDelete={onDelete} />
          ))}
        </Table.Body>
      </Table.Root>
    </Box>
  );
}
