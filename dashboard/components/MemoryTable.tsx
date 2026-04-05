'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MemoryRow as MemoryRowType } from '@/lib/supabase';
import { Table, Text, Box } from '@radix-ui/themes';
import MemoryRow from './MemoryRow';

export default function MemoryTable({ walletAddress }: { walletAddress: string | null }) {
  const [memories, setMemories] = useState<MemoryRowType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) { setMemories([]); return; }

    const fetchMemories = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .like('shelby_object_id', `shelby://${walletAddress}%`)
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
        <Text size="3" color="gray">No memories found. Use the ShelMem SDK to write your first memory.</Text>
      </Box>
    );
  }

  return (
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
        {memories.map(row => (
          <MemoryRow key={row.id} row={row} onDelete={handleDelete} />
        ))}
      </Table.Body>
    </Table.Root>
  );
}
