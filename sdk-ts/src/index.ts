import { ShelbyStorage } from './shelby.js';
import { MemoryMetadata } from './supabase.js';
import type { ShelMemConfig, WriteResult, MemoryRecord } from './types.js';

export type { ShelMemConfig, WriteResult, MemoryRecord, MemoryRow } from './types.js';

export class ShelMem {
  private storage: ShelbyStorage;
  private metadata: MemoryMetadata;

  constructor(config: ShelMemConfig) {
    this.storage = new ShelbyStorage({
      apiKey: config.shelbyApiKey,
      privateKey: config.aptosPrivateKey,
      network: config.network,
      mock: config.mock,
    });

    this.metadata = new MemoryMetadata(config.supabaseUrl, config.supabaseKey);
  }

  async write(
    agent_id: string,
    memory: string,
    context: string,
    metadata?: Record<string, unknown>
  ): Promise<WriteResult> {
    // 1. Serialise memory to bytes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(memory);

    // 2. Upload to Shelby — use agent_id + timestamp as blob name
    const blobName = `${agent_id}_${Date.now()}`;
    const { shelbyAddress, shelbyProof } = await this.storage.upload(bytes, blobName);

    // 3. Record metadata in Supabase
    const now = new Date().toISOString();
    const preview = memory.slice(0, 200);

    const row = await this.metadata.insert({
      agent_id,
      context,
      memory_preview: preview,
      shelby_object_id: shelbyAddress,
      aptos_tx_hash: shelbyProof,
      metadata,
    });

    return {
      shelby_object_id: shelbyAddress,
      aptos_tx_hash: shelbyProof,
      timestamp: row.created_at,
    };
  }

  async recall(
    agent_id: string,
    context?: string,
    limit: number = 10
  ): Promise<MemoryRecord[]> {
    // 1. Query Supabase for metadata
    const rows = await this.metadata.query(agent_id, context, limit);

    // 2. For each row, retrieve content from Shelby
    const decoder = new TextDecoder();
    const results: MemoryRecord[] = [];

    for (const row of rows) {
      try {
        const bytes = await this.storage.download(row.shelby_object_id);
        const memoryText = decoder.decode(bytes);

        results.push({
          memory: memoryText,
          context: row.context,
          timestamp: row.created_at,
          aptos_tx_hash: row.aptos_tx_hash ?? '',
        });
      } catch {
        // If download fails (e.g. mock mode), use preview from metadata
        results.push({
          memory: row.memory_preview ?? '[content unavailable]',
          context: row.context,
          timestamp: row.created_at,
          aptos_tx_hash: row.aptos_tx_hash ?? '',
        });
      }
    }

    return results;
  }

  async delete(id: string): Promise<void> {
    await this.metadata.delete(id);
  }
}
