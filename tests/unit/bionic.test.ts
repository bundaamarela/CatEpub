import { describe, expect, it } from 'vitest';

import { applyBionicToText } from '@/lib/utils/bionic';

describe('applyBionicToText', () => {
  it('bolds the first ~40% of a word', () => {
    const out = applyBionicToText('hello');
    // ceil(5 * 0.4) = 2 → <b>he</b>llo
    expect(out).toBe('<b>he</b>llo');
  });

  it('handles single-character words', () => {
    const out = applyBionicToText('a');
    expect(out).toBe('<b>a</b>');
  });

  it('processes multiple words', () => {
    const out = applyBionicToText('The quick brown');
    expect(out).toContain('<b>');
    // Each word should have a bold part
    expect(out.match(/<b>/g)?.length).toBe(3);
  });

  it('preserves whitespace between words', () => {
    const out = applyBionicToText('hello world');
    expect(out).toContain(' ');
  });

  it('does not modify empty string', () => {
    const out = applyBionicToText('');
    expect(out).toBe('');
  });

  it('handles two-letter words with at least 1 bold char', () => {
    const out = applyBionicToText('ab');
    // ceil(2 * 0.4) = 1 → <b>a</b>b
    expect(out).toBe('<b>a</b>b');
  });
});
