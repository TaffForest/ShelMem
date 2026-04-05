'use client';

import { useState } from 'react';
import Link from 'next/link';
import '../landing.css';

const sections = [
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'api', label: 'API Reference' },
  { id: 'encryption', label: 'Encryption' },
  { id: 'search', label: 'Semantic Search' },
  { id: 'config', label: 'Configuration' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'database', label: 'Database Setup' },
  { id: 'architecture', label: 'Architecture' },
];

export default function DocsPage() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

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
            <Link href="/dashboard" className="nav-cta">Dashboard</Link>
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex', maxWidth: 1200, margin: '0 auto' }}>
        {/* Sidebar */}
        <aside style={{
          width: 220, minWidth: 220, padding: '32px 0 32px 32px',
          position: 'sticky', top: 60, height: 'fit-content', alignSelf: 'flex-start',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>
            Documentation
          </div>
          {sections.map(s => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={(e) => { e.preventDefault(); scrollTo(s.id); }}
              style={{
                display: 'block', padding: '8px 0', fontSize: 14, color: 'var(--color-text-muted)',
                borderLeft: '2px solid var(--color-border)', paddingLeft: 16,
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text)'; e.currentTarget.style.borderColor = 'var(--color-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}
            >
              {s.label}
            </a>
          ))}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--color-border)' }}>
            <a href="https://www.npmjs.com/package/@forestinfra/shelmem" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', padding: '4px 0' }}>npm</a>
            <a href="https://pypi.org/project/shelmem/" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', padding: '4px 0' }}>PyPI</a>
            <a href="https://github.com/TaffForest/ShelMem" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--color-text-muted)', padding: '4px 0' }}>GitHub</a>
          </div>
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, padding: '48px 32px 80px', maxWidth: 820 }}>
          <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 8 }}>
            Documentation
          </h1>
          <p style={{ fontSize: 16, color: 'var(--color-text-muted)', marginBottom: 48 }}>
            Tamper-proof, encrypted, searchable memory for AI agents.
          </p>

          {/* Quick Start */}
          <section id="quickstart" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Quick Start</h2>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-accent)' }}>1. Install</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <Pre label="TypeScript">{`npm install @forestinfra/shelmem`}</Pre>
              <Pre label="Python">{`pip install shelmem`}</Pre>
            </div>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-accent)' }}>2. Initialise</h3>
            <Tabs
              ts={`import { ShelMem, openaiEmbeddings } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  encrypt: true,                                    // AES-256-GCM
  embeddingProvider: openaiEmbeddings(OPENAI_KEY),  // semantic search
});`}
              py={`from shelmem import ShelMem, openai_embeddings

mem = ShelMem(
    supabase_url="https://your-project.supabase.co",
    supabase_key="your-key",
    encrypt=True,
    embedding_provider=openai_embeddings(OPENAI_KEY),
)`}
            />

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 24, color: 'var(--color-accent)' }}>3. Write a memory</h3>
            <Tabs
              ts={`const result = await mem.write(
  'agent-001',
  'User prefers dark mode and concise responses',
  'preferences',
  'preference'
);
// → { content_hash, shelby_object_id, aptos_tx_hash, timestamp }`}
              py={`result = await mem.write(
    "agent-001",
    "User prefers dark mode and concise responses",
    "preferences",
    "preference",
)
# → WriteResult(content_hash, shelby_object_id, aptos_tx_hash)`}
            />

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 24, color: 'var(--color-accent)' }}>4. Recall + verify</h3>
            <Tabs
              ts={`const memories = await mem.recall('agent-001', 'preferences');

for (const m of memories) {
  console.log(m.memory, m.memory_type);
  console.log('Verified:', m.verified);  // true | false | null
}`}
              py={`memories = await mem.recall("agent-001", context="preferences")

for m in memories:
    print(m.memory, m.memory_type)
    print("Verified:", m.verified)  # True | False | None`}
            />

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 24, color: 'var(--color-accent)' }}>5. Semantic search</h3>
            <Tabs
              ts={`const results = await mem.search('what does the user prefer?');
// → [{ memory_preview, similarity: 0.91, memory_type: 'preference' }]`}
              py={`results = await mem.search("what does the user prefer?")
# → [SearchResult(memory_preview, similarity=0.91)]`}
            />
          </section>

          {/* API Reference */}
          <section id="api" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>API Reference</h2>

            <ApiMethod
              name="write"
              signature="write(agent_id, memory, context, memory_type?, metadata?)"
              description="Store a memory on Shelby with on-chain Aptos proof. Content is SHA-256 hashed for tamper detection. Encrypted if enabled. Embedding stored if provider configured."
              params={[
                ['agent_id', 'string', 'Unique identifier for the agent'],
                ['memory', 'string', 'The memory content to store'],
                ['context', 'string', 'Category/context label for filtering'],
                ['memory_type', 'MemoryType (optional)', "'fact' | 'decision' | 'preference' | 'observation' (default)"],
                ['metadata', 'object (optional)', 'Arbitrary key-value metadata'],
              ]}
              returns={[
                ['shelby_object_id', 'string', 'Shelby storage address (shelby://...)'],
                ['aptos_tx_hash', 'string', 'On-chain transaction hash'],
                ['content_hash', 'string', 'SHA-256 hash of plaintext content'],
                ['memory_type', 'string', 'The memory type stored'],
                ['timestamp', 'string', 'ISO 8601 creation timestamp'],
              ]}
            />

            <ApiMethod
              name="recall"
              signature="recall(agent_id, context?, limit?, memory_type?)"
              description="Retrieve memories by metadata filters. Each memory is decrypted (if encrypted) and verified against its stored content hash."
              params={[
                ['agent_id', 'string', 'Agent to query memories for'],
                ['context', 'string (optional)', 'Filter by context label'],
                ['limit', 'number (optional)', 'Max results, default 10'],
                ['memory_type', 'MemoryType (optional)', 'Filter by memory type'],
              ]}
              returns={[
                ['memory', 'string', 'The memory content (decrypted)'],
                ['context', 'string', 'Context label'],
                ['timestamp', 'string', 'ISO 8601 creation timestamp'],
                ['aptos_tx_hash', 'string', 'On-chain proof hash'],
                ['content_hash', 'string', 'SHA-256 content hash'],
                ['memory_type', 'string', 'fact | decision | preference | observation'],
                ['verified', 'boolean | null', 'true = authentic, false = tampered, null = unverifiable'],
              ]}
            />

            <ApiMethod
              name="search"
              signature="search(query, agent_id?, limit?, threshold?)"
              description="Semantic search — find memories by meaning using vector similarity. Requires an embeddingProvider."
              params={[
                ['query', 'string', 'Natural language query'],
                ['agent_id', 'string (optional)', 'Filter to specific agent'],
                ['limit', 'number (optional)', 'Max results, default 10'],
                ['threshold', 'number (optional)', 'Min similarity 0-1, default 0.5'],
              ]}
              returns={[
                ['id', 'string', 'Memory row UUID'],
                ['memory_preview', 'string', 'First 200 chars of memory'],
                ['similarity', 'number', 'Cosine similarity score (0-1)'],
                ['memory_type', 'string', 'Memory type'],
                ['agent_id', 'string', 'Agent that wrote this memory'],
                ['created_at', 'string', 'Timestamp'],
              ]}
            />

            <ApiMethod
              name="verify"
              signature="verify(id)"
              description="Re-download a memory from Shelby, decrypt if needed, and verify its content hash matches what was stored at write time."
              params={[
                ['id', 'string', 'UUID of the memory row'],
              ]}
              returns={[
                ['verified', 'boolean', 'true if content hash matches'],
                ['content_hash', 'string', 'Actual SHA-256 of downloaded content'],
                ['expected_hash', 'string', 'Hash stored at write time'],
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

          {/* Encryption */}
          <section id="encryption" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Encryption</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              ShelMem uses AES-256-GCM to encrypt memory content before uploading to Shelby. The encryption key is derived from your Aptos private key via HMAC-SHA256 — no additional secrets needed. Content hashes are computed on the plaintext before encryption, so tamper verification still works.
            </p>
            <Tabs
              ts={`const mem = new ShelMem({
  supabaseUrl, supabaseKey,
  aptosPrivateKey: '0x...',
  encrypt: true,  // enable AES-256-GCM
});

// Write — encrypted before upload
await mem.write('agent', 'secret strategy', 'trading');

// Recall — decrypted automatically, hash verified on plaintext
const memories = await mem.recall('agent');
// → [{ memory: 'secret strategy', verified: true }]`}
              py={`mem = ShelMem(
    supabase_url=url, supabase_key=key,
    aptos_private_key="0x...",
    encrypt=True,
)

await mem.write("agent", "secret strategy", "trading")
memories = await mem.recall("agent")
# → [MemoryRecord(memory="secret strategy", verified=True)]`}
            />
            <div style={{ marginTop: 16, padding: 16, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--color-text)' }}>Storage format:</strong> <code style={{ fontFamily: 'var(--font-mono)' }}>[IV 12B] [AuthTag 16B] [Ciphertext]</code><br />
              <strong style={{ color: 'var(--color-text)' }}>Key derivation:</strong> HMAC-SHA256(Aptos private key, &quot;ShelMem-v1&quot;)<br />
              <strong style={{ color: 'var(--color-text)' }}>Algorithm:</strong> AES-256-GCM with random 96-bit IV per write
            </div>
          </section>

          {/* Semantic Search */}
          <section id="search" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Semantic Search</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              ShelMem stores vector embeddings alongside memories using Supabase pgvector. This enables meaning-based search — find memories by concept, not just exact keywords. The embedding provider is pluggable; OpenAI is included as a convenience.
            </p>
            <Tabs
              ts={`import { ShelMem, openaiEmbeddings } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl, supabaseKey,
  embeddingProvider: openaiEmbeddings(process.env.OPENAI_API_KEY),
});

// Embeddings are stored automatically on write
await mem.write('agent', 'ETH RSI is 28, oversold', 'analysis', 'observation');
await mem.write('agent', 'BTC broke 200-day MA', 'analysis', 'observation');

// Search by meaning
const results = await mem.search('what do I know about ethereum?', 'agent');
// → [{ memory_preview: 'ETH RSI is 28...', similarity: 0.87 }]`}
              py={`from shelmem import ShelMem, openai_embeddings

mem = ShelMem(
    supabase_url=url, supabase_key=key,
    embedding_provider=openai_embeddings(OPENAI_KEY),
)

await mem.write("agent", "ETH RSI is 28, oversold", "analysis", "observation")

results = await mem.search("what do I know about ethereum?", "agent")
# → [SearchResult(memory_preview="ETH RSI is 28...", similarity=0.87)]`}
            />
            <div style={{ marginTop: 16, padding: 16, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 13, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
              <strong style={{ color: 'var(--color-text)' }}>Custom providers:</strong> Pass any <code style={{ fontFamily: 'var(--font-mono)' }}>(text: string) =&gt; Promise&lt;number[]&gt;</code> function. Use Ollama, Cohere, Hugging Face — anything that returns a 1536-dim vector.
            </div>
          </section>

          {/* Configuration */}
          <section id="config" style={{ marginBottom: 56 }}>
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
                    ['aptosPrivateKey', 'When mock=false or encrypt=true', 'Ed25519 private key'],
                    ['network', 'No', 'testnet (default) or shelbynet'],
                    ['mock', 'No', 'true (default) for local dev without Shelby'],
                    ['encrypt', 'No', 'Enable AES-256-GCM encryption (default false)'],
                    ['embeddingProvider', 'No', 'Function for semantic search embeddings'],
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

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 24 }}>Environment Variables</h3>
            <Pre label=".env">{`SHELBY_API_KEY=your_shelby_api_key
SHELBY_ACCOUNT_PRIVATE_KEY=your_ed25519_private_key
SHELBY_NETWORK=testnet
SHELBY_MOCK=true

SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
OPENAI_API_KEY=sk-...  # for semantic search`}</Pre>
          </section>

          {/* Integrations */}
          <section id="integrations" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Framework Integrations</h2>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, color: 'var(--color-accent)' }}>LangChain</h3>
            <Tabs
              ts={`// Use the ShelMem SDK directly in TypeScript
// LangChain adapter is Python-only`}
              py={`from shelmem.integrations.langchain import ShelMemChatMessageHistory

history = ShelMemChatMessageHistory(
    session_id="user-123",
    agent_id="my-chatbot",
    supabase_url=url, supabase_key=key,
)

# Works with any LangChain chain
from langchain_core.runnables.history import RunnableWithMessageHistory
chain_with_history = RunnableWithMessageHistory(
    chain,
    lambda sid: ShelMemChatMessageHistory(
        session_id=sid, agent_id="my-chatbot",
        supabase_url=url, supabase_key=key,
    ),
)`}
            />

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 24, color: 'var(--color-accent)' }}>CrewAI</h3>
            <Pre label="Python">{`from shelmem.integrations.crewai import ShelMemStorage
from crewai.memory.short_term.short_term_memory import ShortTermMemory

storage = ShelMemStorage(
    crew_id="my-crew",
    supabase_url=url, supabase_key=key,
)

crew = Crew(
    agents=[...], tasks=[...],
    memory=True,
    short_term_memory=ShortTermMemory(storage=storage),
)`}</Pre>

            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, marginTop: 24, color: 'var(--color-accent)' }}>Vercel AI SDK</h3>
            <Pre label="TypeScript">{`import { createShelMemTools } from '@forestinfra/shelmem';
import { generateText } from 'ai';

const tools = createShelMemTools({
  agentId: 'my-agent',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});

const result = await generateText({
  model: openai('gpt-4o'),
  tools,  // gives the agent memorize + remember tools
  prompt: 'Remember that I prefer dark mode',
});`}</Pre>
          </section>

          {/* Database */}
          <section id="database" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Database Setup</h2>
            <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
              Create a free Supabase project, then run this SQL in the SQL Editor. This creates the memories table with all columns for verification, encryption, and semantic search.
            </p>
            <Pre label="SQL">{`CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  context TEXT NOT NULL,
  memory_preview TEXT,
  shelby_object_id TEXT NOT NULL,
  aptos_tx_hash TEXT,
  content_hash CHAR(64),
  memory_type TEXT DEFAULT 'observation',
  verified BOOLEAN,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memories_agent_id ON memories(agent_id);
CREATE INDEX idx_memories_agent_context ON memories(agent_id, context);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_type ON memories(agent_id, memory_type);
CREATE INDEX idx_memories_embedding ON memories
  USING hnsw (embedding vector_cosine_ops);

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON memories
  FOR ALL USING (true) WITH CHECK (true);`}</Pre>
          </section>

          {/* Architecture */}
          <section id="architecture" style={{ marginBottom: 0 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Architecture</h2>
            <Pre label="Flow">{`Agent  →  ShelMem SDK  →  [SHA-256 hash]  →  [AES-256 encrypt]
                       →  Shelby Protocol (encrypted content)
                       →  Supabase (metadata + embeddings)
                       →  Aptos (on-chain proof)

Recall ←  [verify hash]  ←  [decrypt]  ←  Shelby download
       ←  Supabase metadata query`}</Pre>
            <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
              <Card title="Shelby" desc="Decentralised hot storage. Encrypted content lives here. No single point of failure." />
              <Card title="Supabase" desc="Metadata index + pgvector embeddings. Agent IDs, contexts, content hashes, timestamps." />
              <Card title="Aptos" desc="On-chain anchoring. Every write submits a transaction as cryptographic proof." />
            </div>
          </section>
        </div>
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
            <a href="https://github.com/TaffForest/ShelMem" target="_blank" rel="noopener noreferrer">GitHub</a>
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
        <button onClick={() => setTab('ts')} style={{
          padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: tab === 'ts' ? 'var(--color-bg-surface)' : 'transparent',
          color: tab === 'ts' ? 'var(--color-accent)' : 'var(--color-text-muted)',
          borderBottom: tab === 'ts' ? '2px solid var(--color-accent)' : '2px solid transparent',
        }}>TypeScript</button>
        <button onClick={() => setTab('py')} style={{
          padding: '8px 16px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer',
          background: tab === 'py' ? 'var(--color-bg-surface)' : 'transparent',
          color: tab === 'py' ? 'var(--color-accent)' : 'var(--color-text-muted)',
          borderBottom: tab === 'py' ? '2px solid var(--color-accent)' : '2px solid transparent',
        }}>Python</button>
      </div>
      <pre style={{ padding: '14px 16px', fontSize: 13, lineHeight: 1.7, fontFamily: 'var(--font-mono)', overflowX: 'auto', margin: 0 }}>
        {tab === 'ts' ? ts : py}
      </pre>
    </div>
  );
}

function ApiMethod({ name, signature, description, params, returns }: {
  name: string; signature: string; description: string; params: string[][]; returns: string[][];
}) {
  return (
    <div style={{ marginBottom: 32, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 12, padding: '24px' }}>
      <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: 16, fontWeight: 600, color: 'var(--color-accent)', marginBottom: 6 }}>{signature}</h3>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginBottom: 16, lineHeight: 1.5 }}>{description}</p>
      {params.length > 0 && (<>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Parameters</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
          <tbody>{params.map(([p, type, desc], i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '8px 0', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', width: 140 }}>{p}</td>
              <td style={{ padding: '8px 8px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, width: 180 }}>{type}</td>
              <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>{desc}</td>
            </tr>
          ))}</tbody>
        </table>
      </>)}
      {returns.length > 0 && (<>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Returns</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>{returns.map(([p, type, desc], i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '8px 0', fontFamily: 'var(--font-mono)', color: 'var(--color-text)', width: 140 }}>{p}</td>
              <td style={{ padding: '8px 8px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12, width: 180 }}>{type}</td>
              <td style={{ padding: '8px 0', color: 'var(--color-text-muted)' }}>{desc}</td>
            </tr>
          ))}</tbody>
        </table>
      </>)}
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
