import { ShelbyStorage, computeHash } from './shelby.js';
import { MemoryMetadata } from './supabase.js';
import type { ShelMemConfig, WriteResult, MemoryRecord, MemoryType, VerifyResult, SearchResult } from './types.js';

export type { ShelMemConfig, WriteResult, MemoryRecord, MemoryRow, MemoryType, VerifyResult, SearchResult } from './types.js';
export { computeHash } from './shelby.js';
export { openaiEmbeddings } from './embeddings.js';
export type { EmbeddingProvider } from './embeddings.js';
export { createShelMemTools } from './integrations/vercel-ai.js';
export type { ShelMemToolsConfig } from './integrations/vercel-ai.js';

export class ShelMem {
  private storage: ShelbyStorage;
  private metadata: MemoryMetadata;
  private embed?: (text: string) => Promise<number[]>;

  constructor(config: ShelMemConfig) {
    this.storage = new ShelbyStorage({
      apiKey: config.shelbyApiKey,
      privateKey: config.aptosPrivateKey,
      network: config.network,
      mock: config.mock,
    });

    this.metadata = new MemoryMetadata(config.supabaseUrl, config.supabaseKey);
    this.embed = config.embeddingProvider;
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
    metadata?: Record<string, unknown>
  ): Promise<WriteResult> {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(memory);

    const blobName = `${agent_id}_${Date.now()}`;
    const { shelbyAddress, shelbyProof, contentHash } = await this.storage.upload(bytes, blobName);

    // Generate embedding if provider is configured
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
    const results: MemoryRecord[] = [];

    for (const row of rows) {
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
   * Semantic search — find memories by meaning using vector similarity.
   * Requires an embedding provider to be configured.
   *
   * @param query - Natural language query (e.g. "what do I know about ETH?")
   * @param agent_id - Optional agent filter
   * @param limit - Max results (default 10)
   * @param threshold - Minimum similarity 0-1 (default 0.5)
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
    await this.metadata.delete(id);
  }
}
