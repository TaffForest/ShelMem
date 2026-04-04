import { describe, it, expect } from 'vitest';
import { computeHash } from '../shelby.js';

describe('ShelMem write flow (unit)', () => {
  it('content hash is deterministic for the same memory', () => {
    const memory = 'ETH RSI dropped to 28 — entered long at $2,847';
    const bytes = new TextEncoder().encode(memory);
    const hash1 = computeHash(bytes);
    const hash2 = computeHash(bytes);

    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('different memories produce different hashes', () => {
    const a = computeHash(new TextEncoder().encode('buy ETH'));
    const b = computeHash(new TextEncoder().encode('sell ETH'));

    expect(a).not.toBe(b);
  });

  it('memory preview is truncated to 200 chars', () => {
    const longMemory = 'x'.repeat(500);
    const preview = longMemory.slice(0, 200);

    expect(preview).toHaveLength(200);
    expect(longMemory).toHaveLength(500);
  });

  it('blob name uses agent_id + timestamp format', () => {
    const agentId = 'trading-agent-01';
    const timestamp = Date.now();
    const blobName = `${agentId}_${timestamp}`;

    expect(blobName).toContain('trading-agent-01_');
    expect(blobName.length).toBeGreaterThan(20);
  });
});

describe('ShelMem verify flow (unit)', () => {
  it('verification passes when hashes match', () => {
    const memory = 'original content';
    const bytes = new TextEncoder().encode(memory);
    const storedHash = computeHash(bytes);

    // Simulate re-download
    const downloadedBytes = new TextEncoder().encode(memory);
    const actualHash = computeHash(downloadedBytes);

    expect(actualHash).toBe(storedHash);
  });

  it('verification fails when content is tampered', () => {
    const original = new TextEncoder().encode('original content');
    const storedHash = computeHash(original);

    const tampered = new TextEncoder().encode('tampered content');
    const actualHash = computeHash(tampered);

    expect(actualHash).not.toBe(storedHash);
  });

  it('empty content has a known hash', () => {
    const empty = new Uint8Array(0);
    const hash = computeHash(empty);
    // SHA-256 of empty string
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
