'use client';

import { Callout } from '@radix-ui/themes';

export default function TestnetBanner() {
  return (
    <Callout.Root color="lime" size="1" variant="surface" style={{ borderRadius: 0, justifyContent: 'center' }}>
      <Callout.Text size="2" weight="medium">
        ShelMem is running on Shelby testnet
      </Callout.Text>
    </Callout.Root>
  );
}
