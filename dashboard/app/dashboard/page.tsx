'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Box, Flex, Text, Heading } from '@radix-ui/themes';
import WalletProvider from '@/components/WalletProvider';
import TestnetBanner from '@/components/TestnetBanner';
import WalletConnect from '@/components/WalletConnect';
import MemoryTable from '@/components/MemoryTable';

export default function DashboardPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

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
        <WalletConnect onConnect={setWalletAddress} />
      </Flex>

      <Box style={{ flex: 1, padding: '24px 32px' }}>
        <MemoryTable walletAddress={walletAddress} />
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
