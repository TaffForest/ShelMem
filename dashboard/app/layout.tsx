import type { Metadata } from 'next';
import '@radix-ui/themes/styles.css';
import './globals.css';
import { Theme } from '@radix-ui/themes';

export const metadata: Metadata = {
  title: 'ShelMem — The Coordination Layer for Multi-Agent Systems',
  description: 'Shared memory pools, role-based permissions, per-memory ACLs, audit logs, and a built-in treasury. Verifiable, encrypted, on-chain — for AI agents that coordinate and transact.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Instrument+Serif:ital@1&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Theme appearance="dark" accentColor="lime" grayColor="sand" radius="medium" scaling="100%">
          {children}
        </Theme>
      </body>
    </html>
  );
}
