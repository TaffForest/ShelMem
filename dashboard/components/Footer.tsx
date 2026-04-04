'use client';

export default function Footer() {
  return (
    <footer
      style={{
        padding: '24px 32px',
        textAlign: 'center',
        fontSize: 12,
        color: 'var(--color-text-muted)',
        borderTop: '1px solid var(--color-border)',
      }}
    >
      Powered by{' '}
      <a
        href="https://forestinfra.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--color-accent)' }}
      >
        Forest
      </a>
    </footer>
  );
}
