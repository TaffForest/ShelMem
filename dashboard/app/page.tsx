'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import './landing.css';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.7, ease: [0.16, 1, 0.3, 1] as const } }),
};

const stagger = { visible: { transition: { staggerChildren: 0.08 } } };

export default function Landing() {
  return (
    <div style={{ background: '#050505', color: '#f0f0e8' }}>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand">Shel<span className="accent">Mem</span></Link>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#treasury">Treasury</a>
            <a href="#code">How it works</a>
            <Link href="/docs">Docs</Link>
            <Link href="/demo">Try Demo</Link>
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer">Shelby</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest</a>
            <Link href="/dashboard" className="btn-hero btn-hero-primary" style={{ padding: '8px 20px', fontSize: 14 }}>Dashboard</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section">
        <div className="hero-bg">
          <div className="hero-shape hero-shape-1" />
          <div className="hero-shape hero-shape-2" />
          <div className="hero-shape hero-shape-3" />
        </div>

        <motion.div className="hero-content" initial="hidden" animate="visible" variants={stagger}>
          <motion.h1 className="hero-title" variants={fadeUp} custom={0}>
            The memory layer<br />for <span>AI agent payments</span>
          </motion.h1>
          <motion.p className="hero-subtitle" variants={fadeUp} custom={1}>
            Tamper-proof, encrypted agent memory with built-in treasury.<br />
            Record transactions, verify balances, prove what your agent knew.
          </motion.p>
          <motion.div className="hero-install-row" variants={fadeUp} custom={2}>
            <code className="install-pill">npm install @forestinfra/shelmem</code>
            <code className="install-pill install-pill-alt">pip install shelmem</code>
          </motion.div>
          <motion.div className="hero-actions" variants={fadeUp} custom={3}>
            <Link href="/docs" className="btn-hero btn-hero-primary">Get Started</Link>
            <Link href="/dashboard" className="btn-hero btn-hero-ghost">View Dashboard</Link>
          </motion.div>
          <motion.div className="hero-badges" variants={fadeUp} custom={4}>
            <span className="hero-badge">Tamper-Proof</span>
            <span className="hero-badge">AES-256 Encrypted</span>
            <span className="hero-badge">Agent Treasury</span>
            <span className="hero-badge">On-chain Proof</span>
            <span className="hero-badge hero-badge-live">Testnet Live</span>
          </motion.div>
        </motion.div>

        <div className="hero-scroll" />
      </section>

      {/* Partners */}
      <section className="partners-section">
        <div className="partners-inner">
          <div className="partner-logo">
            <div className="partner-mark"><img src="/shelby-logo.svg" alt="Shelby" style={{ height: 44, filter: 'brightness(2)', objectFit: 'contain' }} /></div>
            <span className="partner-label">Hot Storage</span>
          </div>
          <div className="partner-logo">
            <div className="partner-mark"><img src="/aptos-logo.png" alt="Aptos" style={{ height: 44, filter: 'invert(1) brightness(1.5)', objectFit: 'contain' }} /></div>
            <span className="partner-label">Blockchain</span>
          </div>
          <div className="partner-logo">
            <div className="partner-mark" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
              <img src="/forest-icon.png" alt="Forest" style={{ height: 44, objectFit: 'contain' }} />
              <span style={{ fontSize: '3rem', fontWeight: 700, color: '#ffffff', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.06em' }}>Forest</span>
            </div>
            <span className="partner-label">Infrastructure</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features-section" id="features">
        <div className="features-inner">
          <div className="features-header">
            <motion.h2 className="features-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              Why ShelMem?
            </motion.h2>
            <p className="features-sub">Verifiable memory for agents that handle money.</p>
          </div>
          <motion.div className="features-grid" initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-100px' }} variants={stagger}>
            {[
              { title: 'Tamper-proof verification', desc: 'SHA-256 content hash on every write. On recall, content is re-verified against the hash. Tampered memories are flagged instantly — critical for financial records.' },
              { title: 'Agent treasury', desc: 'Record transactions, balance snapshots, and spending policies. Built-in methods for the AI agent payments use case with 365-day retention.' },
              { title: 'AES-256-GCM encryption', desc: 'End-to-end encryption. Memories are encrypted before upload to Shelby. Key derived from your Aptos private key — zero additional secrets.' },
              { title: 'On-chain anchoring', desc: 'Every memory write submits an Aptos transaction. Cryptographic proof that a transaction record or balance existed at that exact moment.' },
              { title: 'Semantic search', desc: 'pgvector embeddings stored alongside memories. Search by meaning — find related transactions or decisions without exact keyword matching.' },
              { title: 'Decentralised storage', desc: "Content lives on Shelby Protocol's distributed hot storage. No single point of failure, no central database to compromise." },
              { title: 'Framework adapters', desc: 'Drop-in integrations for LangChain, CrewAI, Vercel AI SDK, and Coinbase AgentKit. Works with your existing agent stack.' },
              { title: 'TypeScript & Python', desc: 'Published on npm and PyPI. Same API, same verification, same encryption — both ecosystems, first-class support.' },
            ].map((f, i) => (
              <motion.div key={i} className="feature-card" variants={fadeUp} custom={i}>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Treasury */}
      <section className="code-section" id="treasury">
        <div className="code-inner">
          <div className="code-header">
            <motion.h2 className="features-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              Built for agent payments.
            </motion.h2>
            <p className="features-sub">Record transactions, track balances, prove everything on-chain.</p>
          </div>
          <motion.div className="code-block" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="code-block-header">
              <span className="code-block-dot" style={{ background: '#ff5f57' }} />
              <span className="code-block-dot" style={{ background: '#febc2e' }} />
              <span className="code-block-dot" style={{ background: '#28c840' }} />
              <span className="code-block-title">agent treasury</span>
            </div>
            <pre className="code-block-body">{`// Record a payment — tamper-proof, encrypted, on-chain proof
await mem.recordTransaction({
  agentId: 'trading-agent',
  memory: 'Paid 100 APT for compute credits',
  context: 'payments',
  amount: 100,
  currency: 'APT',
  counterparty: '0xvendor...',
});
// → { tx_status: 'pending', content_hash: '...', aptos_tx_hash: '...' }

// Snapshot the balance — verifiable point-in-time record
await mem.recordBalanceSnapshot({
  agentId: 'trading-agent',
  memory: 'End-of-day balance',
  context: 'treasury',
  amount: 4725,
  currency: 'APT',
});

// Check the latest balance
const balance = await mem.getLatestBalance('trading-agent');
// → { amount: 4725, currency: 'APT', verified: true }`}</pre>
          </motion.div>
        </div>
      </section>

      {/* Code */}
      <section className="code-section" id="code">
        <div className="code-inner">
          <div className="code-header">
            <motion.h2 className="features-title" initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              Two calls. Verified.
            </motion.h2>
            <p className="features-sub">Write with proof. Recall with tamper detection. Search by meaning.</p>
          </div>
          <motion.div className="code-block" initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}>
            <div className="code-block-header">
              <span className="code-block-dot" style={{ background: '#ff5f57' }} />
              <span className="code-block-dot" style={{ background: '#febc2e' }} />
              <span className="code-block-dot" style={{ background: '#28c840' }} />
              <span className="code-block-title">@forestinfra/shelmem</span>
            </div>
            <pre className="code-block-body">{`import { ShelMem, openaiEmbeddings } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl, supabaseKey,
  encrypt: true,
  embeddingProvider: openaiEmbeddings(OPENAI_KEY),
});

// Write — encrypted, hashed, stored on Shelby, anchored on Aptos
await mem.write('agent-01', 'Bought ETH at $2,847', 'analysis', 'decision');

// Recall — decrypted, hash verified
const memories = await mem.recall('agent-01');
// → [{ memory, verified: true, memory_type: 'decision' }]

// Semantic search — find by meaning
const results = await mem.search('what do I know about ETH?');
// → [{ memory_preview, similarity: 0.89 }]`}</pre>
          </motion.div>
        </div>
      </section>

      {/* Frameworks */}
      <section className="frameworks-section">
        <div className="frameworks-inner">
          <p className="frameworks-label">Works With</p>
          <div className="frameworks-row">
            {[
              { logo: '/logos/langchain.svg', name: 'LangChain', desc: 'Chat history' },
              { logo: '/logos/crewai.svg', name: 'CrewAI', desc: 'Crew memory' },
              { logo: '/logos/vercel.png', name: 'Vercel AI', desc: 'Agent tools' },
              { logo: '/logos/agentkit.svg', name: 'AgentKit', desc: 'Wallets' },
            ].map((f, i) => (
              <div key={i} className="framework-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={f.logo} alt={f.name} style={{ height: 28, objectFit: 'contain', filter: 'brightness(1.5)' }} />
                  <span className="framework-name">{f.name}</span>
                </div>
                <span className="framework-desc">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2 className="cta-title">Give your agents memory.</h2>
        <p className="cta-sub">Install the SDK, record your first transaction, and verify it — in under a minute.</p>
        <div className="cta-actions">
          <Link href="/docs" className="btn-cta btn-cta-dark">Read the Docs</Link>
          <a href="https://github.com/TaffForest/ShelMem" target="_blank" rel="noopener noreferrer" className="btn-cta btn-cta-outline">GitHub</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-section">
        <div className="footer-inner">
          <span className="footer-brand">Shel<span className="accent">Mem</span></span>
          <div className="footer-links">
            <Link href="/docs">Docs</Link>
            <Link href="/dashboard">Dashboard</Link>
            <a href="https://github.com/TaffForest/ShelMem" target="_blank" rel="noopener noreferrer">GitHub</a>
            <a href="https://pypi.org/project/shelmem/" target="_blank" rel="noopener noreferrer">PyPI</a>
            <a href="https://www.npmjs.com/package/@forestinfra/shelmem" target="_blank" rel="noopener noreferrer">npm</a>
          </div>
          <div className="footer-links">
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer">Shelby</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest</a>
          </div>
          <span className="footer-copy">&copy; {new Date().getFullYear()} ShelMem — a <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest</a> product.</span>
        </div>
      </footer>
    </div>
  );
}
