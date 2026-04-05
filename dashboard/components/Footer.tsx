'use client';

import { Text, Flex, Box } from '@radix-ui/themes';

export default function Footer() {
  return (
    <Box style={{ padding: '24px 32px', borderTop: '1px solid var(--gray-4)', textAlign: 'center' }}>
      <Text size="1" color="gray">
        Powered by{' '}
        <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-9)' }}>
          Forest
        </a>
      </Text>
    </Box>
  );
}
