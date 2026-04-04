import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required');
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Re-export as `supabase` for convenience (lazy getter)
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop];
  },
});

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
