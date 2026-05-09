import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  MemoryRow, MemoryType, SearchResult, TreasuryFields,
  Pool, PoolMember, PoolRole, CreatePoolParams,
  PoolAuditEntry, AuditAction,
} from './types.js';

export class MemoryMetadata {
  private client: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  async insert(row: {
    agent_id: string;
    context: string;
    memory_preview: string;
    shelby_object_id: string;
    aptos_tx_hash: string;
    content_hash: string;
    memory_type: MemoryType;
    metadata?: Record<string, unknown>;
    embedding?: number[];
    treasury?: TreasuryFields;
    pool_id?: string;
    shared_with?: string[];
  }): Promise<MemoryRow> {
    const insertData: Record<string, unknown> = {
      agent_id: row.agent_id,
      context: row.context,
      memory_preview: row.memory_preview,
      shelby_object_id: row.shelby_object_id,
      aptos_tx_hash: row.aptos_tx_hash,
      content_hash: row.content_hash,
      memory_type: row.memory_type,
      metadata: row.metadata ?? {},
    };

    if (row.embedding) {
      insertData.embedding = JSON.stringify(row.embedding);
    }

    if (row.pool_id) {
      insertData.pool_id = row.pool_id;
    }

    if (row.shared_with && row.shared_with.length > 0) {
      insertData.shared_with = row.shared_with;
    }

    if (row.treasury) {
      if (row.treasury.amount !== undefined) insertData.amount = row.treasury.amount;
      if (row.treasury.currency) insertData.currency = row.treasury.currency;
      if (row.treasury.counterparty) insertData.counterparty = row.treasury.counterparty;
      if (row.treasury.tx_status) insertData.tx_status = row.treasury.tx_status;
    }

    const { data, error } = await this.client
      .from('memories')
      .insert(insertData)
      .select()
      .single();

    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    return data as MemoryRow;
  }

  async query(
    agent_id: string,
    context?: string,
    memory_type?: MemoryType,
    limit: number = 10
  ): Promise<MemoryRow[]> {
    let query = this.client
      .from('memories')
      .select('*')
      .eq('agent_id', agent_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (context) {
      query = query.eq('context', context);
    }
    if (memory_type) {
      query = query.eq('memory_type', memory_type);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase query failed: ${error.message}`);
    return (data ?? []) as MemoryRow[];
  }

  async queryPool(
    pool_id: string,
    context?: string,
    memory_type?: MemoryType,
    limit: number = 10
  ): Promise<MemoryRow[]> {
    let query = this.client
      .from('memories')
      .select('*')
      .eq('pool_id', pool_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (context) {
      query = query.eq('context', context);
    }
    if (memory_type) {
      query = query.eq('memory_type', memory_type);
    }

    const { data, error } = await query;
    if (error) throw new Error(`Supabase pool query failed: ${error.message}`);
    return (data ?? []) as MemoryRow[];
  }

  async search(
    queryEmbedding: number[],
    agentId?: string,
    threshold: number = 0.5,
    limit: number = 10
  ): Promise<SearchResult[]> {
    const { data, error } = await this.client.rpc('match_memories', {
      query_embedding: JSON.stringify(queryEmbedding),
      filter_agent_id: agentId ?? null,
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) throw new Error(`Vector search failed: ${error.message}`);
    return (data ?? []) as SearchResult[];
  }

  async getById(id: string): Promise<MemoryRow | null> {
    const { data, error } = await this.client
      .from('memories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as MemoryRow;
  }

  async updateVerified(id: string, verified: boolean): Promise<void> {
    await this.client
      .from('memories')
      .update({ verified })
      .eq('id', id);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }

  // --- Pool methods ---

  async insertPool(p: CreatePoolParams): Promise<Pool> {
    const { data, error } = await this.client
      .from('memory_pools')
      .insert({
        name: p.name,
        description: p.description ?? null,
        owner_agent_id: p.ownerAgentId,
        metadata: p.metadata ?? {},
      })
      .select()
      .single();

    if (error) throw new Error(`Pool create failed: ${error.message}`);
    return data as Pool;
  }

  async getPool(poolId: string): Promise<Pool | null> {
    const { data, error } = await this.client
      .from('memory_pools')
      .select('*')
      .eq('id', poolId)
      .maybeSingle();

    if (error) throw new Error(`Pool fetch failed: ${error.message}`);
    return (data ?? null) as Pool | null;
  }

  async deletePool(poolId: string): Promise<void> {
    const { error } = await this.client
      .from('memory_pools')
      .delete()
      .eq('id', poolId);

    if (error) throw new Error(`Pool delete failed: ${error.message}`);
  }

  async updatePoolOwner(poolId: string, newOwnerAgentId: string): Promise<Pool> {
    const { data, error } = await this.client
      .from('memory_pools')
      .update({ owner_agent_id: newOwnerAgentId })
      .eq('id', poolId)
      .select()
      .single();

    if (error) throw new Error(`Pool owner update failed: ${error.message}`);
    return data as Pool;
  }

  async listPoolsForAgent(agentId: string): Promise<Pool[]> {
    const { data, error } = await this.client
      .from('pool_members')
      .select('pool_id, memory_pools(*)')
      .eq('agent_id', agentId);

    if (error) throw new Error(`List pools failed: ${error.message}`);
    const rows = (data ?? []) as Array<{ memory_pools: Pool | Pool[] | null }>;
    const pools: Pool[] = [];
    for (const r of rows) {
      const p = r.memory_pools;
      if (Array.isArray(p)) pools.push(...p);
      else if (p) pools.push(p);
    }
    return pools;
  }

  async getMember(poolId: string, agentId: string): Promise<PoolMember | null> {
    const { data, error } = await this.client
      .from('pool_members')
      .select('*')
      .eq('pool_id', poolId)
      .eq('agent_id', agentId)
      .maybeSingle();

    if (error) throw new Error(`Member fetch failed: ${error.message}`);
    return (data ?? null) as PoolMember | null;
  }

  async listMembers(poolId: string): Promise<PoolMember[]> {
    const { data, error } = await this.client
      .from('pool_members')
      .select('*')
      .eq('pool_id', poolId);

    if (error) throw new Error(`List members failed: ${error.message}`);
    return (data ?? []) as PoolMember[];
  }

  async upsertMember(poolId: string, agentId: string, role: PoolRole): Promise<PoolMember> {
    const { data, error } = await this.client
      .from('pool_members')
      .upsert(
        { pool_id: poolId, agent_id: agentId, role },
        { onConflict: 'pool_id,agent_id' }
      )
      .select()
      .single();

    if (error) throw new Error(`Upsert member failed: ${error.message}`);
    return data as PoolMember;
  }

  async removeMember(poolId: string, agentId: string): Promise<void> {
    const { error } = await this.client
      .from('pool_members')
      .delete()
      .eq('pool_id', poolId)
      .eq('agent_id', agentId);

    if (error) throw new Error(`Remove member failed: ${error.message}`);
  }

  // --- Per-memory ACLs ---

  async querySharedWith(
    agent_id: string,
    context?: string,
    memory_type?: MemoryType,
    limit: number = 10
  ): Promise<MemoryRow[]> {
    let query = this.client
      .from('memories')
      .select('*')
      .contains('shared_with', [agent_id])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (context) query = query.eq('context', context);
    if (memory_type) query = query.eq('memory_type', memory_type);

    const { data, error } = await query;
    if (error) throw new Error(`Shared query failed: ${error.message}`);
    return (data ?? []) as MemoryRow[];
  }

  // --- Pool semantic search ---

  async searchPool(
    queryEmbedding: number[],
    poolId: string,
    threshold: number = 0.5,
    limit: number = 10
  ): Promise<SearchResult[]> {
    const { data, error } = await this.client.rpc('match_pool_memories', {
      query_embedding: JSON.stringify(queryEmbedding),
      filter_pool_id: poolId,
      match_threshold: threshold,
      match_count: limit,
    });
    if (error) throw new Error(`Pool vector search failed: ${error.message}`);
    return (data ?? []) as SearchResult[];
  }

  // --- Audit log ---

  async logPoolAccess(entry: {
    pool_id: string;
    agent_id: string;
    action: AuditAction;
    memory_id?: string | null;
    result_count?: number | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const { error } = await this.client.from('pool_access_log').insert({
      pool_id: entry.pool_id,
      agent_id: entry.agent_id,
      action: entry.action,
      memory_id: entry.memory_id ?? null,
      result_count: entry.result_count ?? null,
      metadata: entry.metadata ?? {},
    });
    if (error) throw new Error(`Audit log insert failed: ${error.message}`);
  }

  async queryPoolAuditLog(
    poolId: string,
    limit: number = 100
  ): Promise<PoolAuditEntry[]> {
    const { data, error } = await this.client
      .from('pool_access_log')
      .select('*')
      .eq('pool_id', poolId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(`Audit log query failed: ${error.message}`);
    return (data ?? []) as PoolAuditEntry[];
  }
}
