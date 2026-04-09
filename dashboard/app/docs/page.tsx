'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Box, Flex, Text, Heading, Card, Code, Table, Button, Badge } from '@radix-ui/themes';
import '../landing.css';

const sections = [
  { id: 'quickstart', label: 'Quick Start' },
  { id: 'api', label: 'API Reference' },
  { id: 'treasury', label: 'Agent Treasury' },
  { id: 'encryption', label: 'Encryption' },
  { id: 'search', label: 'Semantic Search' },
  { id: 'config', label: 'Configuration' },
  { id: 'integrations', label: 'Integrations' },
  { id: 'database', label: 'Database Setup' },
  { id: 'architecture', label: 'Architecture' },
];

export default function DocsPage() {
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-inner">
          <Link href="/" className="nav-brand"><span>Shel<span className="accent">Mem</span></span></Link>
          <div className="nav-links">
            <Link href="/docs" style={{ color: 'var(--gray-12)' }}>Docs</Link>
            <a href="https://shelby.xyz" target="_blank" rel="noopener noreferrer">Shelby</a>
            <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer">Forest</a>
            <Link href="/dashboard"><Button size="2" variant="solid" style={{ cursor: 'pointer' }}>Dashboard</Button></Link>
          </div>
        </div>
      </nav>

      <Flex style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Sidebar — hidden on mobile */}
        <Box className="docs-sidebar" style={{ width: 220, minWidth: 220, padding: '32px 0 32px 32px', position: 'sticky', top: 60, height: 'fit-content', alignSelf: 'flex-start' }}>
          <Text size="1" weight="medium" color="gray" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Documentation</Text>
          {sections.map(s => (
            <a key={s.id} href={`#${s.id}`} onClick={(e) => { e.preventDefault(); scrollTo(s.id); }}
              style={{ display: 'block', padding: '8px 0 8px 16px', fontSize: 14, color: 'var(--gray-9)', borderLeft: '2px solid var(--gray-4)', transition: 'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--gray-12)'; e.currentTarget.style.borderColor = 'var(--accent-9)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--gray-9)'; e.currentTarget.style.borderColor = 'var(--gray-4)'; }}>
              {s.label}
            </a>
          ))}
          <Box style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--gray-4)' }}>
            <a href="https://www.npmjs.com/package/@forestinfra/shelmem" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--gray-9)', padding: '4px 0' }}>npm</a>
            <a href="https://pypi.org/project/shelmem/" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--gray-9)', padding: '4px 0' }}>PyPI</a>
            <a href="https://github.com/TaffForest/ShelMem" target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: 'var(--gray-9)', padding: '4px 0' }}>GitHub</a>
          </Box>
        </Box>

        {/* Content */}
        <Box style={{ flex: 1, padding: '48px 32px 80px', maxWidth: 820 }}>
          <Heading size="8" weight="bold" style={{ marginBottom: 8 }}>Documentation</Heading>
          <Text size="4" color="gray" style={{ display: 'block', marginBottom: 48 }}>Tamper-proof, encrypted, searchable memory for AI agents.</Text>

          {/* Quick Start */}
          <section id="quickstart" style={{ marginBottom: 56 }}>
            <Heading size="6" weight="bold" mb="4">Quick Start</Heading>
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', marginBottom: 12 }}>1. Install</Text>
            <Flex gap="3" mb="5">
              <Pre label="TypeScript">{`npm install @forestinfra/shelmem`}</Pre>
              <Pre label="Python">{`pip install shelmem`}</Pre>
            </Flex>
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', marginBottom: 12 }}>2. Initialise</Text>
            <Tabs
              ts={`import { ShelMem, openaiEmbeddings } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  encrypt: true,
  embeddingProvider: openaiEmbeddings(OPENAI_KEY),
});`}
              py={`from shelmem import ShelMem, openai_embeddings

mem = ShelMem(
    supabase_url="https://your-project.supabase.co",
    supabase_key="your-key",
    encrypt=True,
    embedding_provider=openai_embeddings(OPENAI_KEY),
)`}
            />
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', margin: '24px 0 12px' }}>3. Write a memory</Text>
            <Tabs
              ts={`const result = await mem.write(
  'agent-001', 'User prefers dark mode', 'preferences', 'preference'
);
// → { content_hash, shelby_object_id, aptos_tx_hash }`}
              py={`result = await mem.write(
    "agent-001", "User prefers dark mode", "preferences", "preference"
)
# → WriteResult(content_hash, shelby_object_id, aptos_tx_hash)`}
            />
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', margin: '24px 0 12px' }}>4. Recall + verify</Text>
            <Tabs
              ts={`const memories = await mem.recall('agent-001', 'preferences');
for (const m of memories) {
  console.log(m.memory, m.verified); // true | false | null
}`}
              py={`memories = await mem.recall("agent-001", context="preferences")
for m in memories:
    print(m.memory, m.verified)  # True | False | None`}
            />
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', margin: '24px 0 12px' }}>5. Semantic search</Text>
            <Tabs
              ts={`const results = await mem.search('what does the user prefer?');
// → [{ memory_preview, similarity: 0.91 }]`}
              py={`results = await mem.search("what does the user prefer?")
# → [SearchResult(memory_preview, similarity=0.91)]`}
            />
          </section>

          {/* API Reference */}
          <section id="api" style={{ marginBottom: 56 }}>
            <Heading size="6" weight="bold" mb="5">API Reference</Heading>
            <ApiMethod name="write" signature="write(agent_id, memory, context, memory_type?, metadata?, treasury?)" description="Store a memory on Shelby. Content is SHA-256 hashed, optionally encrypted, and embedding stored if provider configured. Treasury fields (amount, currency, counterparty, tx_status) can be passed for financial records."
              params={[['agent_id','string','Agent identifier'],['memory','string','Content to store'],['context','string','Category label'],['memory_type','MemoryType?',"'fact'|'decision'|'preference'|'observation'|'transaction_record'|'balance_snapshot'|'spending_policy'"],['metadata','object?','Key-value metadata'],['treasury','TreasuryFields?','{ amount?, currency?, counterparty?, tx_status? }']]}
              returns={[['shelby_object_id','string','Shelby address'],['aptos_tx_hash','string','On-chain tx hash'],['content_hash','string','SHA-256 of plaintext'],['memory_type','string','Type stored'],['timestamp','string','ISO 8601'],['amount','number?','Transaction amount'],['currency','string?','Currency (APT, USDT, etc)']]}
            />
            <ApiMethod name="recall" signature="recall(agent_id, context?, limit?, memory_type?)" description="Retrieve memories. Each is decrypted and verified against its stored content hash."
              params={[['agent_id','string','Agent to query'],['context','string?','Filter by context'],['limit','number?','Max results (default 10)'],['memory_type','MemoryType?','Filter by type']]}
              returns={[['memory','string','Content (decrypted)'],['verified','boolean|null','true=authentic, false=tampered'],['memory_type','string','Memory type'],['content_hash','string','SHA-256 hash'],['timestamp','string','ISO 8601']]}
            />
            <ApiMethod name="search" signature="search(query, agent_id?, limit?, threshold?)" description="Semantic search by meaning using vector similarity. Requires embeddingProvider."
              params={[['query','string','Natural language query'],['agent_id','string?','Filter to agent'],['limit','number?','Max results (default 10)'],['threshold','number?','Min similarity 0-1']]}
              returns={[['memory_preview','string','First 200 chars'],['similarity','number','Cosine similarity'],['memory_type','string','Type'],['agent_id','string','Agent']]}
            />
            <ApiMethod name="verify" signature="verify(id)" description="Re-download from Shelby, decrypt, and verify content hash."
              params={[['id','string','Memory UUID']]}
              returns={[['verified','boolean','Hash matches'],['content_hash','string','Actual hash'],['expected_hash','string','Stored hash']]}
            />
            <ApiMethod name="delete" signature="delete(id)" description="Remove a memory from Supabase and attempt Shelby blob deletion." params={[['id','string','Memory UUID']]} returns={[]} />
            <ApiMethod name="recordTransaction" signature="recordTransaction(params)" description="Convenience wrapper for write(). Sets memory_type='transaction_record', defaults tx_status to 'pending'. Treasury records get 365-day Shelby expiry."
              params={[['agentId','string','Agent identifier'],['memory','string','Description of the transaction'],['context','string','Category label'],['amount','number','Transaction amount'],['currency','string','Currency (APT, USDT, etc)'],['counterparty','string','Wallet address of payer/payee'],['txStatus','string?',"'pending' (default) | 'confirmed' | 'failed'"]]}
              returns={[['shelby_object_id','string','Shelby address'],['content_hash','string','SHA-256 hash'],['amount','number','Amount'],['currency','string','Currency'],['tx_status','string','Status']]}
            />
            <ApiMethod name="recordBalanceSnapshot" signature="recordBalanceSnapshot(params)" description="Convenience wrapper for write(). Sets memory_type='balance_snapshot'. Records a point-in-time balance."
              params={[['agentId','string','Agent identifier'],['memory','string','Balance description'],['context','string','Category label'],['amount','number','Balance amount'],['currency','string','Currency']]}
              returns={[['shelby_object_id','string','Shelby address'],['amount','number','Balance amount'],['currency','string','Currency']]}
            />
            <ApiMethod name="getLatestBalance" signature="getLatestBalance(agentId)" description="Returns the most recent balance_snapshot for an agent, or null if none exist."
              params={[['agentId','string','Agent identifier']]}
              returns={[['memory','string','Balance description'],['amount','number','Balance amount'],['currency','string','Currency'],['timestamp','string','When recorded']]}
            />
          </section>

          {/* Agent Treasury */}
          <section id="treasury" style={{ marginBottom: 56 }}>
            <Heading size="6" weight="bold" mb="4">Agent Treasury</Heading>
            <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16, lineHeight: 1.6 }}>
              ShelMem includes treasury memory types for AI agent payments. Agents can record transactions, balance snapshots, and spending policies as tamper-proof, verifiable memories. Treasury records get 365-day Shelby expiry (vs 30 days for standard memories).
            </Text>
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', marginBottom: 12 }}>Record a transaction</Text>
            <Tabs
              ts={`await mem.recordTransaction({
  agentId: 'trading-agent',
  memory: 'Paid 100 APT for API access',
  context: 'payments',
  amount: 100,
  currency: 'APT',
  counterparty: '0xmerchant...',
});
// → { memory_type: 'transaction_record', tx_status: 'pending', ... }`}
              py={`await mem.record_transaction(RecordTransactionParams(
    agent_id="trading-agent",
    memory="Paid 100 APT for API access",
    context="payments",
    amount=100,
    currency="APT",
    counterparty="0xmerchant...",
))
# → WriteResult(memory_type='transaction_record', tx_status='pending')`}
            />
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', margin: '24px 0 12px' }}>Record a balance snapshot</Text>
            <Tabs
              ts={`await mem.recordBalanceSnapshot({
  agentId: 'trading-agent',
  memory: 'End-of-day balance',
  context: 'treasury',
  amount: 4725,
  currency: 'APT',
});`}
              py={`await mem.record_balance_snapshot(RecordBalanceParams(
    agent_id="trading-agent",
    memory="End-of-day balance",
    context="treasury",
    amount=4725,
    currency="APT",
))`}
            />
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', margin: '24px 0 12px' }}>Get latest balance</Text>
            <Tabs
              ts={`const balance = await mem.getLatestBalance('trading-agent');
// → { amount: 4725, currency: 'APT', memory_type: 'balance_snapshot' }
// → null if no balance snapshots exist`}
              py={`balance = await mem.get_latest_balance("trading-agent")
# → MemoryRecord(amount=4725, currency="APT") or None`}
            />
            <Card size="1" variant="surface" mt="3">
              <Text size="2" color="gray"><strong style={{ color: 'var(--gray-12)' }}>Memory types:</strong> <Code size="1" variant="ghost">transaction_record</Code> · <Code size="1" variant="ghost">balance_snapshot</Code> · <Code size="1" variant="ghost">spending_policy</Code></Text><br/>
              <Text size="2" color="gray"><strong style={{ color: 'var(--gray-12)' }}>tx_status values:</strong> <Code size="1" variant="ghost">pending</Code> · <Code size="1" variant="ghost">confirmed</Code> · <Code size="1" variant="ghost">failed</Code></Text><br/>
              <Text size="2" color="gray"><strong style={{ color: 'var(--gray-12)' }}>Shelby expiry:</strong> 365 days (vs 30 days for standard memories)</Text>
            </Card>
          </section>

          {/* Encryption */}
          <section id="encryption" style={{ marginBottom: 56 }}>
            <Heading size="6" weight="bold" mb="4">Encryption</Heading>
            <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16, lineHeight: 1.6 }}>
              AES-256-GCM encryption. Key derived from your Aptos private key via HMAC-SHA256. Content hashes are computed on plaintext before encryption so tamper verification still works.
            </Text>
            <Tabs
              ts={`const mem = new ShelMem({
  supabaseUrl, supabaseKey,
  aptosPrivateKey: '0x...',
  encrypt: true,
});
// Write encrypted, recall decrypted, hash verified on plaintext`}
              py={`mem = ShelMem(
    supabase_url=url, supabase_key=key,
    aptos_private_key="0x...",
    encrypt=True,
)`}
            />
            <Card size="1" variant="surface" mt="3">
              <Text size="2" color="gray"><Code size="1" variant="ghost">Format: [IV 12B] [AuthTag 16B] [Ciphertext]</Code></Text><br/>
              <Text size="2" color="gray"><Code size="1" variant="ghost">Key: HMAC-SHA256(privkey, &quot;ShelMem-v1&quot;)</Code></Text><br/>
              <Text size="2" color="gray"><Code size="1" variant="ghost">Algo: AES-256-GCM, random 96-bit IV per write</Code></Text>
            </Card>
          </section>

          {/* Semantic Search */}
          <section id="search" style={{ marginBottom: 56 }}>
            <Heading size="6" weight="bold" mb="4">Semantic Search</Heading>
            <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16, lineHeight: 1.6 }}>
              pgvector embeddings stored alongside memories. Search by meaning, not keywords. Provider is pluggable — OpenAI included, any 1536-dim vector function works.
            </Text>
            <Tabs
              ts={`import { ShelMem, openaiEmbeddings } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl, supabaseKey,
  embeddingProvider: openaiEmbeddings(process.env.OPENAI_API_KEY),
});

await mem.write('agent', 'ETH RSI is 28', 'analysis', 'observation');
const results = await mem.search('ethereum price?', 'agent');
// → [{ memory_preview: 'ETH RSI is 28', similarity: 0.87 }]`}
              py={`from shelmem import ShelMem, openai_embeddings

mem = ShelMem(
    supabase_url=url, supabase_key=key,
    embedding_provider=openai_embeddings(OPENAI_KEY),
)
results = await mem.search("ethereum price?", "agent")`}
            />
          </section>

          {/* Config */}
          <section id="config" style={{ marginBottom: 56 }}>
            <Heading size="6" weight="bold" mb="4">Configuration</Heading>
            <Table.Root size="1" variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Option</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Required</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {[
                  ['supabaseUrl','Yes','Supabase project URL'],
                  ['supabaseKey','Yes','Supabase API key'],
                  ['aptosPrivateKey','When encrypt=true','Ed25519 private key'],
                  ['encrypt','No','Enable AES-256-GCM (default false)'],
                  ['embeddingProvider','No','Function for semantic search'],
                  ['network','No','testnet (default) or shelbynet'],
                  ['mock','No','true (default) for local dev'],
                ].map(([opt,req,desc], i) => (
                  <Table.Row key={i}>
                    <Table.Cell><Code size="1" color="lime">{opt}</Code></Table.Cell>
                    <Table.Cell><Text size="1" color="gray">{req}</Text></Table.Cell>
                    <Table.Cell><Text size="1" color="gray">{desc}</Text></Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </section>

          {/* Integrations */}
          <section id="integrations" style={{ marginBottom: 56 }}>
            <Heading size="6" weight="bold" mb="4">Integrations</Heading>
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', marginBottom: 12 }}>LangChain</Text>
            <Pre label="Python">{`from shelmem.integrations.langchain import ShelMemChatMessageHistory

history = ShelMemChatMessageHistory(
    session_id="user-123", agent_id="my-chatbot",
    supabase_url=url, supabase_key=key,
)

from langchain_core.runnables.history import RunnableWithMessageHistory
chain_with_history = RunnableWithMessageHistory(chain, lambda sid: history)`}</Pre>
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', margin: '24px 0 12px' }}>CrewAI</Text>
            <Pre label="Python">{`from shelmem.integrations.crewai import ShelMemStorage
crew = Crew(
    agents=[...], tasks=[...], memory=True,
    short_term_memory=ShortTermMemory(storage=ShelMemStorage(
        crew_id="my-crew", supabase_url=url, supabase_key=key,
    )),
)`}</Pre>
            <Text size="3" weight="medium" color="lime" style={{ display: 'block', margin: '24px 0 12px' }}>Vercel AI SDK</Text>
            <Pre label="TypeScript">{`import { createShelMemTools } from '@forestinfra/shelmem';
const tools = createShelMemTools({
  agentId: 'my-agent',
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});
// gives agents memorize + remember tools`}</Pre>
          </section>

          {/* Database */}
          <section id="database" style={{ marginBottom: 56 }}>
            <Heading size="6" weight="bold" mb="4">Database Setup</Heading>
            <Text size="2" color="gray" style={{ display: 'block', marginBottom: 16, lineHeight: 1.6 }}>Create a Supabase project, then run this SQL:</Text>
            <Pre label="SQL">{`CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS memories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL, context TEXT NOT NULL,
  memory_preview TEXT, shelby_object_id TEXT NOT NULL,
  aptos_tx_hash TEXT, content_hash CHAR(64),
  memory_type TEXT DEFAULT 'observation',
  verified BOOLEAN, embedding vector(1536),
  amount NUMERIC, currency TEXT,
  counterparty TEXT, tx_status TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_memories_agent_id ON memories(agent_id);
CREATE INDEX idx_memories_agent_context ON memories(agent_id, context);
CREATE INDEX idx_memories_created_at ON memories(created_at DESC);
CREATE INDEX idx_memories_type ON memories(agent_id, memory_type);
CREATE INDEX idx_memories_embedding ON memories USING hnsw (embedding vector_cosine_ops);
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON memories FOR ALL USING (true) WITH CHECK (true);`}</Pre>
          </section>

          {/* Architecture */}
          <section id="architecture">
            <Heading size="6" weight="bold" mb="4">Architecture</Heading>
            <Pre label="Flow">{`Agent → ShelMem SDK → [SHA-256 hash] → [AES-256 encrypt]
                    → Shelby Protocol (encrypted content)
                    → Supabase (metadata + embeddings)
                    → Aptos (on-chain proof)

Recall ← [verify hash] ← [decrypt] ← Shelby download
       ← Supabase metadata query`}</Pre>
            <Flex gap="3" mt="4">
              <Card size="2" variant="surface" style={{ flex: 1 }}><Heading size="3" mb="1">Shelby</Heading><Text size="2" color="gray">Decentralised hot storage. Encrypted content lives here.</Text></Card>
              <Card size="2" variant="surface" style={{ flex: 1 }}><Heading size="3" mb="1">Supabase</Heading><Text size="2" color="gray">Metadata + pgvector embeddings. Agent IDs, hashes, timestamps.</Text></Card>
              <Card size="2" variant="surface" style={{ flex: 1 }}><Heading size="3" mb="1">Aptos</Heading><Text size="2" color="gray">On-chain anchoring. Every write submits a transaction as proof.</Text></Card>
            </Flex>
          </section>
        </Box>
      </Flex>

      {/* Footer */}
      <Box style={{ padding: '32px', borderTop: '1px solid var(--gray-4)', textAlign: 'center' }}>
        <Text size="1" color="gray">&copy; {new Date().getFullYear()} ShelMem — a <a href="https://forestinfra.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-9)' }}>Forest</a> product.</Text>
      </Box>
    </div>
  );
}

/* Sub-components */
function Pre({ label, children }: { label: string; children: string }) {
  return (
    <Card size="1" variant="surface" style={{ overflow: 'hidden', flex: 1 }}>
      <Text size="1" color="gray" weight="medium" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</Text>
      <pre style={{ fontSize: 13, lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace", overflowX: 'auto', margin: 0 }}>{children}</pre>
    </Card>
  );
}

function Tabs({ ts, py }: { ts: string; py: string }) {
  const [tab, setTab] = useState<'ts' | 'py'>('ts');
  return (
    <Card size="1" variant="surface" style={{ overflow: 'hidden' }}>
      <Flex gap="0" mb="2" style={{ borderBottom: '1px solid var(--gray-4)' }}>
        <button onClick={() => setTab('ts')} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === 'ts' ? 'var(--gray-3)' : 'transparent', color: tab === 'ts' ? 'var(--accent-9)' : 'var(--gray-9)', borderBottom: tab === 'ts' ? '2px solid var(--accent-9)' : '2px solid transparent' }}>TypeScript</button>
        <button onClick={() => setTab('py')} style={{ padding: '6px 14px', fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', background: tab === 'py' ? 'var(--gray-3)' : 'transparent', color: tab === 'py' ? 'var(--accent-9)' : 'var(--gray-9)', borderBottom: tab === 'py' ? '2px solid var(--accent-9)' : '2px solid transparent' }}>Python</button>
      </Flex>
      <pre style={{ fontSize: 13, lineHeight: 1.7, fontFamily: "'JetBrains Mono', monospace", overflowX: 'auto', margin: 0 }}>{tab === 'ts' ? ts : py}</pre>
    </Card>
  );
}

function ApiMethod({ name, signature, description, params, returns }: { name: string; signature: string; description: string; params: string[][]; returns: string[][] }) {
  return (
    <Card size="2" variant="surface" mb="4">
      <Code size="3" color="lime" weight="bold">{signature}</Code>
      <Text size="2" color="gray" style={{ display: 'block', margin: '8px 0 16px', lineHeight: 1.5 }}>{description}</Text>
      {params.length > 0 && (<>
        <Text size="1" weight="medium" color="gray" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Parameters</Text>
        <Table.Root size="1" variant="ghost" style={{ marginBottom: 16 }}>
          <Table.Body>{params.map(([p,t,d],i) => (
            <Table.Row key={i}><Table.Cell width="130"><Code size="1">{p}</Code></Table.Cell><Table.Cell width="160"><Text size="1" color="gray">{t}</Text></Table.Cell><Table.Cell><Text size="1" color="gray">{d}</Text></Table.Cell></Table.Row>
          ))}</Table.Body>
        </Table.Root>
      </>)}
      {returns.length > 0 && (<>
        <Text size="1" weight="medium" color="gray" style={{ display: 'block', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Returns</Text>
        <Table.Root size="1" variant="ghost">
          <Table.Body>{returns.map(([p,t,d],i) => (
            <Table.Row key={i}><Table.Cell width="130"><Code size="1">{p}</Code></Table.Cell><Table.Cell width="160"><Text size="1" color="gray">{t}</Text></Table.Cell><Table.Cell><Text size="1" color="gray">{d}</Text></Table.Cell></Table.Row>
          ))}</Table.Body>
        </Table.Root>
      </>)}
    </Card>
  );
}
