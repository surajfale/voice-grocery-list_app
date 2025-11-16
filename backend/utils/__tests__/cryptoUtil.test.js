import { describe, it, expect } from 'vitest';
import { computeSha256 } from '../cryptoUtil.js';

describe('computeSha256', () => {
  it('produces deterministic hashes for buffers and strings', () => {
    const text = 'hello-world';
    const hashFromString = computeSha256(text);
    const hashFromBuffer = computeSha256(Buffer.from(text));

    expect(hashFromString).toMatch(/^[a-f0-9]{64}$/);
    expect(hashFromString).toBe(hashFromBuffer);
  });

  it('creates different hashes for different inputs', () => {
    expect(computeSha256('receipt-a')).not.toBe(computeSha256('receipt-b'));
  });
});


