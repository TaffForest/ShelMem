'use client';

import { useState } from 'react';
import Link from 'next/link';
import WalletProvider from '@/components/WalletProvider';
import TestnetBanner from '@/components/TestnetBanner';
import WalletConnect from '@/components/WalletConnect';
import MemoryTable from '@/components/MemoryTable';

export default function DashboardPage() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  return (
    <WalletProvider>
      <TestnetBanner />

      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          borderBottom: '1px solid var(--color-border)',
          background: 'rgba(5, 5, 5, 0.85)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div>
          <Link href="/" style={{ fontSize: 20, fontWeight: 700 }}>
            Shel<span style={{ color: 'var(--color-accent)' }}>Mem</span>
          </Link>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            Agent Memory Dashboard
          </p>
        </div>
        <WalletConnect onConnect={setWalletAddress} />
      </header>

      <main style={{ flex: 1, padding: '24px 32px' }}>
        <MemoryTable walletAddress={walletAddress} />
      </main>

      <footer
        style={{
          padding: '24px 32px',
          textAlign: 'center',
          fontSize: 12,
          color: 'var(--color-text-muted)',
          borderTop: '1px solid var(--color-border)',
        }}
      >
        Powered by{' '}
        <a
          href="https://forestinfra.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: 'var(--color-accent)' }}
        >
          Forest
        </a>
      </footer>
    </WalletProvider>
  );
}
