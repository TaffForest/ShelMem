export type MemoryType = 'fact' | 'decision' | 'preference' | 'observation' | 'transaction_record' | 'balance_snapshot' | 'spending_policy';

export type TreasuryMemoryType = 'transaction_record' | 'balance_snapshot' | 'spending_policy';

export interface ShelMemConfig {
  shelbyApiKey?: string;
  aptosPrivateKey?: string;
  supabaseUrl: string;
  supabaseKey: string;
  network?: 'testnet' | 'shelbynet';
  mock?: boolean;
  encrypt?: boolean;
  embeddingProvider?: (text: string) => Promise<number[]>;
}

export interface TreasuryFields {
  amount?: number;
  currency?: string;
  counterparty?: string;
  tx_status?: string;
}

export interface WriteResult {
  shelby_object_id: string;
  aptos_tx_hash: string;
  content_hash: string;
  memory_type: MemoryType;
  timestamp: string;
  amount?: number | null;
  currency?: string | null;
  counterparty?: string | null;
  tx_status?: string | null;
}

export interface MemoryRecord {
  memory: string;
  context: string;
  timestamp: string;
  aptos_tx_hash: string;
  content_hash: string;
  memory_type: MemoryType;
  verified: boolean | null;
  amount?: number | null;
  currency?: string | null;
  counterparty?: string | null;
  tx_status?: string | null;
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
  amount: number | null;
  currency: string | null;
  counterparty: string | null;
  tx_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  id: string;
  agent_id: string;
  context: string;
  memory_preview: string | null;
  memory_type: string | null;
  content_hash: string | null;
  aptos_tx_hash: string | null;
  created_at: string;
  similarity: number;
}

export interface RecordTransactionParams {
  agentId: string;
  memory: string;
  context: string;
  amount: number;
  currency: string;
  counterparty: string;
  txStatus?: string;
  metadata?: Record<string, unknown>;
}

export interface RecordBalanceParams {
  agentId: string;
  memory: string;
  context: string;
  amount: number;
  currency: string;
  metadata?: Record<string, unknown>;
}
