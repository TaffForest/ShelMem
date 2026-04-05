'use client';

import { useState } from 'react';
import Link from 'next/link';
import './landing.css';

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  const scrollTo = (id: string) => {
    closeMenu();
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
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works'); }}>How it works</a>
            <Link href="/docs">Docs</Link>
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer">Shelby</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest</a>
            <Link href="/dashboard" className="nav-cta">Dashboard</Link>
          </div>
          <button className="nav-burger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span className={`burger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`burger-line ${menuOpen ? 'open' : ''}`} />
            <span className={`burger-line ${menuOpen ? 'open' : ''}`} />
          </button>
        </div>
        {menuOpen && (
          <div className="nav-mobile-menu">
            <a href="#features" onClick={(e) => { e.preventDefault(); scrollTo('features'); }}>Features</a>
            <a href="#how-it-works" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works'); }}>How it works</a>
            <Link href="/docs" onClick={closeMenu}>Docs</Link>
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>Shelby</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer" onClick={closeMenu}>Forest</a>
            <Link href="/dashboard" className="nav-mobile-cta" onClick={closeMenu}>Dashboard</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <h1>
          Tamper-proof memory<br />for <em>autonomous</em> agents
        </h1>
        <p className="hero-sub">
          Encrypted, verifiable, decentralised. Every memory is hashed,<br />
          stored on Shelby Protocol, and anchored on Aptos.
        </p>
        <div className="hero-install">
          <code className="install-cmd">npm install @forestinfra/shelmem</code>
          <code className="install-cmd install-cmd-alt">pip install shelmem</code>
        </div>
        <div className="hero-actions">
          <Link href="/docs" className="btn-primary">Get Started</Link>
          <Link href="/dashboard" className="btn-secondary">View Dashboard</Link>
        </div>
        <div className="hero-badges">
          <span className="badge">Tamper-Proof</span>
          <span className="badge">AES-256 Encrypted</span>
          <span className="badge">Semantic Search</span>
          <span className="badge">On-chain Proof</span>
          <span className="badge">Testnet Live</span>
        </div>
      </section>

      {/* Built With */}
      <section className="partners">
        <h3 className="partners-label">Built With</h3>
        <div className="partners-logos">
          <div className="partner-item">
            <div className="partner-mark">
              <img src="/shelby-logo.svg" alt="Shelby" className="partner-img-shelby" />
            </div>
            <span>Decentralised Hot Storage</span>
          </div>
          <div className="partner-item">
            <div className="partner-mark">
              <img src="/aptos-logo.png" alt="Aptos" className="partner-img-aptos" />
            </div>
            <span>Layer 1 Blockchain</span>
          </div>
          <div className="partner-item">
            <div className="partner-mark partner-mark-forest">
              <img src="/forest-icon.png" alt="Forest" className="partner-img-forest" />
              <span className="forest-text">Forest</span>
            </div>
            <span>Infrastructure</span>
          </div>
        </div>
      </section>

      {/* How It Works — with code */}
      <section className="section" id="how-it-works">
        <h2 className="section-title">Two calls. Verified memory.</h2>
        <p className="section-sub">Write memories with proof. Recall with tamper detection. Search by meaning.</p>

        <div className="code-showcase">
          <div className="code-showcase-header">
            <span className="code-dot" style={{ background: '#ff5f57' }} />
            <span className="code-dot" style={{ background: '#febc2e' }} />
            <span className="code-dot" style={{ background: '#28c840' }} />
            <span className="code-title">@forestinfra/shelmem</span>
          </div>
          <pre className="code-showcase-body">{`import { ShelMem, openaiEmbeddings } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl, supabaseKey,
  encrypt: true,  // AES-256-GCM encryption
  embeddingProvider: openaiEmbeddings(OPENAI_KEY),  // semantic search
});

// Write — encrypted, hashed, stored on Shelby, anchored on Aptos
await mem.write('agent-01', 'Bought ETH at $2,847', 'analysis', 'decision');

// Recall — decrypted, hash verified, tamper-proof
const memories = await mem.recall('agent-01');
// → [{ memory, verified: true, memory_type: 'decision' }]

// Semantic search — find by meaning, not keywords
const results = await mem.search('what do I know about ETH?');
// → [{ memory_preview, similarity: 0.89 }]`}</pre>
        </div>
      </section>

      {/* Features — 8 cards */}
      <section className="section" id="features">
        <h2 className="section-title">Why ShelMem?</h2>
        <p className="section-sub">The memory layer that proves memories are real.</p>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Tamper-proof verification</h3>
            <p>SHA-256 content hash on every write. On recall, content is re-downloaded and the hash verified. Tampered memories are flagged instantly.</p>
          </div>
          <div className="feature-card">
            <h3>AES-256-GCM encryption</h3>
            <p>Opt-in end-to-end encryption. Memories are encrypted before upload to Shelby. Key derived from your Aptos private key — zero additional secrets.</p>
          </div>
          <div className="feature-card">
            <h3>Semantic search</h3>
            <p>pgvector embeddings stored alongside memories. Search by meaning with <code className="mono">search()</code> — not just exact keyword matching.</p>
          </div>
          <div className="feature-card">
            <h3>On-chain anchoring</h3>
            <p>Every memory write submits an Aptos transaction. Cryptographic proof that the memory existed at that exact moment in time.</p>
          </div>
          <div className="feature-card">
            <h3>Typed memory schemas</h3>
            <p>Categorise memories as facts, decisions, preferences, or observations. Filter on recall by type for structured agent reasoning.</p>
          </div>
          <div className="feature-card">
            <h3>Decentralised storage</h3>
            <p>Content lives on Shelby Protocol&apos;s distributed hot storage network. No single point of failure, no central database to compromise.</p>
          </div>
          <div className="feature-card">
            <h3>Framework adapters</h3>
            <p>Drop-in integrations for LangChain, CrewAI, Vercel AI SDK, and Coinbase AgentKit. Works with your existing agent stack.</p>
          </div>
          <div className="feature-card">
            <h3>TypeScript &amp; Python</h3>
            <p>Published on npm and PyPI. Same API, same verification, same encryption — both ecosystems, first-class support.</p>
          </div>
        </div>
      </section>

      {/* Frameworks */}
      <section className="partners" id="integrations">
        <h3 className="partners-label">Works With</h3>
        <div className="partners-logos">
          <div className="partner-item">
            <div className="partner-mark" style={{ height: 45 }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>🦜 LangChain</span>
            </div>
            <span>Chat message history</span>
          </div>
          <div className="partner-item">
            <div className="partner-mark" style={{ height: 45 }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>⚙️ CrewAI</span>
            </div>
            <span>Shared crew memory</span>
          </div>
          <div className="partner-item">
            <div className="partner-mark" style={{ height: 45 }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>▲ Vercel AI</span>
            </div>
            <span>Agent tools</span>
          </div>
          <div className="partner-item">
            <div className="partner-mark" style={{ height: 45 }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#fff', fontFamily: "'DM Sans', sans-serif", letterSpacing: '-0.03em' }}>💰 AgentKit</span>
            </div>
            <span>Coinbase wallets</span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to give your agents memory?</h2>
        <p>Install the SDK, write your first memory, and verify it — in under a minute.</p>
        <div className="hero-actions" style={{ marginBottom: 0 }}>
          <Link href="/docs" className="btn-primary btn-lg">Read the Docs</Link>
          <a href="https://github.com/TaffForest/ShelMem" target="_blank" rel="noopener noreferrer" className="btn-secondary btn-lg">GitHub</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span>Shel<span className="accent">Mem</span></span>
          </div>
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
          <div className="footer-copy">
            &copy; {new Date().getFullYear()} ShelMem &mdash; a <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest</a> product.
          </div>
        </div>
      </footer>
    </div>
  );
}
