import { ShelbyStorage, computeHash } from './shelby.js';
import { MemoryMetadata } from './supabase.js';
import type { ShelMemConfig, WriteResult, MemoryRecord, MemoryType, VerifyResult } from './types.js';

export type { ShelMemConfig, WriteResult, MemoryRecord, MemoryRow, MemoryType, VerifyResult } from './types.js';
export { computeHash } from './shelby.js';

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

  /**
   * Write a memory to decentralised storage with on-chain proof.
   * Content is hashed (SHA-256) before upload for tamper detection.
   */
  async write(
    agent_id: string,
    memory: string,
    context: string,
    memory_type: MemoryType = 'observation',
    metadata?: Record<string, unknown>
  ): Promise<WriteResult> {
    // 1. Serialise memory to bytes
    const encoder = new TextEncoder();
    const bytes = encoder.encode(memory);

    // 2. Upload to Shelby — hash is computed inside upload
    const blobName = `${agent_id}_${Date.now()}`;
    const { shelbyAddress, shelbyProof, contentHash } = await this.storage.upload(bytes, blobName);

    // 3. Record metadata in Supabase with content hash
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
    });

    return {
      shelby_object_id: shelbyAddress,
      aptos_tx_hash: shelbyProof,
      content_hash: contentHash,
      memory_type,
      timestamp: row.created_at,
    };
  }

  /**
   * Recall memories for an agent. Each memory is verified against its
   * stored content hash — if the content was tampered with on Shelby,
   * verified will be false.
   */
  async recall(
    agent_id: string,
    context?: string,
    limit: number = 10,
    memory_type?: MemoryType
  ): Promise<MemoryRecord[]> {
    // 1. Query Supabase for metadata
    const rows = await this.metadata.query(agent_id, context, memory_type, limit);

    // 2. For each row, retrieve content and verify hash
    const decoder = new TextDecoder();
    const results: MemoryRecord[] = [];

    for (const row of rows) {
      let memoryText: string;
      let verified: boolean | null = null;

      try {
        const bytes = await this.storage.download(row.shelby_object_id);
        memoryText = decoder.decode(bytes);

        // 3. Verify content integrity
        if (row.content_hash) {
          const actualHash = computeHash(bytes);
          verified = actualHash === row.content_hash;
        }
      } catch {
        // If download fails (e.g. mock mode), use preview
        memoryText = row.memory_preview ?? '[content unavailable]';
        // Can't verify without content — leave as null
        verified = null;
      }

      results.push({
        memory: memoryText,
        context: row.context,
        timestamp: row.created_at,
        aptos_tx_hash: row.aptos_tx_hash ?? '',
        content_hash: row.content_hash ?? '',
        memory_type: (row.memory_type as MemoryType) ?? 'observation',
        verified,
      });
    }

    return results;
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
    await this.metadata.delete(id);
  }
}
