'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Box, Flex, Text } from '@radix-ui/themes';
import { supabase } from '@/lib/supabase';
import type { MemoryRow } from '@/lib/supabase';
import WalletProvider from '@/components/WalletProvider';
import TestnetBanner from '@/components/TestnetBanner';
import WalletConnect from '@/components/WalletConnect';
import TreasuryPanel from '@/components/TreasuryPanel';
import MemoryTable from '@/components/MemoryTable';

export default function DashboardPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [memories, setMemories] = useState<MemoryRow[]>([]);
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
    setMemories(prev => prev.filter(m => m.id !== id));
  };

  return (
    <WalletProvider>
      <TestnetBanner />

      <Flex
        align="center"
        justify="between"
        px="5"
        py="3"
        style={{
          borderBottom: '1px solid var(--gray-4)',
          background: 'var(--color-background)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <Box>
          <Link href="/">
            <Text size="4" weight="bold">Shel<span style={{ color: 'var(--accent-9)' }}>Mem</span></Text>
          </Link>
          <Text size="1" color="gray" style={{ display: 'block', marginTop: 2 }}>Agent Memory Dashboard</Text>
        </Box>
        <Flex align="center" gap="3">
          <Link href="/dashboard/treasury">
            <Text size="2" color="gray" style={{ cursor: 'pointer' }}>Treasury →</Text>
          </Link>
          <WalletConnect onConnect={setWalletAddress} />
        </Flex>
      </Flex>

      <Box style={{ flex: 1, padding: '24px 32px' }}>
        {walletAddress && !loading && memories.length > 0 && (
          <TreasuryPanel memories={memories} />
        )}
        <MemoryTable
          memories={memories}
          loading={loading}
          walletAddress={walletAddress}
          onDelete={handleDelete}
        />
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
