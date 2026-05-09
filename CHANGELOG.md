# Changelog

All notable changes to ShelMem are documented here. The TypeScript SDK
(`@forestinfra/shelmem` on npm) and Python SDK (`shelmem` on PyPI) are
versioned together.

## [0.3.0] — 2026-05-09

The coordination layer for multi-agent systems. Introduces shared memory
pools, per-memory ACLs, audit logging, semantic search inside pools, and
optional cryptographic agent identity.

### Added

#### Shared memory pools
- `createPool({ name, ownerAgentId, description?, metadata? })`
- `getPool(poolId, callerAgentId)` — member-gated
- `listPools(agentId)` — pools the agent is a member of
- `deletePool(poolId, callerAgentId)` — owner-only
- `transferPool(poolId, callerAgentId, newOwnerAgentId)` — owner-only;
  promotes target to `owner`, demotes caller to `writer`
- `addPoolMember(poolId, callerAgentId, targetAgentId, role)` — owner-only
- `removePoolMember(poolId, callerAgentId, targetAgentId)` — owner-only
- `listPoolMembers(poolId, callerAgentId)` — member-gated
- `writeToPool({ poolId, agentId, memory, ... })` — owner or writer
- `recallFromPool({ poolId, agentId, ... })` — any member
- `searchPool({ poolId, agentId, query, ... })` — pool-scoped pgvector
  search; requires `embeddingProvider` in config

#### Per-memory ACLs
- `write(..., sharedWith?: string[])` — declare which agents can read this
  specific memory regardless of pool membership
- `recallShared(agentId, ...)` — read memories explicitly shared via the
  `shared_with` ACL

#### Pool audit log
- Every `writeToPool` / `recallFromPool` / `searchPool` call writes a row
  to `pool_access_log`. Reads record `result_count`; writes record the new
  `memory_id`. Best-effort — never blocks the underlying call.
- `getPoolAuditLog(poolId, callerAgentId, limit?)` — owner-only

#### Cryptographic agent identity (opt-in)
- `signAgentClaim(agentId, privateKey)` — Ed25519 sign helper using the
  agent's Aptos key
- `verifyAgentClaim(claim, expectedAgentId, expectedPublicKey, maxAgeSeconds?)`
- New `ShelMemConfig` options:
  - `agentRegistry: Record<agent_id, publicKey>` — registry of expected keys
  - `verifySignatures: boolean` — when `true`, every pool method requires
    `claim?: AgentClaim` and the SDK rejects calls with mismatched or
    expired signatures
- New `AgentClaimError` exported from both SDKs
- `PermissionError` exported (was already thrown but not exposed)

#### Schema
- `supabase/migration-v5.sql` — `memory_pools`, `pool_members` tables
  (owner/writer/reader role check), nullable `memories.pool_id`
- `supabase/migration-v6.sql` — `memories.shared_with TEXT[]`,
  `pool_access_log` table, `match_pool_memories` pgvector RPC
- Auto-add-owner trigger on pool creation
- Existing private memories are unaffected

#### Dashboard
- New `/dashboard/pools` page with full member CRUD: create pool, add /
  remove members with role selection, transfer ownership, delete pool
- Unified `[ Memories ] [ Pools ] [ Treasury ]` tabbed nav across all three
  dashboard pages
- `POOL` chip on memory rows that belong to a shared pool; "Pool memories"
  filter on the main memory table
- `viewerAgentId` input — owner-only actions only show when the viewer
  is the pool owner

#### Tooling
- GitHub Actions CI: TS test/build, Python test, dashboard build on every
  PR and push to `main`
- `npm overrides` pinning `react`/`react-dom` to a single version, fixing
  prerender failures from mixed React 18/19 in transitive deps

### Tests

- TypeScript: 121 tests (was 42)
- Python: 54 tests (was 14)

### Documentation

- New docs sections: Shared Pools, Per-Memory ACLs, Pool Audit Log,
  Cryptographic Agent Identity
- `examples/multi-agent-pool.mjs` demonstrating the
  trading → execution → risk → reporting flow end-to-end
- README and landing page repositioned around multi-agent coordination

### Upgrade notes

Apply both migrations in order before upgrading any SDK call site:

```sql
-- supabase/migration-v5.sql then supabase/migration-v6.sql
```

Existing `write()` and `recall()` calls are unchanged. Pool methods are
additive. `verifySignatures: true` is opt-in — existing trust-based code
continues to work without claims.

## [0.2.0] — earlier

- Treasury memory types: `transaction_record`, `balance_snapshot`,
  `spending_policy`
- `recordTransaction` / `recordBalanceSnapshot` / `getLatestBalance`
  convenience methods
- Treasury fields on memories: `amount`, `currency`, `counterparty`,
  `tx_status` (365-day Shelby retention)
- `/dashboard/treasury` page with stats and filtered view
