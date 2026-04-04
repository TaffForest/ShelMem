'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MemoryRow as MemoryRowType } from '@/lib/supabase';
import MemoryRow from './MemoryRow';

export default function MemoryTable({ walletAddress }: { walletAddress: string | null }) {
  const [memories, setMemories] = useState<MemoryRowType[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletAddress) {
      setMemories([]);
      return;
    }

    const fetchMemories = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('memories')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to fetch memories:', error.message);
          return;
        }
        setMemories(data ?? []);
      } finally {
        setLoading(false);
      }
    };

    fetchMemories();
  }, [walletAddress]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('memories').delete().eq('id', id);
    if (error) {
      console.error('Delete failed:', error.message);
      return;
    }
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  if (!walletAddress) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>
          Connect your wallet to view agent memories
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <p style={{ color: 'var(--color-accent)', fontSize: 15 }}>Loading memories...</p>
      </div>
    );
  }

  if (memories.length === 0) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 15 }}>
          No memories found. Use the ShelMem SDK to write your first memory.
        </p>
      </div>
    );
  }

  const thStyle = {
    padding: '12px 16px',
    fontSize: 12,
    fontWeight: 600 as const,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    textAlign: 'left' as const,
    borderBottom: '1px solid var(--color-border)',
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={thStyle}>Agent</th>
            <th style={thStyle}>Type</th>
            <th style={thStyle}>Context</th>
            <th style={thStyle}>Memory</th>
            <th style={thStyle}>Timestamp</th>
            <th style={thStyle}>Proof</th>
            <th style={thStyle}></th>
          </tr>
        </thead>
        <tbody>
          {memories.map((row) => (
            <MemoryRow key={row.id} row={row} onDelete={handleDelete} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
