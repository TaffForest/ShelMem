import { ShelbyStorage, computeHash } from './shelby.js';
import { MemoryMetadata } from './supabase.js';
import { PermissionError } from './errors.js';
import { verifyAgentClaim, AgentClaimError } from './agent-identity.js';
import type {
  ShelMemConfig, WriteResult, MemoryRecord, MemoryType, VerifyResult,
  SearchResult, TreasuryFields, RecordTransactionParams, RecordBalanceParams,
  Pool, PoolMember, PoolRole, CreatePoolParams, WriteToPoolParams, RecallFromPoolParams,
  SearchPoolParams, PoolAuditEntry, AgentClaim,
} from './types.js';

export type {
  ShelMemConfig, WriteResult, MemoryRecord, MemoryRow, MemoryType, VerifyResult,
  SearchResult, TreasuryFields, TreasuryMemoryType, RecordTransactionParams, RecordBalanceParams,
  Pool, PoolMember, PoolRole, CreatePoolParams, WriteToPoolParams, RecallFromPoolParams,
  SearchPoolParams, PoolAuditEntry, AuditAction, AgentClaim,
} from './types.js';
export { PermissionError } from './errors.js';
export { signAgentClaim, verifyAgentClaim, AgentClaimError } from './agent-identity.js';
export { computeHash } from './shelby.js';
export { openaiEmbeddings } from './embeddings.js';
export type { EmbeddingProvider } from './embeddings.js';
export { createShelMemTools } from './integrations/vercel-ai.js';
export type { ShelMemToolsConfig } from './integrations/vercel-ai.js';

export class ShelMem {
  private storage: ShelbyStorage;
  private metadata: MemoryMetadata;
  private embed?: (text: string) => Promise<number[]>;
  private agentRegistry?: Record<string, string>;
  private verifySignatures: boolean;
  private claimMaxAgeSeconds: number;

  constructor(config: ShelMemConfig) {
    this.storage = new ShelbyStorage({
      apiKey: config.shelbyApiKey,
      privateKey: config.aptosPrivateKey,
      network: config.network,
      mock: config.mock,
      encrypt: config.encrypt,
    });

    this.metadata = new MemoryMetadata(config.supabaseUrl, config.supabaseKey);
    this.embed = config.embeddingProvider;
    this.agentRegistry = config.agentRegistry;
    this.verifySignatures = config.verifySignatures ?? false;
    this.claimMaxAgeSeconds = config.claimMaxAgeSeconds ?? 300;

    if (this.verifySignatures && !this.agentRegistry) {
      throw new Error(
        'verifySignatures: true requires agentRegistry to map agent_id → publicKey'
      );
    }
  }

  /**
   * No-op when verifySignatures=false (current trust model).
   * Otherwise: requires `claim` to match `agentId` and verifies the
   * Ed25519 signature against agentRegistry[agentId].
   */
  private assertClaim(agentId: string, claim?: AgentClaim): void {
    if (!this.verifySignatures) return;
    if (!claim) {
      throw new AgentClaimError(
        `verifySignatures is enabled — agent '${agentId}' must pass a signed claim`
      );
    }
    const expectedPubKey = this.agentRegistry?.[agentId];
    if (!expectedPubKey) {
      throw new AgentClaimError(
        `agent '${agentId}' has no registered public key in agentRegistry`
      );
    }
    verifyAgentClaim(claim, agentId, expectedPubKey, this.claimMaxAgeSeconds);
  }

  /**
   * Write a memory to decentralised storage with on-chain proof.
   * Content is hashed (SHA-256) before upload for tamper detection.
   * If an embedding provider is configured, a vector embedding is stored for semantic search.
   */
  async write(
    agent_id: string,
    memory: string,
    context: string,
    memory_type: MemoryType = 'observation',
    metadata?: Record<string, unknown>,
    treasury?: TreasuryFields,
    sharedWith?: string[]
  ): Promise<WriteResult> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(memory);

    const blobName = `${agent_id}_${Date.now()}`;
    const { shelbyAddress, shelbyProof, contentHash } = await this.storage.upload(bytes, blobName, memory_type);

    let embedding: number[] | undefined;
    if (this.embed) {
      embedding = await this.embed(memory);
    }

    const preview = memory.slice(0, 200);

    const row = await this.metadata.insert({
      agent_id,
      context,
      memory_preview: preview,
      shelby_object_id: shelbyAddress,
      aptos_tx_hash: shelbyProof,
      content_hash: contentHash,
      memory_type,
      metadata,
      embedding,
      treasury,
      shared_with: sharedWith,
    });

    return {
      shelby_object_id: shelbyAddress,
      aptos_tx_hash: shelbyProof,
      content_hash: contentHash,
      memory_type,
      timestamp: row.created_at,
      amount: row.amount,
      currency: row.currency,
      counterparty: row.counterparty,
      tx_status: row.tx_status,
    };
  }

  /**
   * Recall memories for an agent by metadata filters.
   * Each memory is verified against its stored content hash.
   */
  async recall(
    agent_id: string,
    context?: string,
    limit: number = 10,
    memory_type?: MemoryType
  ): Promise<MemoryRecord[]> {
    const rows = await this.metadata.query(agent_id, context, memory_type, limit);
    const decoder = new TextDecoder();

    const results = await Promise.all(rows.map(async (row): Promise<MemoryRecord> => {
      let memoryText: string;
      let verified: boolean | null = null;

      try {
        const bytes = await this.storage.download(row.shelby_object_id);
        memoryText = decoder.decode(bytes);

        if (row.content_hash) {
          const actualHash = computeHash(bytes);
          verified = actualHash === row.content_hash;
        }
      } catch {
        memoryText = row.memory_preview ?? '[content unavailable]';
        verified = null;
      }

      if (verified !== null && verified !== row.verified) {
        this.metadata.updateVerified(row.id, verified).catch(() => {});
      }

      return {
        memory: memoryText,
        context: row.context,
        timestamp: row.created_at,
        aptos_tx_hash: row.aptos_tx_hash ?? '',
        content_hash: row.content_hash ?? '',
        memory_type: (row.memory_type as MemoryType) ?? 'observation',
        verified,
        amount: row.amount,
        currency: row.currency,
        counterparty: row.counterparty,
        tx_status: row.tx_status,
      };
    }));

    return results;
  }

  /**
   * Semantic search — find memories by meaning using vector similarity.
   */
  async search(
    query: string,
    agent_id?: string,
    limit: number = 10,
    threshold: number = 0.5
  ): Promise<SearchResult[]> {
    if (!this.embed) {
      throw new Error('Semantic search requires an embeddingProvider in config');
    }

    const queryEmbedding = await this.embed(query);
    return this.metadata.search(queryEmbedding, agent_id, threshold, limit);
  }

  /**
   * Verify a specific memory's integrity by re-downloading from Shelby
   * and comparing the content hash against what was stored on write.
   */
  async verify(id: string): Promise<VerifyResult> {
    const row = await this.metadata.getById(id);
    if (!row) throw new Error(`Memory not found: ${id}`);

    const expectedHash = row.content_hash ?? '';

    try {
      const bytes = await this.storage.download(row.shelby_object_id);
      const actualHash = computeHash(bytes);

      return {
        verified: actualHash === expectedHash,
        content_hash: actualHash,
        expected_hash: expectedHash,
      };
    } catch {
      return {
        verified: false,
        content_hash: '',
        expected_hash: expectedHash,
      };
    }
  }

  async delete(id: string): Promise<void> {
    const row = await this.metadata.getById(id);
    if (row) {
      await this.storage.tryDelete(row.shelby_object_id);
    }
    await this.metadata.delete(id);
  }

  // --- Treasury convenience methods ---

  /**
   * Record an agent transaction. Sets memory_type='transaction_record'.
   * Requires amount, currency, and counterparty.
   */
  async recordTransaction(params: RecordTransactionParams): Promise<WriteResult> {
    return this.write(
      params.agentId,
      params.memory,
      params.context,
      'transaction_record',
      params.metadata,
      {
        amount: params.amount,
        currency: params.currency,
        counterparty: params.counterparty,
        tx_status: params.txStatus ?? 'pending',
      }
    );
  }

  /**
   * Record a point-in-time balance snapshot. Sets memory_type='balance_snapshot'.
   * Requires amount and currency.
   */
  async recordBalanceSnapshot(params: RecordBalanceParams): Promise<WriteResult> {
    return this.write(
      params.agentId,
      params.memory,
      params.context,
      'balance_snapshot',
      params.metadata,
      {
        amount: params.amount,
        currency: params.currency,
      }
    );
  }

  /**
   * Get the most recent balance snapshot for an agent.
   * Returns null if no balance_snapshot exists.
   */
  async getLatestBalance(agentId: string): Promise<MemoryRecord | null> {
    const results = await this.recall(agentId, undefined, 1, 'balance_snapshot');
    return results.length > 0 ? results[0] : null;
  }

  // --- Shared memory pools ---

  private async assertRole(
    poolId: string,
    agentId: string,
    allowed: PoolRole[]
  ): Promise<PoolMember> {
    const member = await this.metadata.getMember(poolId, agentId);
    if (!member) {
      throw new PermissionError(
        `Agent '${agentId}' is not a member of pool '${poolId}'`
      );
    }
    if (!allowed.includes(member.role)) {
      throw new PermissionError(
        `Agent '${agentId}' has role '${member.role}'; required one of [${allowed.join(', ')}]`
      );
    }
    return member;
  }

  /** Create a pool. The owner is automatically added as a member with role='owner'. */
  async createPool(params: CreatePoolParams): Promise<Pool> {
    this.assertClaim(params.ownerAgentId, params.claim);
    if (!params.name?.trim()) throw new Error('pool name cannot be empty');
    if (!params.ownerAgentId?.trim()) throw new Error('ownerAgentId cannot be empty');
    return this.metadata.insertPool(params);
  }

  /** Get pool metadata. Caller must be a pool member. */
  async getPool(poolId: string, callerAgentId: string, claim?: AgentClaim): Promise<Pool> {
    this.assertClaim(callerAgentId, claim);
    await this.assertRole(poolId, callerAgentId, ['owner', 'writer', 'reader']);
    const pool = await this.metadata.getPool(poolId);
    if (!pool) throw new Error(`Pool not found: ${poolId}`);
    return pool;
  }

  /** List pools the agent is a member of. */
  async listPools(agentId: string, claim?: AgentClaim): Promise<Pool[]> {
    this.assertClaim(agentId, claim);
    return this.metadata.listPoolsForAgent(agentId);
  }

  /** Delete a pool. Owner only. Cascades pool_members; memories' pool_id is set to NULL. */
  async deletePool(poolId: string, callerAgentId: string, claim?: AgentClaim): Promise<void> {
    this.assertClaim(callerAgentId, claim);
    await this.assertRole(poolId, callerAgentId, ['owner']);
    await this.metadata.deletePool(poolId);
  }

  /**
   * Transfer pool ownership to an existing member. Caller must be the
   * current owner. The target is promoted to 'owner' and the previous
   * owner is demoted to 'writer'.
   */
  async transferPool(
    poolId: string,
    callerAgentId: string,
    newOwnerAgentId: string,
    claim?: AgentClaim
  ): Promise<Pool> {
    this.assertClaim(callerAgentId, claim);
    await this.assertRole(poolId, callerAgentId, ['owner']);
    if (!newOwnerAgentId?.trim()) throw new Error('newOwnerAgentId cannot be empty');
    if (newOwnerAgentId === callerAgentId) {
      throw new Error('newOwnerAgentId is already the owner');
    }
    const target = await this.metadata.getMember(poolId, newOwnerAgentId);
    if (!target) {
      throw new PermissionError(
        `Agent '${newOwnerAgentId}' is not a member of pool '${poolId}'`
      );
    }
    await this.metadata.upsertMember(poolId, newOwnerAgentId, 'owner');
    await this.metadata.upsertMember(poolId, callerAgentId, 'writer');
    return this.metadata.updatePoolOwner(poolId, newOwnerAgentId);
  }

  /** Add or update a member's role in a pool. Owner only. */
  async addPoolMember(
    poolId: string,
    callerAgentId: string,
    targetAgentId: string,
    role: PoolRole,
    claim?: AgentClaim
  ): Promise<PoolMember> {
    this.assertClaim(callerAgentId, claim);
    await this.assertRole(poolId, callerAgentId, ['owner']);
    if (!targetAgentId?.trim()) throw new Error('targetAgentId cannot be empty');
    return this.metadata.upsertMember(poolId, targetAgentId, role);
  }

  /** Remove a member from a pool. Owner only. The owner cannot remove themselves. */
  async removePoolMember(
    poolId: string,
    callerAgentId: string,
    targetAgentId: string,
    claim?: AgentClaim
  ): Promise<void> {
    this.assertClaim(callerAgentId, claim);
    await this.assertRole(poolId, callerAgentId, ['owner']);
    const target = await this.metadata.getMember(poolId, targetAgentId);
    if (target?.role === 'owner') {
      throw new PermissionError('Cannot remove the pool owner');
    }
    await this.metadata.removeMember(poolId, targetAgentId);
  }

  /** List all members of a pool. Caller must be a pool member. */
  async listPoolMembers(poolId: string, callerAgentId: string, claim?: AgentClaim): Promise<PoolMember[]> {
    this.assertClaim(callerAgentId, claim);
    await this.assertRole(poolId, callerAgentId, ['owner', 'writer', 'reader']);
    return this.metadata.listMembers(poolId);
  }

  /** Write a memory into a shared pool. Caller must be owner or writer. */
  async writeToPool(params: WriteToPoolParams): Promise<WriteResult> {
    this.assertClaim(params.agentId, params.claim);
    await this.assertRole(params.poolId, params.agentId, ['owner', 'writer']);

    const memory_type: MemoryType = params.memory_type ?? 'observation';
    const encoder = new TextEncoder();
    const bytes = encoder.encode(params.memory);

    const blobName = `${params.agentId}_${Date.now()}`;
    const { shelbyAddress, shelbyProof, contentHash } =
      await this.storage.upload(bytes, blobName, memory_type);

    let embedding: number[] | undefined;
    if (this.embed) {
      embedding = await this.embed(params.memory);
    }

    const preview = params.memory.slice(0, 200);

    const row = await this.metadata.insert({
      agent_id: params.agentId,
      context: params.context,
      memory_preview: preview,
      shelby_object_id: shelbyAddress,
      aptos_tx_hash: shelbyProof,
      content_hash: contentHash,
      memory_type,
      metadata: params.metadata,
      embedding,
      treasury: params.treasury,
      pool_id: params.poolId,
    });

    // Audit log — best-effort; never fail the write if logging fails.
    this.metadata.logPoolAccess({
      pool_id: params.poolId,
      agent_id: params.agentId,
      action: 'write',
      memory_id: row.id,
    }).catch(() => {});

    return {
      shelby_object_id: shelbyAddress,
      aptos_tx_hash: shelbyProof,
      content_hash: contentHash,
      memory_type,
      timestamp: row.created_at,
      amount: row.amount,
      currency: row.currency,
      counterparty: row.counterparty,
      tx_status: row.tx_status,
    };
  }

  /** Recall memories from a shared pool. Caller must be a pool member. */
  async recallFromPool(params: RecallFromPoolParams): Promise<MemoryRecord[]> {
    this.assertClaim(params.agentId, params.claim);
    await this.assertRole(params.poolId, params.agentId, ['owner', 'writer', 'reader']);

    const rows = await this.metadata.queryPool(
      params.poolId,
      params.context,
      params.memory_type,
      params.limit ?? 10
    );
    const decoder = new TextDecoder();

    const records = await Promise.all(rows.map(async (row): Promise<MemoryRecord> => {
      let memoryText: string;
      let verified: boolean | null = null;

      try {
        const bytes = await this.storage.download(row.shelby_object_id);
        memoryText = decoder.decode(bytes);

        if (row.content_hash) {
          const actualHash = computeHash(bytes);
          verified = actualHash === row.content_hash;
        }
      } catch {
        memoryText = row.memory_preview ?? '[content unavailable]';
        verified = null;
      }

      if (verified !== null && verified !== row.verified) {
        this.metadata.updateVerified(row.id, verified).catch(() => {});
      }

      return {
        memory: memoryText,
        context: row.context,
        timestamp: row.created_at,
        aptos_tx_hash: row.aptos_tx_hash ?? '',
        content_hash: row.content_hash ?? '',
        memory_type: (row.memory_type as MemoryType) ?? 'observation',
        verified,
        agent_id: row.agent_id,
        pool_id: row.pool_id,
        shared_with: row.shared_with ?? [],
        amount: row.amount,
        currency: row.currency,
        counterparty: row.counterparty,
        tx_status: row.tx_status,
      };
    }));

    this.metadata.logPoolAccess({
      pool_id: params.poolId,
      agent_id: params.agentId,
      action: 'read',
      result_count: records.length,
    }).catch(() => {});

    return records;
  }

  /**
   * Recall memories that have been explicitly shared with this agent
   * via the shared_with ACL (regardless of pool membership).
   */
  async recallShared(
    agent_id: string,
    context?: string,
    limit: number = 10,
    memory_type?: MemoryType,
    claim?: AgentClaim
  ): Promise<MemoryRecord[]> {
    this.assertClaim(agent_id, claim);
    const rows = await this.metadata.querySharedWith(agent_id, context, memory_type, limit);
    const decoder = new TextDecoder();

    return Promise.all(rows.map(async (row): Promise<MemoryRecord> => {
      let memoryText: string;
      let verified: boolean | null = null;

      try {
        const bytes = await this.storage.download(row.shelby_object_id);
        memoryText = decoder.decode(bytes);
        if (row.content_hash) {
          verified = computeHash(bytes) === row.content_hash;
        }
      } catch {
        memoryText = row.memory_preview ?? '[content unavailable]';
        verified = null;
      }

      return {
        memory: memoryText,
        context: row.context,
        timestamp: row.created_at,
        aptos_tx_hash: row.aptos_tx_hash ?? '',
        content_hash: row.content_hash ?? '',
        memory_type: (row.memory_type as MemoryType) ?? 'observation',
        verified,
        agent_id: row.agent_id,
        pool_id: row.pool_id,
        shared_with: row.shared_with ?? [],
        amount: row.amount,
        currency: row.currency,
        counterparty: row.counterparty,
        tx_status: row.tx_status,
      };
    }));
  }

  /** Semantic search inside a shared pool. Caller must be a pool member. */
  async searchPool(params: SearchPoolParams): Promise<SearchResult[]> {
    if (!this.embed) {
      throw new Error('Semantic search requires an embeddingProvider in config');
    }
    this.assertClaim(params.agentId, params.claim);
    await this.assertRole(params.poolId, params.agentId, ['owner', 'writer', 'reader']);

    const queryEmbedding = await this.embed(params.query);
    const results = await this.metadata.searchPool(
      queryEmbedding,
      params.poolId,
      params.threshold ?? 0.5,
      params.limit ?? 10
    );

    this.metadata.logPoolAccess({
      pool_id: params.poolId,
      agent_id: params.agentId,
      action: 'read',
      result_count: results.length,
      metadata: { search_query: params.query },
    }).catch(() => {});

    return results;
  }

  /**
   * Read the audit log for a pool. Owner only.
   * Returns one row per write/read action, newest first.
   */
  async getPoolAuditLog(
    poolId: string,
    callerAgentId: string,
    limit: number = 100,
    claim?: AgentClaim
  ): Promise<PoolAuditEntry[]> {
    this.assertClaim(callerAgentId, claim);
    await this.assertRole(poolId, callerAgentId, ['owner']);
    return this.metadata.queryPoolAuditLog(poolId, limit);
  }
}
