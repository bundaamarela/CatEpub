import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getCurrentPeriod, getQuoteForPeriod, loadQuotes, type Quote } from '@/lib/quotes/quotes';

const PERIOD = 8 * 60 * 60 * 1000;

const sample: Quote[] = [
  { text: 'A', author: 'AuthorA' },
  { text: 'B', author: 'AuthorB', source: 'Book' },
  { text: 'C', author: 'AuthorC' },
];

describe('getQuoteForPeriod', () => {
  it('returns the same quote within the same 8-hour period', () => {
    const t1 = 100 * PERIOD + 1000;
    const t2 = 100 * PERIOD + PERIOD - 1;
    expect(getQuoteForPeriod(sample, t1)).toEqual(getQuoteForPeriod(sample, t2));
  });

  it('returns a different quote in the next 8-hour period', () => {
    const a = getQuoteForPeriod(sample, 100 * PERIOD);
    const b = getQuoteForPeriod(sample, 101 * PERIOD);
    expect(a).not.toEqual(b);
  });

  it('selection is deterministic for a fixed period', () => {
    const t = 12345 * PERIOD + 17;
    expect(getQuoteForPeriod(sample, t)).toBe(getQuoteForPeriod(sample, t));
  });

  it('uses fallback when the provided array is empty', () => {
    const q = getQuoteForPeriod([], 0);
    expect(q.text.length).toBeGreaterThan(0);
    expect(q.author.length).toBeGreaterThan(0);
  });

  it('cycles through all quotes across successive periods', () => {
    const seen = new Set<string>();
    for (let i = 0; i < sample.length; i += 1) {
      seen.add(getQuoteForPeriod(sample, i * PERIOD).text);
    }
    expect(seen.size).toBe(sample.length);
  });
});

describe('getCurrentPeriod', () => {
  it('increments after 8 hours', () => {
    expect(getCurrentPeriod(0)).toBe(0);
    expect(getCurrentPeriod(PERIOD - 1)).toBe(0);
    expect(getCurrentPeriod(PERIOD)).toBe(1);
  });
});

describe('loadQuotes', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns parsed array when fetch succeeds', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => sample,
    } as Response);
    const out = await loadQuotes();
    expect(out).toEqual(sample);
  });

  it('returns fallback when fetch fails', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('network'));
    const out = await loadQuotes();
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]!.author.length).toBeGreaterThan(0);
  });

  it('returns fallback when response is not ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => [],
    } as Response);
    const out = await loadQuotes();
    expect(out.length).toBeGreaterThan(0);
  });

  it('returns fallback when array is empty', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);
    const out = await loadQuotes();
    expect(out.length).toBeGreaterThan(0);
  });

  it('filters out invalid entries', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { text: 'ok', author: 'A' },
        { text: 123, author: 'B' },
        { author: 'no text' },
        null,
        'not an object',
      ],
    } as Response);
    const out = await loadQuotes();
    expect(out).toHaveLength(1);
    expect(out[0]!.text).toBe('ok');
  });
});
