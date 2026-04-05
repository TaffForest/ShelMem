'use client';

import { useState } from 'react';
import { Badge } from '@radix-ui/themes';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Badge
      size="1"
      variant="surface"
      color={copied ? 'green' : 'gray'}
      onClick={handleCopy}
      style={{ cursor: 'pointer', fontSize: 10 }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </Badge>
  );
}
