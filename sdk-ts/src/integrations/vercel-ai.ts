/**
 * ShelMem Vercel AI SDK Integration
 *
 * Provides `memorize` and `remember` tools for any Vercel AI SDK agent.
 * Every memory is stored on Shelby with SHA-256 hashing and Aptos proof.
 *
 * Usage:
 *   import { createShelMemTools } from 'shelmem/integrations/vercel-ai';
 *   import { generateText } from 'ai';
 *
 *   const tools = createShelMemTools({
 *     agentId: 'my-agent',
 *     supabaseUrl: process.env.SUPABASE_URL,
 *     supabaseKey: process.env.SUPABASE_KEY,
 *   });
 *
 *   const result = await generateText({
 *     model: yourModel,
 *     tools,
 *     prompt: 'Remember that the user likes dark mode',
 *   });
 */

import { ShelMem } from '../index.js';
import type { MemoryType } from '../types.js';

export interface ShelMemToolsConfig {
  agentId: string;
  supabaseUrl: string;
  supabaseKey: string;
  shelbyApiKey?: string;
  aptosPrivateKey?: string;
  network?: 'testnet' | 'shelbynet';
  mock?: boolean;
}

/**
 * Creates Vercel AI SDK-compatible tool definitions for ShelMem.
 * Returns an object with `memorize` and `remember` tools.
 */
export function createShelMemTools(config: ShelMemToolsConfig) {
  const mem = new ShelMem({
    supabaseUrl: config.supabaseUrl,
    supabaseKey: config.supabaseKey,
    shelbyApiKey: config.shelbyApiKey,
    aptosPrivateKey: config.aptosPrivateKey,
    network: config.network,
    mock: config.mock,
  });

  return {
    memorize: {
      description: 'Store a memory for later recall. Use this when the user shares preferences, facts, or decisions worth remembering. Each memory is tamper-proof with SHA-256 hashing and on-chain Aptos proof.',
      parameters: {
        type: 'object' as const,
        properties: {
          memory: {
            type: 'string' as const,
            description: 'The content to remember',
          },
          context: {
            type: 'string' as const,
            description: 'Category label (e.g. "preferences", "decisions", "facts")',
          },
          memory_type: {
            type: 'string' as const,
            enum: ['fact', 'decision', 'preference', 'observation'],
            description: 'Type of memory: fact, decision, preference, or observation',
          },
        },
        required: ['memory', 'context'],
      },
      execute: async ({ memory, context, memory_type }: {
        memory: string;
        context: string;
        memory_type?: MemoryType;
      }) => {
        const result = await mem.write(
          config.agentId,
          memory,
          context,
          memory_type || 'observation',
        );
        return {
          stored: true,
          content_hash: result.content_hash,
          shelby_object_id: result.shelby_object_id,
          aptos_tx_hash: result.aptos_tx_hash,
          timestamp: result.timestamp,
        };
      },
    },

    remember: {
      description: 'Recall stored memories by context. Use this to retrieve previously stored preferences, facts, or decisions. Each recalled memory includes tamper verification status.',
      parameters: {
        type: 'object' as const,
        properties: {
          context: {
            type: 'string' as const,
            description: 'Category to recall from (e.g. "preferences", "decisions")',
          },
          memory_type: {
            type: 'string' as const,
            enum: ['fact', 'decision', 'preference', 'observation'],
            description: 'Filter by memory type',
          },
          limit: {
            type: 'number' as const,
            description: 'Maximum number of memories to recall (default 5)',
          },
        },
        required: ['context'],
      },
      execute: async ({ context, memory_type, limit }: {
        context: string;
        memory_type?: MemoryType;
        limit?: number;
      }) => {
        const memories = await mem.recall(
          config.agentId,
          context,
          limit || 5,
          memory_type,
        );
        return {
          count: memories.length,
          memories: memories.map(m => ({
            memory: m.memory,
            memory_type: m.memory_type,
            verified: m.verified,
            timestamp: m.timestamp,
          })),
        };
      },
    },
  };
}
