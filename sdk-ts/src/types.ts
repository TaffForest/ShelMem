export type MemoryType = 'fact' | 'decision' | 'preference' | 'observation';

export interface ShelMemConfig {
  shelbyApiKey?: string;
  aptosPrivateKey?: string;
  supabaseUrl: string;
  supabaseKey: string;
  network?: 'testnet' | 'shelbynet';
  mock?: boolean;
}

export interface WriteResult {
  shelby_object_id: string;
  aptos_tx_hash: string;
  content_hash: string;
  memory_type: MemoryType;
  timestamp: string;
}

export interface MemoryRecord {
  memory: string;
  context: string;
  timestamp: string;
  aptos_tx_hash: string;
  content_hash: string;
  memory_type: MemoryType;
  verified: boolean | null;
}

export interface VerifyResult {
  verified: boolean;
  content_hash: string;
  expected_hash: string;
}

export interface MemoryRow {
  id: string;
  agent_id: string;
  context: string;
  memory_preview: string | null;
  shelby_object_id: string;
  aptos_tx_hash: string | null;
  content_hash: string | null;
  memory_type: string | null;
  verified: boolean | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
