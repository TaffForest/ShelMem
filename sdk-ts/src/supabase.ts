import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { MemoryRow, MemoryType } from './types.js';

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
  }): Promise<MemoryRow> {
    const { data, error } = await this.client
      .from('memories')
      .insert({
        agent_id: row.agent_id,
        context: row.context,
        memory_preview: row.memory_preview,
        shelby_object_id: row.shelby_object_id,
        aptos_tx_hash: row.aptos_tx_hash,
        content_hash: row.content_hash,
        memory_type: row.memory_type,
        metadata: row.metadata ?? {},
      })
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

  async getById(id: string): Promise<MemoryRow | null> {
    const { data, error } = await this.client
      .from('memories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as MemoryRow;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.client
      .from('memories')
      .delete()
      .eq('id', id);

    if (error) throw new Error(`Supabase delete failed: ${error.message}`);
  }
}
