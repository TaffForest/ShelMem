'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Badge, Card, Text, Heading, Code, Flex, Box } from '@radix-ui/themes';
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
            <Link href="/dashboard">
              <Button size="2" variant="solid" style={{ cursor: 'pointer' }}>Dashboard</Button>
            </Link>
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
        <Heading size="9" weight="bold" style={{ letterSpacing: '-1.5px', lineHeight: 1.15, position: 'relative', textAlign: 'center' }}>
          Tamper-proof memory<br />for <em style={{ fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', color: 'var(--accent-9)' }}>autonomous</em> agents
        </Heading>
        <Text size="4" color="gray" style={{ display: 'block', textAlign: 'center', marginTop: 20, marginBottom: 28, position: 'relative', lineHeight: 1.6 }}>
          Encrypted, verifiable, decentralised. Every memory is hashed,<br />
          stored on Shelby Protocol, and anchored on Aptos.
        </Text>
        <Flex gap="3" justify="center" style={{ marginBottom: 28, position: 'relative' }}>
          <Code size="3" variant="surface" style={{ padding: '10px 20px' }}>npm install @forestinfra/shelmem</Code>
          <Code size="3" variant="ghost" color="gray" style={{ padding: '10px 20px' }}>pip install shelmem</Code>
        </Flex>
        <Flex gap="3" justify="center" style={{ marginBottom: 48, position: 'relative' }}>
          <Link href="/docs"><Button size="3" variant="solid" style={{ cursor: 'pointer' }}>Get Started</Button></Link>
          <Link href="/dashboard"><Button size="3" variant="outline" style={{ cursor: 'pointer' }}>View Dashboard</Button></Link>
        </Flex>
        <Flex gap="2" justify="center" wrap="wrap" style={{ position: 'relative' }}>
          <Badge size="1" variant="surface" color="gray">Tamper-Proof</Badge>
          <Badge size="1" variant="surface" color="gray">AES-256 Encrypted</Badge>
          <Badge size="1" variant="surface" color="gray">Semantic Search</Badge>
          <Badge size="1" variant="surface" color="gray">On-chain Proof</Badge>
          <Badge size="1" variant="surface" color="lime">Testnet Live</Badge>
        </Flex>
      </section>

      {/* Built With */}
      <section className="partners">
        <Text size="2" weight="medium" color="gray" style={{ display: 'block', textAlign: 'center', marginBottom: 32, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Built With</Text>
        <div className="partners-logos">
          <div className="partner-item">
            <div className="partner-mark"><img src="/shelby-logo.svg" alt="Shelby" className="partner-img-shelby" /></div>
            <Text size="1" color="gray">Decentralised Hot Storage</Text>
          </div>
          <div className="partner-item">
            <div className="partner-mark"><img src="/aptos-logo.png" alt="Aptos" className="partner-img-aptos" /></div>
            <Text size="1" color="gray">Layer 1 Blockchain</Text>
          </div>
          <div className="partner-item">
            <div className="partner-mark partner-mark-forest">
              <img src="/forest-icon.png" alt="Forest" className="partner-img-forest" />
              <span className="forest-text">Forest</span>
            </div>
            <Text size="1" color="gray">Infrastructure</Text>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" id="how-it-works">
        <Heading size="7" weight="bold" align="center" style={{ marginBottom: 12 }}>Two calls. Verified memory.</Heading>
        <Text size="3" color="gray" align="center" style={{ display: 'block', marginBottom: 48 }}>Write memories with proof. Recall with tamper detection. Search by meaning.</Text>

        <div className="code-showcase">
          <div className="code-showcase-header">
            <span className="code-dot" style={{ background: '#ff5f57' }} />
            <span className="code-dot" style={{ background: '#febc2e' }} />
            <span className="code-dot" style={{ background: '#28c840' }} />
            <Code size="1" color="gray" variant="ghost">@forestinfra/shelmem</Code>
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

      {/* Features */}
      <section className="section" id="features">
        <Heading size="7" weight="bold" align="center" style={{ marginBottom: 12 }}>Why ShelMem?</Heading>
        <Text size="3" color="gray" align="center" style={{ display: 'block', marginBottom: 48 }}>The memory layer that proves memories are real.</Text>
        <div className="features-grid">
          {[
            { title: 'Tamper-proof verification', desc: 'SHA-256 content hash on every write. On recall, content is re-downloaded and the hash verified. Tampered memories are flagged instantly.' },
            { title: 'AES-256-GCM encryption', desc: 'Opt-in end-to-end encryption. Memories are encrypted before upload to Shelby. Key derived from your Aptos private key — zero additional secrets.' },
            { title: 'Semantic search', desc: 'pgvector embeddings stored alongside memories. Search by meaning with search() — not just exact keyword matching.' },
            { title: 'On-chain anchoring', desc: 'Every memory write submits an Aptos transaction. Cryptographic proof that the memory existed at that exact moment in time.' },
            { title: 'Typed memory schemas', desc: 'Categorise memories as facts, decisions, preferences, or observations. Filter on recall by type for structured agent reasoning.' },
            { title: 'Decentralised storage', desc: "Content lives on Shelby Protocol's distributed hot storage network. No single point of failure, no central database to compromise." },
            { title: 'Framework adapters', desc: 'Drop-in integrations for LangChain, CrewAI, Vercel AI SDK, and Coinbase AgentKit. Works with your existing agent stack.' },
            { title: 'TypeScript & Python', desc: 'Published on npm and PyPI. Same API, same verification, same encryption — both ecosystems, first-class support.' },
          ].map((f, i) => (
            <Card key={i} size="2" variant="surface" style={{ transition: 'border-color 0.15s' }} className="feature-card-radix">
              <Heading size="3" weight="bold" style={{ marginBottom: 8 }}>{f.title}</Heading>
              <Text size="2" color="gray">{f.desc}</Text>
            </Card>
          ))}
        </div>
      </section>

      {/* Frameworks */}
      <section className="partners" id="integrations">
        <Text size="2" weight="medium" color="gray" style={{ display: 'block', textAlign: 'center', marginBottom: 32, opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Works With</Text>
        <div className="partners-logos">
          {[
            { icon: '🦜', name: 'LangChain', desc: 'Chat message history' },
            { icon: '⚙️', name: 'CrewAI', desc: 'Shared crew memory' },
            { icon: '▲', name: 'Vercel AI', desc: 'Agent tools' },
            { icon: '💰', name: 'AgentKit', desc: 'Coinbase wallets' },
          ].map((f, i) => (
            <div key={i} className="partner-item">
              <div className="partner-mark" style={{ height: 45 }}>
                <Text size="7" weight="bold" style={{ color: '#fff', letterSpacing: '-0.03em' }}>{f.icon} {f.name}</Text>
              </div>
              <Text size="1" color="gray">{f.desc}</Text>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <Box style={{ textAlign: 'center', padding: '80px 32px', borderTop: '1px solid var(--gray-4)', borderBottom: '1px solid var(--gray-4)', background: 'var(--gray-2)' }}>
        <Heading size="7" weight="bold" style={{ marginBottom: 12 }}>Ready to give your agents memory?</Heading>
        <Text size="3" color="gray" style={{ display: 'block', marginBottom: 32 }}>Install the SDK, write your first memory, and verify it — in under a minute.</Text>
        <Flex gap="3" justify="center">
          <Link href="/docs"><Button size="4" variant="solid" style={{ cursor: 'pointer' }}>Read the Docs</Button></Link>
          <a href="https://github.com/TaffForest/ShelMem" target="_blank" rel="noopener noreferrer">
            <Button size="4" variant="outline" style={{ cursor: 'pointer' }}>GitHub</Button>
          </a>
        </Flex>
      </Box>

      {/* Footer */}
      <Box style={{ padding: '40px 32px' }}>
        <Flex justify="between" align="center" style={{ maxWidth: 1100, margin: '0 auto' }} wrap="wrap" gap="4">
          <Text size="3" weight="bold">Shel<span style={{ color: 'var(--accent-9)' }}>Mem</span></Text>
          <Flex gap="5">
            <Link href="/docs"><Text size="2" color="gray">Docs</Text></Link>
            <Link href="/dashboard"><Text size="2" color="gray">Dashboard</Text></Link>
            <a href="https://github.com/TaffForest/ShelMem" target="_blank" rel="noopener noreferrer"><Text size="2" color="gray">GitHub</Text></a>
            <a href="https://pypi.org/project/shelmem/" target="_blank" rel="noopener noreferrer"><Text size="2" color="gray">PyPI</Text></a>
            <a href="https://www.npmjs.com/package/@forestinfra/shelmem" target="_blank" rel="noopener noreferrer"><Text size="2" color="gray">npm</Text></a>
          </Flex>
          <Flex gap="5">
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer"><Text size="2" color="gray">Shelby</Text></a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer"><Text size="2" color="gray">Forest</Text></a>
          </Flex>
          <Text size="1" color="gray">&copy; {new Date().getFullYear()} ShelMem — a <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-9)' }}>Forest</a> product.</Text>
        </Flex>
      </Box>
    </div>
  );
}
