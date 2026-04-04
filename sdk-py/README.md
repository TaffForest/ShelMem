# shelmem

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](../LICENSE)
[![Python](https://img.shields.io/badge/lang-Python-3776ab)](https://python.org)
[![Shelby Testnet](https://img.shields.io/badge/Shelby-Testnet_Live-8BC53F)](https://shelby.xyz)

Decentralised AI agent memory SDK for Python.

Store agent memories on Shelby Protocol's decentralised hot storage with on-chain proof via Aptos.

## Install

```bash
pip install shelmem
```

## Usage

```python
from shelmem import ShelMem

mem = ShelMem(
    supabase_url="https://your-project.supabase.co",
    supabase_key="your-service-role-key",
    shelby_api_key="your-shelby-api-key",        # optional
    aptos_private_key="your-ed25519-private-key", # required when mock=False
    network="testnet",                             # testnet | shelbynet
    mock=True,                                     # default: True
)
```

### write()

Store a memory for an agent. Async method.

```python
result = await mem.write(
    agent_id="agent-001",
    memory="User prefers concise responses",
    context="preferences",
    metadata={"source": "chat"},  # optional
)

print(result.shelby_object_id)  # shelby://...
print(result.aptos_tx_hash)     # 0x...
print(result.timestamp)         # 2025-01-15T10:30:00Z
```

### recall()

Retrieve memories for an agent. Async method.

```python
memories = await mem.recall(
    agent_id="agent-001",
    context="preferences",  # optional
    limit=10,               # optional, default 10
)

for m in memories:
    print(m.memory, m.context, m.timestamp, m.aptos_tx_hash)
```

### delete()

Remove a memory by its Supabase row ID. Synchronous method.

```python
mem.delete("uuid-of-memory-row")
```

## How It Works

1. **write()** encodes the memory to UTF-8 bytes, uploads to Shelby via HTTP gateway, records metadata in Supabase, and returns the Shelby address + Aptos proof
2. **recall()** queries Supabase metadata by agent_id/context, downloads content bytes from Shelby, and returns decoded strings
3. Every write produces a `shelby://` address and an Aptos transaction hash as cryptographic proof

## Mock Mode

By default, `mock=True` generates deterministic hash-based addresses without network calls. Set `mock=False` and provide `aptos_private_key` to write to the live Shelby testnet.

## Environment Variables

The SDK reads these if not passed in the constructor:

| Variable | Description |
|----------|-------------|
| `SHELBY_API_KEY` | Shelby Protocol API key |
| `SHELBY_ACCOUNT_PRIVATE_KEY` | Ed25519 private key for signing |
| `SHELBY_NETWORK` | `testnet` or `shelbynet` |
| `SHELBY_MOCK` | `true` or `false` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/service key |

## Types

```python
@dataclass
class WriteResult:
    shelby_object_id: str
    aptos_tx_hash: str
    timestamp: str

@dataclass
class MemoryRecord:
    memory: str
    context: str
    timestamp: str
    aptos_tx_hash: str
```

## License

MIT
