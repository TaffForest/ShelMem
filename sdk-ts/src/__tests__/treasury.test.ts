import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ShelMem } from '../index.js';

// Mock the entire supabase module
vi.mock('@supabase/supabase-js', () => {
  const makeChain = (resolveData: any = null): any => {
    const chain: any = {
      insert: (data: any) => {
        chain._insertedData = data;
        return chain;
      },
      select: () => chain,
      eq: () => chain,
      order: () => chain,
      limit: () => chain,
      single: async () => ({
        data: chain._insertedData ? {
          id: 'test-uuid',
          created_at: '2026-01-01T00:00:00Z',
          ...chain._insertedData,
        } : resolveData,
        error: null,
      }),
      update: () => chain,
      delete: () => chain,
      rpc: async () => ({ data: [], error: null }),
    };
    // For query().limit() — needs to resolve as async
    const origLimit = chain.limit;
    chain.limit = (...args: any[]) => {
      const c = origLimit.apply(chain, args);
      // Make it thenable for await
      c.then = async (resolve: any) => resolve({ data: resolveData ?? [], error: null });
      return c;
    };
    return chain;
  };

  return {
    createClient: () => {
      const chains = new Map();
      return {
        from: () => makeChain(),
        rpc: async () => ({ data: [], error: null }),
      };
    },
  };
});

describe('Treasury methods', () => {
  let mem: ShelMem;

  beforeEach(() => {
    mem = new ShelMem({
      supabaseUrl: 'https://fake.supabase.co',
      supabaseKey: 'fake-key',
      mock: true,
    });
  });

  describe('recordTransaction', () => {
    it('sets memory_type to transaction_record', async () => {
      const result = await mem.recordTransaction({
        agentId: 'agent-01',
        memory: 'Paid 100 APT to merchant',
        context: 'payments',
        amount: 100,
        currency: 'APT',
        counterparty: '0xabc123',
      });
      expect(result.memory_type).toBe('transaction_record');
    });

    it('defaults txStatus to pending', async () => {
      const result = await mem.recordTransaction({
        agentId: 'agent-01',
        memory: 'Sent payment',
        context: 'payments',
        amount: 50,
        currency: 'USDT',
        counterparty: '0xdef456',
      });
      expect(result.tx_status).toBe('pending');
    });

    it('includes amount, currency, counterparty, and custom txStatus', async () => {
      const result = await mem.recordTransaction({
        agentId: 'agent-01',
        memory: 'Received 200 USDT',
        context: 'payments',
        amount: 200,
        currency: 'USDT',
        counterparty: '0x999',
        txStatus: 'confirmed',
      });
      expect(result.amount).toBe(200);
      expect(result.currency).toBe('USDT');
      expect(result.counterparty).toBe('0x999');
      expect(result.tx_status).toBe('confirmed');
    });
  });

  describe('recordBalanceSnapshot', () => {
    it('sets memory_type to balance_snapshot', async () => {
      const result = await mem.recordBalanceSnapshot({
        agentId: 'agent-01',
        memory: 'Current balance: 500 APT',
        context: 'treasury',
        amount: 500,
        currency: 'APT',
      });
      expect(result.memory_type).toBe('balance_snapshot');
    });

    it('includes amount and currency', async () => {
      const result = await mem.recordBalanceSnapshot({
        agentId: 'agent-01',
        memory: 'Balance snapshot',
        context: 'treasury',
        amount: 1000.50,
        currency: 'USDT',
      });
      expect(result.amount).toBe(1000.50);
      expect(result.currency).toBe('USDT');
    });
  });

  describe('getLatestBalance', () => {
    it('returns null when no balance_snapshot exists', async () => {
      // Spy on metadata.query to return empty array
      vi.spyOn((mem as any).metadata, 'query').mockResolvedValue([]);
      const result = await mem.getLatestBalance('agent-01');
      expect(result).toBeNull();
    });

    it('returns the most recent balance when one exists', async () => {
      const mockRow = {
        id: 'id-1',
        agent_id: 'agent-01',
        context: 'treasury',
        memory_preview: 'Balance: 750 APT',
        shelby_object_id: 'shelby://mock/bal_1',
        aptos_tx_hash: '0xabc',
        content_hash: 'hash1',
        memory_type: 'balance_snapshot',
        verified: null,
        metadata: {},
        amount: 750,
        currency: 'APT',
        counterparty: null,
        tx_status: null,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      };

      // Spy on metadata.query
      vi.spyOn((mem as any).metadata, 'query').mockResolvedValue([mockRow]);
      // Pre-seed mock store
      (mem as any).storage.mockStore.set('shelby://mock/bal_1', new TextEncoder().encode('Balance: 750 APT'));

      const result = await mem.getLatestBalance('agent-01');
      expect(result).not.toBeNull();
      expect(result!.memory_type).toBe('balance_snapshot');
      expect(result!.amount).toBe(750);
      expect(result!.currency).toBe('APT');
    });
  });
});
