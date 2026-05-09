import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ShelMem, PermissionError } from '../index.js';
import type { Pool, PoolMember } from '../types.js';

vi.mock('@supabase/supabase-js', () => ({
  // ShelMem only touches the supabase client through MemoryMetadata methods
  // which we stub directly per-test, so a no-op factory is enough.
  createClient: () => ({ from: () => ({}), rpc: async () => ({ data: [], error: null }) }),
}));

interface FakeStore {
  pool: Pool;
  members: Map<string, PoolMember>;
  memories: Array<Record<string, unknown>>;
}

function makeStore(): FakeStore {
  const pool: Pool = {
    id: 'pool-1',
    name: 'market-ops',
    description: null,
    owner_agent_id: 'trading-agent',
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };
  const members = new Map<string, PoolMember>();
  members.set('trading-agent', {
    pool_id: 'pool-1', agent_id: 'trading-agent', role: 'owner', added_at: '2026-01-01T00:00:00Z',
  });
  return { pool, members, memories: [] };
}

interface AuditEntry {
  pool_id: string;
  agent_id: string;
  action: 'write' | 'read';
  memory_id?: string | null;
  result_count?: number | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  id: string;
}

function attachFakeMetadata(mem: ShelMem, store: FakeStore, audit: AuditEntry[] = []) {
  const metadata = (mem as any).metadata;

  vi.spyOn(metadata, 'getMember').mockImplementation(async (poolId: any, agentId: any) =>
    poolId === store.pool.id ? (store.members.get(agentId as string) ?? null) : null
  );
  vi.spyOn(metadata, 'listMembers').mockImplementation(async (poolId: any) =>
    poolId === store.pool.id ? Array.from(store.members.values()) : []
  );
  vi.spyOn(metadata, 'upsertMember').mockImplementation(async (poolId: any, agentId: any, role: any) => {
    const m: PoolMember = {
      pool_id: poolId, agent_id: agentId, role, added_at: '2026-01-01T00:00:00Z',
    };
    store.members.set(agentId, m);
    return m;
  });
  vi.spyOn(metadata, 'removeMember').mockImplementation(async (_poolId: any, agentId: any) => {
    store.members.delete(agentId);
  });
  vi.spyOn(metadata, 'insertPool').mockImplementation(async (p: any) => {
    const created: Pool = {
      id: store.pool.id,
      name: p.name,
      description: p.description ?? null,
      owner_agent_id: p.ownerAgentId,
      metadata: p.metadata ?? {},
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    // mirror DB trigger: owner becomes a member
    store.members.set(p.ownerAgentId, {
      pool_id: created.id, agent_id: p.ownerAgentId, role: 'owner',
      added_at: '2026-01-01T00:00:00Z',
    });
    store.pool = created;
    return created;
  });
  vi.spyOn(metadata, 'getPool').mockImplementation(async (poolId: any) =>
    poolId === store.pool.id ? store.pool : null
  );
  vi.spyOn(metadata, 'deletePool').mockImplementation(async () => {});
  vi.spyOn(metadata, 'listPoolsForAgent').mockImplementation(async (agentId: any) =>
    store.members.has(agentId as string) ? [store.pool] : []
  );

  vi.spyOn(metadata, 'insert').mockImplementation(async (row: any) => {
    const inserted = {
      id: `mem-${store.memories.length + 1}`,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      verified: null,
      amount: row.treasury?.amount ?? null,
      currency: row.treasury?.currency ?? null,
      counterparty: row.treasury?.counterparty ?? null,
      tx_status: row.treasury?.tx_status ?? null,
      ...row,
      pool_id: row.pool_id ?? null,
    };
    store.memories.push(inserted);
    return inserted;
  });
  vi.spyOn(metadata, 'queryPool').mockImplementation(async (poolId: any, ctx: any, mt: any, limit: any) => {
    let rows = store.memories.filter(m => m.pool_id === poolId);
    if (ctx) rows = rows.filter(m => m.context === ctx);
    if (mt) rows = rows.filter(m => m.memory_type === mt);
    return rows.slice(0, limit ?? 10);
  });
  vi.spyOn(metadata, 'updateVerified').mockResolvedValue(undefined);

  vi.spyOn(metadata, 'querySharedWith').mockImplementation(async (agentId: any, ctx: any, mt: any, limit: any) => {
    let rows = store.memories.filter(m => Array.isArray(m.shared_with) && (m.shared_with as string[]).includes(agentId));
    if (ctx) rows = rows.filter(m => m.context === ctx);
    if (mt) rows = rows.filter(m => m.memory_type === mt);
    return rows.slice(0, limit ?? 10);
  });
  vi.spyOn(metadata, 'searchPool').mockImplementation(async (_emb: any, poolId: any, _t: any, limit: any) => {
    const rows = store.memories
      .filter(m => m.pool_id === poolId)
      .slice(0, limit ?? 10)
      .map((m, i) => ({
        id: m.id, agent_id: m.agent_id, context: m.context,
        memory_preview: m.memory_preview, memory_type: m.memory_type,
        content_hash: m.content_hash, aptos_tx_hash: m.aptos_tx_hash,
        created_at: m.created_at, similarity: 0.9 - i * 0.05,
      }));
    return rows;
  });
  vi.spyOn(metadata, 'logPoolAccess').mockImplementation(async (entry: any) => {
    audit.push({
      ...entry,
      id: `audit-${audit.length + 1}`,
      created_at: '2026-01-01T00:00:00Z',
    });
  });
  vi.spyOn(metadata, 'queryPoolAuditLog').mockImplementation(async (poolId: any, limit: any) => {
    return audit.filter(a => a.pool_id === poolId).slice(0, limit ?? 100);
  });
}

describe('Shared memory pools', () => {
  let mem: ShelMem;
  let store: FakeStore;
  let audit: AuditEntry[];

  beforeEach(() => {
    mem = new ShelMem({
      supabaseUrl: 'https://fake.supabase.co',
      supabaseKey: 'fake-key',
      mock: true,
    });
    store = makeStore();
    audit = [];
    attachFakeMetadata(mem, store, audit);
  });

  describe('createPool', () => {
    it('creates a pool and auto-adds the owner as a member', async () => {
      const fresh: FakeStore = { pool: store.pool, members: new Map(), memories: [] };
      attachFakeMetadata(mem, fresh, []);
      const pool = await mem.createPool({ name: 'market-ops', ownerAgentId: 'trading-agent' });
      expect(pool.name).toBe('market-ops');
      expect(fresh.members.get('trading-agent')?.role).toBe('owner');
    });

    it('rejects empty name', async () => {
      await expect(mem.createPool({ name: '', ownerAgentId: 'x' })).rejects.toThrow();
    });
  });

  describe('addPoolMember', () => {
    it('owner can add a writer', async () => {
      const m = await mem.addPoolMember('pool-1', 'trading-agent', 'execution-agent', 'writer');
      expect(m.role).toBe('writer');
    });

    it('non-owner cannot add members', async () => {
      store.members.set('execution-agent', {
        pool_id: 'pool-1', agent_id: 'execution-agent', role: 'writer',
        added_at: '2026-01-01T00:00:00Z',
      });
      await expect(
        mem.addPoolMember('pool-1', 'execution-agent', 'risk-agent', 'reader')
      ).rejects.toBeInstanceOf(PermissionError);
    });

    it('non-member cannot add members', async () => {
      await expect(
        mem.addPoolMember('pool-1', 'rando', 'risk-agent', 'reader')
      ).rejects.toBeInstanceOf(PermissionError);
    });
  });

  describe('removePoolMember', () => {
    it('cannot remove the pool owner', async () => {
      await expect(
        mem.removePoolMember('pool-1', 'trading-agent', 'trading-agent')
      ).rejects.toBeInstanceOf(PermissionError);
    });

    it('owner can remove a writer', async () => {
      store.members.set('execution-agent', {
        pool_id: 'pool-1', agent_id: 'execution-agent', role: 'writer',
        added_at: '2026-01-01T00:00:00Z',
      });
      await mem.removePoolMember('pool-1', 'trading-agent', 'execution-agent');
      expect(store.members.has('execution-agent')).toBe(false);
    });
  });

  describe('writeToPool', () => {
    beforeEach(() => {
      store.members.set('execution-agent', {
        pool_id: 'pool-1', agent_id: 'execution-agent', role: 'writer',
        added_at: '2026-01-01T00:00:00Z',
      });
      store.members.set('reporting-agent', {
        pool_id: 'pool-1', agent_id: 'reporting-agent', role: 'reader',
        added_at: '2026-01-01T00:00:00Z',
      });
    });

    it('writer can write into the pool, and pool_id is propagated', async () => {
      await mem.writeToPool({
        poolId: 'pool-1',
        agentId: 'execution-agent',
        memory: 'Filled order at $8.50',
        context: 'trading',
        memory_type: 'observation',
      });
      expect(store.memories).toHaveLength(1);
      expect(store.memories[0].pool_id).toBe('pool-1');
      expect(store.memories[0].agent_id).toBe('execution-agent');
    });

    it('reader cannot write into the pool', async () => {
      await expect(
        mem.writeToPool({
          poolId: 'pool-1',
          agentId: 'reporting-agent',
          memory: 'should fail',
          context: 'trading',
        })
      ).rejects.toBeInstanceOf(PermissionError);
    });

    it('non-member cannot write into the pool', async () => {
      await expect(
        mem.writeToPool({
          poolId: 'pool-1',
          agentId: 'rando',
          memory: 'should fail',
          context: 'trading',
        })
      ).rejects.toBeInstanceOf(PermissionError);
    });
  });

  describe('recallFromPool', () => {
    it('member can read pool memories regardless of which agent wrote them', async () => {
      store.members.set('execution-agent', {
        pool_id: 'pool-1', agent_id: 'execution-agent', role: 'writer',
        added_at: '2026-01-01T00:00:00Z',
      });
      store.members.set('reporting-agent', {
        pool_id: 'pool-1', agent_id: 'reporting-agent', role: 'reader',
        added_at: '2026-01-01T00:00:00Z',
      });

      await mem.writeToPool({
        poolId: 'pool-1', agentId: 'trading-agent',
        memory: 'RSI=35, buy 500 APT', context: 'trading', memory_type: 'decision',
      });
      await mem.writeToPool({
        poolId: 'pool-1', agentId: 'execution-agent',
        memory: 'Order filled', context: 'trading', memory_type: 'observation',
      });

      const records = await mem.recallFromPool({
        poolId: 'pool-1', agentId: 'reporting-agent',
      });
      expect(records).toHaveLength(2);
      const writers = records.map(r => r.agent_id).sort();
      expect(writers).toEqual(['execution-agent', 'trading-agent']);
      expect(records.every(r => r.pool_id === 'pool-1')).toBe(true);
    });

    it('non-member cannot recall', async () => {
      await expect(
        mem.recallFromPool({ poolId: 'pool-1', agentId: 'rando' })
      ).rejects.toBeInstanceOf(PermissionError);
    });
  });

  describe('listPools', () => {
    it('returns pools the agent is a member of', async () => {
      const pools = await mem.listPools('trading-agent');
      expect(pools.map(p => p.id)).toEqual(['pool-1']);
    });

    it('returns empty list for non-members', async () => {
      const pools = await mem.listPools('rando');
      expect(pools).toEqual([]);
    });
  });

  describe('per-memory ACLs (sharedWith)', () => {
    it('write() persists shared_with', async () => {
      await mem.write(
        'trading-agent',
        'shared insight',
        'analysis',
        'observation',
        undefined,
        undefined,
        ['execution-agent', 'risk-agent']
      );
      expect(store.memories[0].shared_with).toEqual(['execution-agent', 'risk-agent']);
    });

    it('recallShared returns memories where the agent is in shared_with', async () => {
      // Tiny waits ensure distinct mock-shelby addresses (Date.now() resolution).
      await mem.write(
        'trading-agent', 'visible to exec', 'analysis', 'observation', undefined, undefined,
        ['execution-agent']
      );
      await new Promise(r => setTimeout(r, 2));
      await mem.write(
        'trading-agent', 'visible to risk', 'analysis', 'observation', undefined, undefined,
        ['risk-agent']
      );
      await new Promise(r => setTimeout(r, 2));
      await mem.write('trading-agent', 'private', 'analysis', 'observation');

      const execMem = await mem.recallShared('execution-agent');
      expect(execMem.map(r => r.memory)).toEqual(['visible to exec']);

      const riskMem = await mem.recallShared('risk-agent');
      expect(riskMem.map(r => r.memory)).toEqual(['visible to risk']);

      const randoMem = await mem.recallShared('rando');
      expect(randoMem).toEqual([]);
    });
  });

  describe('searchPool', () => {
    it('rejects non-members', async () => {
      mem = new ShelMem({ supabaseUrl: 'x', supabaseKey: 'y', mock: true,
        embeddingProvider: async () => new Array(1536).fill(0) });
      attachFakeMetadata(mem, store, audit);
      await expect(
        mem.searchPool({ poolId: 'pool-1', agentId: 'rando', query: 'x' })
      ).rejects.toBeInstanceOf(PermissionError);
    });

    it('throws if no embeddingProvider configured', async () => {
      await expect(
        mem.searchPool({ poolId: 'pool-1', agentId: 'trading-agent', query: 'x' })
      ).rejects.toThrow(/embeddingProvider/);
    });

    it('returns ranked results for pool members', async () => {
      mem = new ShelMem({ supabaseUrl: 'x', supabaseKey: 'y', mock: true,
        embeddingProvider: async () => new Array(1536).fill(0.1) });
      attachFakeMetadata(mem, store, audit);
      store.members.set('reporting-agent', {
        pool_id: 'pool-1', agent_id: 'reporting-agent', role: 'reader',
        added_at: '2026-01-01T00:00:00Z',
      });
      await mem.writeToPool({
        poolId: 'pool-1', agentId: 'trading-agent',
        memory: 'RSI=35', context: 'trading', memory_type: 'decision',
      });

      const results = await mem.searchPool({
        poolId: 'pool-1', agentId: 'reporting-agent', query: 'rsi',
      });
      expect(results.length).toBe(1);
      expect(results[0].similarity).toBeGreaterThan(0.5);
    });
  });

  describe('audit log', () => {
    beforeEach(() => {
      store.members.set('execution-agent', {
        pool_id: 'pool-1', agent_id: 'execution-agent', role: 'writer',
        added_at: '2026-01-01T00:00:00Z',
      });
      store.members.set('reporting-agent', {
        pool_id: 'pool-1', agent_id: 'reporting-agent', role: 'reader',
        added_at: '2026-01-01T00:00:00Z',
      });
    });

    it('writeToPool records a write action', async () => {
      await mem.writeToPool({
        poolId: 'pool-1', agentId: 'execution-agent',
        memory: 'filled', context: 'trading',
      });
      // Allow the fire-and-forget audit insert to settle.
      await new Promise(r => setTimeout(r, 0));
      expect(audit.some(a => a.action === 'write' && a.agent_id === 'execution-agent')).toBe(true);
    });

    it('recallFromPool records a read action with result_count', async () => {
      await mem.writeToPool({
        poolId: 'pool-1', agentId: 'execution-agent', memory: 'x', context: 'trading',
      });
      await mem.recallFromPool({ poolId: 'pool-1', agentId: 'reporting-agent' });
      await new Promise(r => setTimeout(r, 0));
      const reads = audit.filter(a => a.action === 'read');
      expect(reads.length).toBe(1);
      expect(reads[0].agent_id).toBe('reporting-agent');
      expect(reads[0].result_count).toBe(1);
    });

    it('getPoolAuditLog returns entries to the owner', async () => {
      await mem.writeToPool({
        poolId: 'pool-1', agentId: 'execution-agent', memory: 'x', context: 'trading',
      });
      await new Promise(r => setTimeout(r, 0));
      const log = await mem.getPoolAuditLog('pool-1', 'trading-agent');
      expect(log.length).toBeGreaterThan(0);
    });

    it('getPoolAuditLog rejects non-owners', async () => {
      await expect(
        mem.getPoolAuditLog('pool-1', 'execution-agent')
      ).rejects.toBeInstanceOf(PermissionError);
    });
  });
});

describe('Agent identity (sign + verify)', () => {
  // Aptos test key (Ed25519). NOT a real account — fixed for deterministic tests.
  const PRIV = '0x0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20';

  it('signs and verifies a fresh claim', async () => {
    const { signAgentClaim, verifyAgentClaim } = await import('../agent-identity.js');
    const claim = signAgentClaim('trading-agent', PRIV);
    expect(verifyAgentClaim(claim, 'trading-agent', claim.publicKey)).toBe(true);
  });

  it('rejects mismatched agent_id', async () => {
    const { signAgentClaim, verifyAgentClaim, AgentClaimError } = await import('../agent-identity.js');
    const claim = signAgentClaim('trading-agent', PRIV);
    expect(() => verifyAgentClaim(claim, 'execution-agent', claim.publicKey))
      .toThrow(AgentClaimError);
  });

  it('rejects mismatched public key', async () => {
    const { signAgentClaim, verifyAgentClaim, AgentClaimError } = await import('../agent-identity.js');
    const claim = signAgentClaim('trading-agent', PRIV);
    expect(() => verifyAgentClaim(claim, 'trading-agent', '0xdead'))
      .toThrow(AgentClaimError);
  });

  it('rejects expired claims', async () => {
    const { verifyAgentClaim, AgentClaimError, signAgentClaim } = await import('../agent-identity.js');
    const claim = signAgentClaim('trading-agent', PRIV);
    // Force expiry
    (claim as any).timestamp = Math.floor(Date.now() / 1000) - 9999;
    expect(() => verifyAgentClaim(claim, 'trading-agent', claim.publicKey))
      .toThrow(AgentClaimError);
  });

  it('rejects tampered signatures', async () => {
    const { signAgentClaim, verifyAgentClaim, AgentClaimError } = await import('../agent-identity.js');
    const claim = signAgentClaim('trading-agent', PRIV);
    // Flip the last hex digit
    const tampered = { ...claim, signature: claim.signature.slice(0, -1) +
      (claim.signature.endsWith('0') ? '1' : '0') };
    expect(() => verifyAgentClaim(tampered, 'trading-agent', claim.publicKey))
      .toThrow(AgentClaimError);
  });
});
