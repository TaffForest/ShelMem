# shelmem

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![TypeScript](https://img.shields.io/badge/lang-TypeScript-3178c6)](https://www.typescriptlang.org/)
[![Shelby Testnet](https://img.shields.io/badge/Shelby-Testnet_Live-8BC53F)](https://shelby.xyz)

Decentralised AI agent memory SDK for TypeScript/JavaScript.

Store agent memories on Shelby Protocol's decentralised hot storage with on-chain proof via Aptos.

## Install

```bash
npm install @forestinfra/shelmem
```

## Usage

```typescript
import { ShelMem } from '@forestinfra/shelmem';

const mem = new ShelMem({
  supabaseUrl: 'https://your-project.supabase.co',
  supabaseKey: 'your-service-role-key',
  shelbyApiKey: 'your-shelby-api-key',       // optional
  aptosPrivateKey: 'your-ed25519-private-key', // required when mock=false
  network: 'testnet',                          // testnet | shelbynet
  mock: true,                                  // default: true
});
```

### write()

Store a memory for an agent.

```typescript
const result = await mem.write(
  'agent-001',           // agent_id
  'User likes dark mode', // memory content
  'preferences',          // context
  { source: 'chat' }     // optional metadata
);

// result:
// {
//   shelby_object_id: 'shelby://abc123/agent-001_1234567890',
//   aptos_tx_hash: '0x...',
//   timestamp: '2025-01-15T10:30:00Z'
// }
```

### recall()

Retrieve memories for an agent, optionally filtered by context.

```typescript
const memories = await mem.recall(
  'agent-001',     // agent_id
  'preferences',   // context (optional)
  10               // limit (optional, default 10)
);

// memories: Array<{
//   memory: string,
//   context: string,
//   timestamp: string,
//   aptos_tx_hash: string
// }>
```

### delete()

Remove a memory by its Supabase row ID.

```typescript
await mem.delete('uuid-of-memory-row');
```

## How It Works

1. **write()** serialises the memory to bytes, uploads to Shelby via `@shelby-protocol/sdk/node`, records metadata in Supabase, and returns the Shelby address + Aptos proof
2. **recall()** queries Supabase metadata by agent_id/context, downloads content bytes from Shelby, and returns decoded strings
3. Every write produces a `shelby://` address (content location) and an Aptos transaction hash (cryptographic proof)

## Mock Mode

By default, `mock: true` uses deterministic hash-based addresses without hitting the real Shelby network. Set `mock: false` and provide `aptosPrivateKey` to write to the live testnet.

## Environment Variables

The SDK reads these if not passed in the constructor:

| Variable | Description |
|----------|-------------|
| `SHELBY_API_KEY` | Shelby Protocol API key |
| `SHELBY_ACCOUNT_PRIVATE_KEY` | Ed25519 private key for signing |
| `SHELBY_NETWORK` | `testnet` or `shelbynet` |
| `SHELBY_MOCK` | `true` or `false` |

## License

MIT
