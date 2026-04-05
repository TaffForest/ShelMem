'use client';

import { useState } from 'react';
import { Badge, Text, Code, Table, Flex, Box } from '@radix-ui/themes';
import type { MemoryRow as MemoryRowType } from '@/lib/supabase';
import CopyButton from './CopyButton';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function explorerUrl(txHash: string): string {
  return `https://explorer.shelby.xyz`;
}

const typeColors: Record<string, 'blue' | 'amber' | 'purple' | 'lime'> = {
  fact: 'blue',
  decision: 'amber',
  preference: 'purple',
  observation: 'lime',
};

export default function MemoryRow({
  row,
  onDelete,
}: {
  row: MemoryRowType;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    setDeleting(true);
    onDelete(row.id);
  };

  const memType = row.memory_type || 'observation';
  const badgeColor = typeColors[memType] || 'gray';

  return (
    <>
      <Table.Row onClick={() => setExpanded(!expanded)} style={{ cursor: 'pointer' }}>
        <Table.Cell><Code size="2" variant="ghost" color="lime">{row.agent_id}</Code></Table.Cell>
        <Table.Cell><Badge size="1" variant="soft" color={badgeColor}>{memType}</Badge></Table.Cell>
        <Table.Cell><Text size="2" color="gray">{row.context}</Text></Table.Cell>
        <Table.Cell style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          <Text size="2" color="gray">{row.memory_preview || '—'}</Text>
        </Table.Cell>
        <Table.Cell><Code size="1" variant="ghost" color="gray">{formatDate(row.created_at)}</Code></Table.Cell>
        <Table.Cell>
          {row.aptos_tx_hash ? (
            <a href={explorerUrl(row.aptos_tx_hash)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
              <Badge size="1" variant="surface" color="lime">Proof ↗</Badge>
            </a>
          ) : <Text size="1" color="gray">—</Text>}
        </Table.Cell>
        <Table.Cell>
          {row.verified === true && <Badge size="1" variant="soft" color="green">✓</Badge>}
          {row.verified === false && <Badge size="1" variant="soft" color="red">✗</Badge>}
          {row.verified === null && <Text size="1" color="gray">—</Text>}
        </Table.Cell>
        <Table.Cell>
          <Badge size="1" variant="outline" color="red" onClick={handleDelete} style={{ cursor: deleting ? 'wait' : 'pointer', opacity: deleting ? 0.5 : 1 }}>
            {deleting ? '...' : 'Delete'}
          </Badge>
        </Table.Cell>
      </Table.Row>
      {expanded && (
        <Table.Row>
          <Table.Cell colSpan={8} style={{ background: 'var(--gray-2)' }}>
            <Box p="3">
              <Flex gap="2" align="center" mb="3">
                <Badge size="1" variant="soft" color={badgeColor}>{memType}</Badge>
                {row.verified === true && <Badge size="1" variant="soft" color="green">Verified</Badge>}
                {row.verified === false && <Badge size="1" variant="solid" color="red">TAMPERED</Badge>}
                {row.verified === null && <Badge size="1" variant="surface" color="gray">Unverified</Badge>}
              </Flex>
              <Text size="1" color="gray" weight="medium" style={{ textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>Full Memory Content</Text>
              <Code size="2" variant="ghost" style={{ display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.6, marginBottom: 12 }}>
                {row.memory_preview || '[No content available]'}
              </Code>
              <Flex direction="column" gap="2">
                <Flex align="center" gap="2">
                  <Text size="1" color="gray"><Code size="1" variant="ghost">Shelby: {row.shelby_object_id}</Code></Text>
                  <CopyButton text={row.shelby_object_id} />
                </Flex>
                {row.aptos_tx_hash && (
                  <Flex align="center" gap="2">
                    <Text size="1" color="gray"><Code size="1" variant="ghost">Tx: {row.aptos_tx_hash}</Code></Text>
                    <CopyButton text={row.aptos_tx_hash} />
                  </Flex>
                )}
                {row.content_hash && (
                  <Flex align="center" gap="2">
                    <Text size="1" color="gray"><Code size="1" variant="ghost">SHA-256: {row.content_hash}</Code></Text>
                    <CopyButton text={row.content_hash} />
                  </Flex>
                )}
              </Flex>
            </Box>
          </Table.Cell>
        </Table.Row>
      )}
    </>
  );
}
