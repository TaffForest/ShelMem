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
            <Link href="/dashboard" className="nav-cta">Launch App</Link>
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
            <Link href="/dashboard" className="nav-mobile-cta" onClick={closeMenu}>Launch App</Link>
          </div>
        )}
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero-glow" />
        <h1>
          Give your AI agents<br /><em>decentralised</em> memory
        </h1>
        <p className="hero-sub">
          Write, recall, and verify agent memories on-chain.<br />
          Powered by Shelby Protocol and anchored on Aptos.
        </p>
        <div className="hero-actions">
          <Link href="/dashboard" className="btn-primary">Launch Dashboard</Link>
          <a href="#how-it-works" className="btn-secondary" onClick={(e) => { e.preventDefault(); scrollTo('how-it-works'); }}>Learn more</a>
        </div>
        <div className="hero-badges">
          <span className="badge">On-chain Proof</span>
          <span className="badge">Decentralised Storage</span>
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

      {/* How It Works */}
      <section className="section" id="how-it-works">
        <h2 className="section-title">How it works</h2>
        <p className="section-sub">Two SDK calls. Cryptographic proof.</p>
        <div className="steps">
          <div className="step">
            <div className="step-num">1</div>
            <h3>Write a memory</h3>
            <p>Your agent calls <code className="mono">write()</code> with context and content. It&apos;s stored on Shelby and anchored on Aptos.</p>
          </div>
          <div className="step">
            <div className="step-num">2</div>
            <h3>Recall later</h3>
            <p>Call <code className="mono">recall()</code> to retrieve memories by agent ID and context. Ordered by time, always fresh.</p>
          </div>
          <div className="step">
            <div className="step-num">3</div>
            <h3>Verify on-chain</h3>
            <p>Every memory has an Aptos transaction hash. Cryptographic proof that the memory existed at that moment.</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="section" id="features">
        <h2 className="section-title">Why ShelMem?</h2>
        <p className="section-sub">Decentralised memory for autonomous agents.</p>
        <div className="features-grid">
          <div className="feature-card">
            <h3>On-chain anchoring</h3>
            <p>Every memory write is recorded on Aptos. Immutable, timestamped, verifiable.</p>
          </div>
          <div className="feature-card">
            <h3>Decentralised storage</h3>
            <p>Memory content lives on Shelby Protocol&apos;s distributed hot storage network. No single point of failure.</p>
          </div>
          <div className="feature-card">
            <h3>TypeScript &amp; Python SDKs</h3>
            <p>First-class SDKs for both ecosystems. Two lines to write, one line to recall.</p>
          </div>
          <div className="feature-card">
            <h3>Context-aware recall</h3>
            <p>Filter memories by agent ID and context. Your agents remember what matters.</p>
          </div>
          <div className="feature-card">
            <h3>Dashboard included</h3>
            <p>Connect your wallet, browse all memories, verify proofs, and manage agents from one UI.</p>
          </div>
          <div className="feature-card">
            <h3>Testnet ready</h3>
            <p>Free on Shelby testnet. Start building today, migrate to mainnet when ready.</p>
          </div>
        </div>
      </section>

      {/* Agent Stack */}
      <section className="section" id="agent-stack">
        <h2 className="section-title">Agents need more than a wallet</h2>
        <p className="section-sub">
          Coinbase gives agents money. ShelMem gives agents memory.<br />
          Together, agents that can pay <em style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-accent)' }}>and</em> remember.
        </p>

        <div className="compare-grid" style={{ maxWidth: 900, margin: '0 auto 48px' }}>
          <div className="stack-card">
            <div className="stack-header">
              <span className="stack-icon">💰</span>
              Financial Layer
            </div>
            <div className="stack-provider">Coinbase AgentKit</div>
            <ul className="stack-list">
              <li>Agentic Wallets</li>
              <li>x402 payments</li>
              <li>Trade, send, earn skills</li>
              <li>Transaction proof on Base</li>
            </ul>
          </div>
          <div className="stack-card stack-card-highlight">
            <div className="stack-header">
              <span className="stack-icon">🧠</span>
              Memory Layer
            </div>
            <div className="stack-provider">ShelMem</div>
            <ul className="stack-list">
              <li>Persistent agent memory</li>
              <li>Decentralised on Shelby</li>
              <li>Context-aware recall</li>
              <li>Cryptographic proof on Aptos</li>
            </ul>
          </div>
        </div>

        <div className="code-showcase">
          <div className="code-showcase-header">
            <span className="code-dot" style={{ background: '#ff5f57' }} />
            <span className="code-dot" style={{ background: '#febc2e' }} />
            <span className="code-dot" style={{ background: '#28c840' }} />
            <span className="code-title">AgentKit + ShelMem</span>
          </div>
          <pre className="code-showcase-body">{`// Agent remembers past decisions before trading
const history = await memory.recall('trading-agent', 'market-analysis');

// Agent executes a trade via Coinbase AgentKit
const tx = await wallet.trade({ from: 'USDC', to: 'ETH', amount: '100' });

// Agent writes the decision + reasoning to decentralised memory
await memory.write(
  'trading-agent',
  \`Bought ETH at $2,847. RSI was 28. Tx: \${tx.hash}\`,
  'market-analysis'
);
// → anchored on Aptos with cryptographic proof`}</pre>
        </div>

        <div className="use-cases">
          <div className="use-case">
            <h4>Trading with context</h4>
            <p>Agents remember past market conditions and user risk preferences across sessions.</p>
          </div>
          <div className="use-case">
            <h4>Verifiable audit trails</h4>
            <p>Cryptographic proof of what an agent knew when it spent money — crucial for compliance.</p>
          </div>
          <div className="use-case">
            <h4>Multi-agent swarms</h4>
            <p>Trading, monitoring, and reporting agents share memory via the same context namespace.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Ready to give your agents memory?</h2>
        <p>Install the SDK and write your first memory in under a minute.</p>
        <Link href="/dashboard" className="btn-primary btn-lg">Launch Dashboard</Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <span>Shel<span className="accent">Mem</span></span>
          </div>
          <div className="footer-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <Link href="/docs">Docs</Link>
            <Link href="/dashboard">Dashboard</Link>
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
