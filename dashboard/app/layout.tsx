import type { Metadata } from 'next';
import '@radix-ui/themes/styles.css';
import './globals.css';
import { Theme } from '@radix-ui/themes';

export const metadata: Metadata = {
  title: 'ShelMem — Decentralised Agent Memory',
  description: 'Tamper-proof, encrypted, searchable memory for AI agents. Powered by Shelby Protocol and Aptos.',
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
