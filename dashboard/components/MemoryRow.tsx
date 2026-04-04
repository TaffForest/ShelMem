'use client';

import { useState } from 'react';
import type { MemoryRow as MemoryRowType } from '@/lib/supabase';

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function explorerUrl(txHash: string): string {
  return `https://explorer.aptoslabs.com/txn/${txHash}?network=testnet`;
}

export default function MemoryRow({
  row,
  onDelete,
}: {
  row: MemoryRowType;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this memory? This cannot be undone.')) return;
    setDeleting(true);
    onDelete(row.id);
  };

  const cellStyle = { padding: '12px 16px', fontSize: 14 };

  return (
    <>
      <tr
        onClick={() => setExpanded(!expanded)}
        style={{
          borderBottom: '1px solid var(--color-border)',
          cursor: 'pointer',
          transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-bg-surface)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <td style={{ ...cellStyle, color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{row.agent_id}</td>
        <td style={cellStyle}>{row.context}</td>
        <td style={{ ...cellStyle, color: 'var(--color-text-muted)', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
          {row.memory_preview || '—'}
        </td>
        <td style={{ ...cellStyle, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' as const, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
          {formatDate(row.created_at)}
        </td>
        <td style={cellStyle}>
          {row.aptos_tx_hash ? (
            <a
              href={explorerUrl(row.aptos_tx_hash)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'var(--color-accent)', fontSize: 13 }}
            >
              Proof ↗
            </a>
          ) : (
            <span style={{ color: 'var(--color-text-muted)' }}>—</span>
          )}
        </td>
        <td style={cellStyle}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-error)',
              fontSize: 13,
              cursor: deleting ? 'wait' : 'pointer',
              opacity: deleting ? 0.5 : 0.7,
              transition: 'opacity 0.15s',
            }}
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          <td colSpan={6} style={{ padding: '16px', background: 'var(--color-bg-card)' }}>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
              Full Memory Content
            </div>
            <pre style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' as const, color: 'var(--color-text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
              {row.memory_preview || '[No content available]'}
            </pre>
            <div style={{ marginTop: 12, display: 'flex', gap: 24, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>Shelby: {row.shelby_object_id}</span>
              {row.aptos_tx_hash && <span>Tx: {row.aptos_tx_hash}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
