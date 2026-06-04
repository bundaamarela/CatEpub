import { describe, expect, it } from 'vitest';

import { chunkText } from '@/lib/ai/chunker';

describe('chunkText', () => {
  it('returns empty for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   ')).toEqual([]);
  });

  it('returns one chunk for short text', () => {
    const out = chunkText('one two three four');
    expect(out).toHaveLength(1);
    expect(out[0]?.text).toBe('one two three four');
    expect(out[0]?.index).toBe(0);
  });

  it('respects maxWords boundary', () => {
    const text = Array.from({ length: 50 }, (_, i) => `w${i}`).join(' ');
    const out = chunkText(text, { maxWords: 10, overlapWords: 0 });
    expect(out).toHaveLength(5);
    expect(out[0]?.text.split(' ').length).toBe(10);
  });

  it('overlaps consecutive chunks by overlapWords', () => {
    const text = Array.from({ length: 30 }, (_, i) => `w${i}`).join(' ');
    const out = chunkText(text, { maxWords: 10, overlapWords: 3 });
    // Stride = 7; window 0..10, then 7..17, then 14..24, then 21..30 (last)
    expect(out).toHaveLength(4);
    const c0 = out[0]!.text.split(' ');
    const c1 = out[1]!.text.split(' ');
    // Overlap of 3 between c0 tail and c1 head.
    expect(c0.slice(-3)).toEqual(c1.slice(0, 3));
  });

  it('normalizes whitespace', () => {
    const out = chunkText('   one\n\ntwo\t three  ');
    expect(out[0]?.text).toBe('one two three');
  });

  it('assigns sequential indices starting at 0', () => {
    const text = Array.from({ length: 25 }, () => 'word').join(' ');
    const out = chunkText(text, { maxWords: 10, overlapWords: 0 });
    expect(out.map((c) => c.index)).toEqual([0, 1, 2]);
  });

  it('handles defaults (500 words, 50 overlap)', () => {
    const text = Array.from({ length: 1000 }, () => 'word').join(' ');
    const out = chunkText(text);
    // Stride = 450; chunks at 0, 450, 900 → 3 windows
    expect(out.length).toBeGreaterThanOrEqual(3);
    expect(out[0]?.text.split(' ').length).toBe(500);
  });
});
