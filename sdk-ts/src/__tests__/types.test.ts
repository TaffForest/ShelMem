import { describe, it, expect } from 'vitest';
import type { MemoryType, WriteResult, MemoryRecord, VerifyResult } from '../types.js';

describe('MemoryType', () => {
  it('accepts valid memory types', () => {
    const types: MemoryType[] = ['fact', 'decision', 'preference', 'observation'];
    expect(types).toHaveLength(4);
  });
});

describe('WriteResult shape', () => {
  it('has all required fields', () => {
    const result: WriteResult = {
      shelby_object_id: 'shelby://abc123',
      aptos_tx_hash: '0xdef456',
      content_hash: 'aabbccdd',
      memory_type: 'decision',
      timestamp: '2026-01-01T00:00:00Z',
    };

    expect(result.shelby_object_id).toContain('shelby://');
    expect(result.aptos_tx_hash).toMatch(/^0x/);
    expect(result.content_hash).toBeTruthy();
    expect(result.memory_type).toBe('decision');
    expect(result.timestamp).toBeTruthy();
  });
});

describe('MemoryRecord shape', () => {
  it('includes verification status', () => {
    const record: MemoryRecord = {
      memory: 'User prefers dark mode',
      context: 'preferences',
      timestamp: '2026-01-01T00:00:00Z',
      aptos_tx_hash: '0xabc',
      content_hash: 'deadbeef',
      memory_type: 'preference',
      verified: true,
    };

    expect(record.verified).toBe(true);
    expect(record.memory_type).toBe('preference');
  });

  it('verified can be null when unverifiable', () => {
    const record: MemoryRecord = {
      memory: 'test',
      context: 'ctx',
      timestamp: '',
      aptos_tx_hash: '',
      content_hash: '',
      memory_type: 'observation',
      verified: null,
    };

    expect(record.verified).toBeNull();
  });
});

describe('VerifyResult shape', () => {
  it('shows match when hashes are equal', () => {
    const result: VerifyResult = {
      verified: true,
      content_hash: 'abc123',
      expected_hash: 'abc123',
    };

    expect(result.verified).toBe(true);
    expect(result.content_hash).toBe(result.expected_hash);
  });

  it('shows mismatch when hashes differ', () => {
    const result: VerifyResult = {
      verified: false,
      content_hash: 'abc123',
      expected_hash: 'xyz789',
    };

    expect(result.verified).toBe(false);
    expect(result.content_hash).not.toBe(result.expected_hash);
  });
});
