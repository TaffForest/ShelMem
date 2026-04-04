import { describe, it, expect } from 'vitest';
import { ShelbyStorage, computeHash } from '../shelby.js';

describe('computeHash', () => {
  it('returns consistent SHA-256 hex for the same input', () => {
    const data = new TextEncoder().encode('hello world');
    const hash1 = computeHash(data);
    const hash2 = computeHash(data);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('returns different hashes for different input', () => {
    const a = computeHash(new TextEncoder().encode('memory A'));
    const b = computeHash(new TextEncoder().encode('memory B'));
    expect(a).not.toBe(b);
  });

  it('matches known SHA-256 value', () => {
    const data = new TextEncoder().encode('test');
    const hash = computeHash(data);
    expect(hash).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08');
  });
});

describe('ShelbyStorage (mock mode)', () => {
  const storage = new ShelbyStorage({ mock: true });

  it('upload returns shelby address, proof, and content hash', async () => {
    const data = new TextEncoder().encode('test memory content');
    const result = await storage.upload(data, 'test_blob');

    expect(result.shelbyAddress).toMatch(/^shelby:\/\//);
    expect(result.shelbyProof).toMatch(/^0x/);
    expect(result.contentHash).toHaveLength(64);
  });

  it('content hash matches computeHash of the same data', async () => {
    const data = new TextEncoder().encode('verify this');
    const result = await storage.upload(data, 'verify_blob');
    const expected = computeHash(data);

    expect(result.contentHash).toBe(expected);
  });

  it('different content produces different addresses', async () => {
    const a = await storage.upload(new TextEncoder().encode('alpha'), 'a');
    const b = await storage.upload(new TextEncoder().encode('beta'), 'b');

    expect(a.shelbyAddress).not.toBe(b.shelbyAddress);
    expect(a.contentHash).not.toBe(b.contentHash);
  });

  it('download throws in mock mode', async () => {
    await expect(storage.download('shelby://fakehash')).rejects.toThrow('mock mode');
  });
});
