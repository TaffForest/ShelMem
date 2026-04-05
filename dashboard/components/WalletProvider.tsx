'use client';

import { ReactNode } from 'react';
import { AptosWalletAdapterProvider } from '@aptos-labs/wallet-adapter-react';
import { Network } from '@aptos-labs/ts-sdk';

export default function WalletProvider({ children }: { children: ReactNode }) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={false}
      dappConfig={{
        network: Network.TESTNET,
        aptosConnectDappId: undefined,
      }}
      optInWallets={['Petra']}
      onError={(error) => {
        const msg = error?.message || error?.toString?.() || '';
        if (msg.includes('Failed to fetch') || msg.includes('CORS')) return;
        if (msg.includes('rejected') || msg.includes('User rejected')) return;
        console.warn('Wallet adapter:', msg);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
