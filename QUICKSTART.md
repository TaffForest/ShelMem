# ShelMem Quickstart

Get tamper-proof agent memory running in 5 minutes.

## 1. Install

```bash
npm install @forestinfra/shelmem
```

## 2. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project, then run this SQL in the SQL Editor:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

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

ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON memories FOR ALL USING (true) WITH CHECK (true);
```

## 3. Write your first memory

```typescript
import { ShelMem } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
});

// Write a memory
const result = await mem.write(
  'my-agent',
  'User prefers dark mode and concise responses',
  'preferences',
  'preference'
);

console.log('Stored:', result.shelby_object_id);
console.log('Hash:', result.content_hash);
```

## 4. Recall memories

```typescript
const memories = await mem.recall('my-agent', 'preferences');

for (const m of memories) {
  console.log(m.memory, m.memory_type, m.verified);
}
```

## 5. Search by meaning (optional)

Add an OpenAI key for semantic search:

```typescript
import { ShelMem, openaiEmbeddings } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
  embeddingProvider: openaiEmbeddings('sk-...'),
});

const results = await mem.search('what does the user prefer?');
// → [{ memory_preview: 'User prefers dark mode...', similarity: 0.91 }]
```

## 6. Enable encryption (optional)

```typescript
const mem = new ShelMem({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-anon-key',
  aptosPrivateKey: '0x...',
  encrypt: true, // AES-256-GCM, key derived from your Aptos key
});
```

## Python

```bash
pip install shelmem
```

```python
from shelmem import ShelMem

mem = ShelMem(
    supabase_url="https://your-project.supabase.co",
    supabase_key="your-anon-key",
)

result = await mem.write("my-agent", "User likes dark mode", "preferences", "preference")
memories = await mem.recall("my-agent")
```

## What's next

- [Full docs](/docs) — API reference, framework integrations, architecture
- [Dashboard](/dashboard) — connect wallet, browse memories, verify proofs
- [GitHub](https://github.com/TaffForest/ShelMem) — source code, issues, contributions
