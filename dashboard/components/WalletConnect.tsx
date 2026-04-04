'use client';

import { useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';

export default function WalletConnect({
  onConnect,
}: {
  onConnect: (address: string) => void;
}) {
  const { connected, account, connect, disconnect, wallets } = useWallet();

  const handleConnect = useCallback(async () => {
    try {
      const petra = wallets?.find((w) =>
        w.name.toLowerCase().includes('petra')
      );

      if (petra) {
        await connect(petra.name);
      } else if (wallets?.length > 0) {
        await connect(wallets[0].name);
      } else {
        alert('No Aptos wallet found. Install Petra from petra.app');
        return;
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('Failed to fetch') || msg.includes('CORS')) return;
      if (msg.includes('rejected') || msg.includes('User rejected')) return;
      console.warn('Wallet connect:', msg);
    }
  }, [wallets, connect]);

  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
    } catch {
      // ignore
    }
  }, [disconnect]);

  // Notify parent when connection state changes
  if (connected && account?.address) {
    const addr = typeof account.address === 'string'
      ? account.address
      : account.address.toString();
    // Fire onConnect on next tick to avoid setState-during-render
    setTimeout(() => onConnect(addr), 0);
  }

  if (connected && account?.address) {
    const addr = typeof account.address === 'string'
      ? account.address
      : account.address.toString();
    const truncated = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: 'var(--color-accent)', fontSize: 14, fontFamily: 'var(--font-mono)' }}>
          {truncated}
        </span>
        <button
          onClick={handleDisconnect}
          style={{
            padding: '6px 16px',
            fontSize: 13,
            border: '1px solid var(--color-border)',
            borderRadius: 6,
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      style={{
        padding: '8px 20px',
        background: 'var(--color-accent)',
        color: '#050505',
        fontSize: 14,
        fontWeight: 600,
        borderRadius: 6,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      Connect Wallet
    </button>
  );
}
