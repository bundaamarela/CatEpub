import { describe, expect, it } from 'vitest';

import { cosineSimilarity } from '@/lib/ai/rag';

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1, 6);
    expect(cosineSimilarity([0.5, 0.5, 0.5], [0.5, 0.5, 0.5])).toBeCloseTo(1, 6);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [-1, -2, -3])).toBeCloseTo(-1, 6);
  });

  it('returns 0 when either vector is zero', () => {
    expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
  });

  it('returns 0 for empty input', () => {
    expect(cosineSimilarity([], [])).toBe(0);
    expect(cosineSimilarity([], [1, 2])).toBe(0);
  });

  it('handles mismatched lengths by truncating to the shorter', () => {
    // Both vectors have a [1, 0] prefix → similarity over the first 2 dims.
    const score = cosineSimilarity([1, 0, 99], [1, 0]);
    expect(score).toBeCloseTo(1, 6);
  });

  it('produces values close to expected for known case', () => {
    // a = (1, 1), b = (1, 0) → cos = 1 / sqrt(2)
    const expected = 1 / Math.sqrt(2);
    expect(cosineSimilarity([1, 1], [1, 0])).toBeCloseTo(expected, 6);
  });

  it('works with Float32Array (typical embedding type)', () => {
    const a = new Float32Array([0.6, 0.8]);
    const b = new Float32Array([0.6, 0.8]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 6);
  });
});
