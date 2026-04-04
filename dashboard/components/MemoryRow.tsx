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

const typeColors: Record<string, string> = {
  fact: '#60a5fa',
  decision: '#f59e0b',
  preference: '#a78bfa',
  observation: '#8BC53F',
};

function TypePill({ type }: { type: string | null }) {
  const t = type || 'observation';
  const color = typeColors[t] || 'var(--color-text-muted)';
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        fontSize: 11,
        fontWeight: 600,
        borderRadius: 100,
        border: `1px solid ${color}`,
        color,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {t}
    </span>
  );
}

function VerifiedBadge({ verified }: { verified: boolean | null }) {
  if (verified === true) {
    return <span title="Verified — content hash matches" style={{ color: '#4ade80', fontSize: 16 }}>&#10003;</span>;
  }
  if (verified === false) {
    return <span title="TAMPERED — content hash mismatch" style={{ color: '#f87171', fontSize: 16, fontWeight: 700 }}>&#10007;</span>;
  }
  return <span title="Unverified" style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>—</span>;
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
        <td style={cellStyle}><TypePill type={row.memory_type} /></td>
        <td style={cellStyle}>{row.context}</td>
        <td style={{ ...cellStyle, color: 'var(--color-text-muted)', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
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
            }}
          >
            {deleting ? '...' : 'Delete'}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
          <td colSpan={7} style={{ padding: '16px', background: 'var(--color-bg-card)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <TypePill type={row.memory_type} />
              <VerifiedBadge verified={row.verified} />
              <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                {row.verified === true && 'Content integrity verified'}
                {row.verified === false && 'WARNING: Content may have been tampered with'}
                {row.verified === null && 'Not yet verified'}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: '0.08em' }}>
              Full Memory Content
            </div>
            <pre style={{ fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-word' as const, color: 'var(--color-text)', fontFamily: 'var(--font-mono)', lineHeight: 1.6 }}>
              {row.memory_preview || '[No content available]'}
            </pre>
            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column' as const, gap: 4, fontSize: 12, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              <span>Shelby: {row.shelby_object_id}</span>
              {row.aptos_tx_hash && <span>Tx: {row.aptos_tx_hash}</span>}
              {row.content_hash && <span>SHA-256: {row.content_hash}</span>}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
