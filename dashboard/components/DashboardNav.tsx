'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flex } from '@radix-ui/themes';

const tabs = [
  { href: '/dashboard',          label: 'Memories' },
  { href: '/dashboard/pools',    label: 'Pools' },
  { href: '/dashboard/treasury', label: 'Treasury' },
];

export default function DashboardNav() {
  const pathname = usePathname();

  return (
    <Flex
      align="center"
      gap="0"
      style={{
        background: 'var(--gray-3)',
        borderRadius: 8,
        padding: 4,
        border: '1px solid var(--gray-5)',
      }}
    >
      {tabs.map(t => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              borderRadius: 6,
              color: active ? 'var(--gray-12)' : 'var(--gray-10)',
              background: active ? 'var(--accent-9)' : 'transparent',
              textDecoration: 'none',
              transition: 'background 120ms, color 120ms',
              cursor: active ? 'default' : 'pointer',
            }}
          >
            {t.label}
          </Link>
        );
      })}
    </Flex>
  );
}
