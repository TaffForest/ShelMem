# ShelMem

Decentralised AI agent memory — powered by Shelby Protocol and Aptos.

ShelMem gives your AI agents persistent, verifiable memory. Every memory is stored on Shelby's decentralised hot storage network and anchored on-chain via Aptos, providing cryptographic proof that a memory existed at a specific moment in time.

## Architecture

```
Agent  →  ShelMem SDK  →  Shelby Protocol (content bytes)
                       →  Supabase (metadata index)
                       →  Aptos (on-chain proof)
```

- **Shelby** owns the memory content (decentralised hot storage)
- **Supabase** owns the metadata (agent_id, context, timestamps, object IDs)
- **Aptos** anchors every write with a transaction hash

## Packages

| Package | Description | Path |
|---------|-------------|------|
| `shelmem` (npm) | TypeScript/JavaScript SDK | `/sdk-ts` |
| `shelmem` (PyPI) | Python SDK | `/sdk-py` |
| Dashboard | Next.js web app | `/dashboard` |

## Quick Start

### 1. Install the SDK

```bash
# TypeScript
npm install shelmem

# Python
pip install shelmem
```

### 2. Write a memory

```typescript
import { ShelMem } from 'shelmem';

const mem = new ShelMem({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_SERVICE_KEY,
  mock: true, // set false for real Shelby network
});

const result = await mem.write(
  'agent-001',
  'User prefers dark mode and concise responses',
  'preferences'
);

console.log(result.shelby_object_id); // shelby://...
console.log(result.aptos_tx_hash);    // 0x...
```

### 3. Recall memories

```typescript
const memories = await mem.recall('agent-001', 'preferences');

for (const m of memories) {
  console.log(m.memory, m.timestamp, m.aptos_tx_hash);
}
```

## Environment Variables

```bash
# Shelby Protocol
SHELBY_API_KEY=your_shelby_api_key
SHELBY_ACCOUNT_PRIVATE_KEY=your_ed25519_private_key
SHELBY_NETWORK=testnet          # testnet | shelbynet
SHELBY_MOCK=true                # true for local dev

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_role_key

# Dashboard
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APTOS_NETWORK=testnet
```

## Database Setup

Run `supabase/schema.sql` in your Supabase SQL Editor to create the `memories` table with indexes and RLS policies.

## Dashboard

The dashboard is a Next.js app at `/dashboard` that lets you:

- Connect your Petra wallet
- Browse all agent memories in a sortable table
- Expand rows to view full memory content
- Verify on-chain proofs via Aptos Explorer links
- Delete memories

```bash
# From the monorepo root
npm run dev:dashboard
```

Open `http://localhost:3000` for the marketing page, `http://localhost:3000/dashboard` for the app.

## Development

```bash
# Install all dependencies
npm install

# Build the TypeScript SDK
npm run build:sdk

# Run the dashboard in dev mode
npm run dev:dashboard
```

## Built With

- [Shelby Protocol](https://shelby.xyz) — Decentralised hot storage
- [Aptos](https://aptos.dev) — Layer 1 blockchain
- [Forest](https://forestinfra.com) — Infrastructure

## License

MIT
