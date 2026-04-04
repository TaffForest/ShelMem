'use client';

export default function TestnetBanner() {
  return (
    <div
      style={{
        width: '100%',
        background: 'var(--color-accent)',
        color: '#050505',
        textAlign: 'center',
        padding: '8px 0',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: '0.02em',
      }}
    >
      ShelMem is running on Shelby testnet
    </div>
  );
}
