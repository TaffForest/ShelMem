'use client';

import { useCallback } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Button, Text, Flex, Code } from '@radix-ui/themes';

export default function WalletConnect({
  onConnect,
}: {
  onConnect: (address: string) => void;
}) {
  const { connected, account, connect, disconnect, wallets } = useWallet();

  const handleConnect = useCallback(async () => {
    try {
      const petra = wallets?.find((w) => w.name.toLowerCase().includes('petra'));
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
    try { await disconnect(); } catch { /* ignore */ }
  }, [disconnect]);

  if (connected && account?.address) {
    const addr = typeof account.address === 'string' ? account.address : account.address.toString();
    setTimeout(() => onConnect(addr), 0);
    const truncated = `${addr.slice(0, 6)}...${addr.slice(-4)}`;

    return (
      <Flex align="center" gap="3">
        <Code size="2" variant="soft" color="lime">{truncated}</Code>
        <Button size="1" variant="outline" onClick={handleDisconnect} style={{ cursor: 'pointer' }}>
          Disconnect
        </Button>
      </Flex>
    );
  }

  return (
    <Button size="2" variant="solid" onClick={handleConnect} style={{ cursor: 'pointer' }}>
      Connect Wallet
    </Button>
  );
}
