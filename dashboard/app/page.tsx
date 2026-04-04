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
          Every memory is SHA-256 hashed, stored on Shelby Protocol,<br />
          and anchored on Aptos. If it&apos;s been tampered with, you&apos;ll know.
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
          <span className="badge">On-chain Proof</span>
          <span className="badge">Decentralised</span>
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
        <p className="section-sub">Write memories with proof. Recall with tamper detection.</p>

        <div className="code-showcase">
          <div className="code-showcase-header">
            <span className="code-dot" style={{ background: '#ff5f57' }} />
            <span className="code-dot" style={{ background: '#febc2e' }} />
            <span className="code-dot" style={{ background: '#28c840' }} />
            <span className="code-title">shelmem</span>
          </div>
          <pre className="code-showcase-body">{`import { ShelMem } from '@forestinfra/shelmem';

const mem = new ShelMem({ supabaseUrl, supabaseKey });

// Write — hashed, stored on Shelby, anchored on Aptos
const result = await mem.write(
  'trading-agent',
  'Bought ETH at $2,847. RSI was 28.',
  'market-analysis',
  'decision'
);
// → { content_hash, shelby_object_id, aptos_tx_hash }

// Recall — each memory is verified against its hash
const memories = await mem.recall('trading-agent', 'market-analysis');
// → [{ memory, verified: true, memory_type: 'decision', ... }]`}</pre>
        </div>
      </section>

      {/* Features — 6 cards, no redundancy */}
      <section className="section" id="features">
        <h2 className="section-title">Why ShelMem?</h2>
        <p className="section-sub">The memory layer that proves memories are real.</p>
        <div className="features-grid">
          <div className="feature-card">
            <h3>Tamper-proof verification</h3>
            <p>SHA-256 content hash on every write. On recall, the hash is re-verified. Tampered memories are flagged instantly.</p>
          </div>
          <div className="feature-card">
            <h3>On-chain anchoring</h3>
            <p>Every memory is anchored on Aptos with a transaction hash. Cryptographic proof it existed at that moment.</p>
          </div>
          <div className="feature-card">
            <h3>Decentralised storage</h3>
            <p>Content lives on Shelby Protocol&apos;s distributed hot storage. No single point of failure, no central database to compromise.</p>
          </div>
          <div className="feature-card">
            <h3>Typed memory schemas</h3>
            <p>Categorise memories as facts, decisions, preferences, or observations. Filter on recall by type.</p>
          </div>
          <div className="feature-card">
            <h3>Framework adapters</h3>
            <p>Drop-in integrations for LangChain, CrewAI, and Vercel AI SDK. Works with your existing stack.</p>
          </div>
          <div className="feature-card">
            <h3>TypeScript &amp; Python</h3>
            <p>First-class SDKs for both ecosystems. Same API, same verification, same guarantees.</p>
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
