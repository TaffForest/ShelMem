'use client';

import { useState } from 'react';
import Link from 'next/link';
import '../landing.css';

export default function DocsPage() {
  return (
    <div className="landing">
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">
            <span>Shel<span className="accent">Mem</span></span>
          </Link>
          <div className="nav-links">
            <Link href="/docs" style={{ color: 'var(--color-text)' }}>Docs</Link>
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer">Shelby</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest</a>
            <Link href="/dashboard" className="nav-cta">Launch App</Link>
          </div>
        </div>
      </nav>

      {/* Docs Content */}
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 32px 80px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 8 }}>
          Documentation
        </h1>
        <p style={{ fontSize: 16, color: 'var(--color-text-muted)', marginBottom: 48 }}>
          Everything you need to give your AI agents decentralised memory.
        </p>

        {/* Quick Start */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Quick Start</h2>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-accent)' }}>
            1. Install
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <Pre label="TypeScript">{`npm install shelmem`}</Pre>
            <Pre label="Python">{`pip install shelmem`}</Pre>
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-accent)' }}>
            2. Initialise
          </h3>
          <Tabs
            ts={`import { ShelMem } from 'shelmem';

const mem = new ShelMem({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  mock: true,
});`}
            py={`from shelmem import ShelMem

mem = ShelMem(
    supabase_url="https://your-project.supabase.co",
    supabase_key="your-service-role-key",
    mock=True,
)`}
          />

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 24, color: 'var(--color-accent)' }}>
            3. Write a memory
          </h3>
          <Tabs
            ts={`const result = await mem.write(
  'agent-001',
  'User prefers dark mode and concise responses',
  'preferences'
);

console.log(result.shelby_object_id); // shelby://...
console.log(result.aptos_tx_hash);    // 0x...`}
            py={`result = await mem.write(
    agent_id="agent-001",
    memory="User prefers dark mode and concise responses",
    context="preferences",
)

print(result.shelby_object_id)  # shelby://...
print(result.aptos_tx_hash)     # 0x...`}
          />

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 24, color: 'var(--color-accent)' }}>
            4. Recall memories
          </h3>
          <Tabs
            ts={`const memories = await mem.recall('agent-001', 'preferences');

for (const m of memories) {
  console.log(m.memory, m.timestamp);
}`}
            py={`memories = await mem.recall("agent-001", context="preferences")

for m in memories:
    print(m.memory, m.timestamp)`}
          />
        </section>

        {/* API Reference */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>API Reference</h2>

          <ApiMethod
            name="write"
            signature="write(agent_id, memory, context, metadata?)"
            description="Store a memory on Shelby with on-chain Aptos proof."
            params={[
              ['agent_id', 'string', 'Unique identifier for the agent'],
              ['memory', 'string', 'The memory content to store'],
              ['context', 'string', 'Category/context label for filtering'],
              ['metadata', 'object (optional)', 'Arbitrary key-value metadata'],
            ]}
            returns={[
              ['shelby_object_id', 'string', 'Shelby storage address (shelby://...)'],
              ['aptos_tx_hash', 'string', 'On-chain transaction hash'],
              ['timestamp', 'string', 'ISO 8601 creation timestamp'],
            ]}
          />

          <ApiMethod
            name="recall"
            signature="recall(agent_id, context?, limit?)"
            description="Retrieve memories for an agent, ordered by most recent first."
            params={[
              ['agent_id', 'string', 'Agent to query memories for'],
              ['context', 'string (optional)', 'Filter by context label'],
              ['limit', 'number (optional)', 'Max results, default 10'],
            ]}
            returns={[
              ['memory', 'string', 'The memory content'],
              ['context', 'string', 'Context label'],
              ['timestamp', 'string', 'ISO 8601 creation timestamp'],
              ['aptos_tx_hash', 'string', 'On-chain proof hash'],
            ]}
          />

          <ApiMethod
            name="delete"
            signature="delete(id)"
            description="Remove a memory record from Supabase metadata."
            params={[
              ['id', 'string', 'UUID of the memory row'],
            ]}
            returns={[]}
          />
        </section>

        {/* Configuration */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Configuration</h2>

          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Constructor Options</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Option</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Required</th>
                  <th style={{ padding: '10px 12px', color: 'var(--color-text-muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['supabaseUrl', 'Yes', 'Your Supabase project URL'],
                  ['supabaseKey', 'Yes', 'Supabase service role or anon key'],
                  ['shelbyApiKey', 'No', 'Shelby Protocol API key'],
                  ['aptosPrivateKey', 'When mock=false', 'Ed25519 private key for signing'],
                  ['network', 'No', 'testnet (default) or shelbynet'],
                  ['mock', 'No', 'true (default) for local dev without Shelby'],
                ].map(([opt, req, desc], i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>{opt}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--color-text-muted)' }}>{req}</td>
                    <td style={{ padding: '10px 12px' }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Environment Variables */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Environment Variables</h2>
          <Pre label=".env">{`SHELBY_API_KEY=your_shelby_api_key
SHELBY_ACCOUNT_PRIVATE_KEY=your_ed25519_private_key
SHELBY_NETWORK=testnet
SHELBY_MOCK=true

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key`}</Pre>
        </section>

        {/* Database */}
        <section style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Database Setup</h2>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Run the following SQL in your Supabase SQL Editor to create the memories table.
          </p>
          <Pre label="SQL">{`CREATE TABLE IF NOT EXISTS memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  context TEXT NOT NULL,
  memory_preview TEXT,
  shelby_object_id TEXT NOT NULL,
  aptos_tx_hash TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memories_agent_id ON memories(agent_id);
CREATE INDEX idx_memories_agent_context ON memories(agent_id, context);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;`}</Pre>
        </section>

        {/* Architecture */}
        <section>
          <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Architecture</h2>
          <Pre label="Flow">{`Agent  →  ShelMem SDK  →  Shelby Protocol (content bytes)
                       →  Supabase (metadata index)
                       →  Aptos (on-chain proof)`}</Pre>
          <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <Card title="Shelby" desc="Owns the memory content. Decentralised hot storage network." />
            <Card title="Supabase" desc="Owns the metadata. Agent IDs, contexts, timestamps, object IDs." />
            <Card title="Aptos" desc="Anchors every write. Cryptographic proof via transaction hash." />
          </div>
        </section>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span>Shel<span className="accent">Mem</span></span>
          </div>
          <div className="footer-links">
            <Link href="/">Home</Link>
            <Link href="/docs">Docs</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} ShelMem &mdash; a <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest</a> product.
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ---- Sub-components ---- */

function Pre({ label, children }: { label: string; children: string }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--color-text-muted)', borderBottom: '1px solid var(--color-border)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
        {label}
      </div>
      <pre style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-mono)', overflowX: 'auto', margin: 0 }}>
        {children}
      </pre>
    </div>
  );
}

function Tabs({ ts, py }: { ts: string; py: string }) {
  const [tab, setTab] = useState<'ts' | 'py'>('ts');

  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)' }}>
        <button
          onClick={() => setTab('ts')}
          style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === 'ts' ? 'var(--color-bg-surface)' : 'transparent',
            color: tab === 'ts' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: tab === 'ts' ? '2px solid var(--color-accent)' : '2px solid transparent',
          }}
        >
          TypeScript
        </button>
        <button
          onClick={() => setTab('py')}
          style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === 'py' ? 'var(--color-bg-surface)' : 'transparent',
            color: tab === 'py' ? 'var(--color-accent)' : 'var(--color-text-muted)',
            borderBottom: tab === 'py' ? '2px solid var(--color-accent)' : '2px solid transparent',
          }}
        >
          Python
        </button>
      </div>
      <pre style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-mono)', overflowX: 'auto', margin: 0 }}>
        {tab === 'ts' ? ts : py}
      </pre>
    </div>
  );
}

function ApiMethod({
  name, signature, description, params, returns,
}: {
  name: string;
  signature: string;
  description: string;
  params: string[][];
  returns: string[][];
}) {
  return (
    <div style={{ marginBottom: 32, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '24px' }}>
      <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 6 }}>
        {signature}
      </h3>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{description}</p>

      {params.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Parameters</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
            <tbody>
              {params.map(([p, type, desc], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 0', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', width: 140 }}>{p}</td>
                  <td style={{ padding: '8px 8px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, width: 160 }}>{type}</td>
                  <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {returns.length > 0 && (
        <>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Returns</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <tbody>
              {returns.map(([p, type, desc], i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 0', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', width: 140 }}>{p}</td>
                  <td style={{ padding: '8px 8px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, width: 160 }}>{type}</td>
                  <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function Card({ title, desc }: { title: string; desc: string }) {
  return (
    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '20px' }}>
      <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{title}</h4>
      <p style={{ fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{desc}</p>
    </div>
  );
}

