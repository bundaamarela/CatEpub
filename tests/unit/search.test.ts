import { describe, expect, it } from 'vitest';

import { searchInBook } from '@/lib/epub/search';
import type { FoliateBook } from 'foliate-js/view.js';

// Minimal DOM builder — creates a document with a <body> containing one <p>.
const makeDoc = (text: string): Document => {
  const doc = document.implementation.createHTMLDocument('');
  const p = doc.createElement('p');
  p.textContent = text;
  doc.body.appendChild(p);
  return doc;
};

// Builds a minimal FoliateBook mock from an array of text strings (one per section).
const makeBook = (sections: string[]): FoliateBook => ({
  sections: sections.map((text) => ({
    createDocument: async () => makeDoc(text),
    unload: () => undefined,
  })),
  // Satisfy the rest of the interface with minimal stubs.
  toc: [],
  metadata: {} as FoliateBook['metadata'],
  dir: 'ltr',
} as unknown as FoliateBook);

// Fake cfiFor: returns a deterministic string so we can assert presence.
const fakeCfi = (i: number, _r: Range): string => `epubcfi(/6/${i * 2 + 2}!/4/2)`;

describe('searchInBook', () => {
  it('returns empty array for empty query', async () => {
    const book = makeBook(['Hello world']);
    const hits = await searchInBook(book, { query: '', cfiFor: fakeCfi });
    expect(hits).toEqual([]);
  });

  it('finds a single hit in one section', async () => {
    const book = makeBook(['The quick brown fox jumps over the lazy dog']);
    const hits = await searchInBook(book, { query: 'fox', cfiFor: fakeCfi });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.cfi).toBeDefined();
    expect(hits[0]?.excerpt).toContain('fox');
  });

  it('is case-insensitive', async () => {
    const book = makeBook(['Hello World']);
    const hits = await searchInBook(book, { query: 'hello', cfiFor: fakeCfi });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.excerpt).toContain('Hello');
  });

  it('finds hits across multiple sections', async () => {
    const book = makeBook(['needle in section one', 'nothing here', 'another needle']);
    const hits = await searchInBook(book, { query: 'needle', cfiFor: fakeCfi });
    expect(hits).toHaveLength(2);
    expect(hits[0]?.sectionIndex).toBe(0);
    expect(hits[1]?.sectionIndex).toBe(2);
  });

  it('provides 30-char context window around the match', async () => {
    const prefix = 'a'.repeat(40);
    const suffix = 'b'.repeat(40);
    const book = makeBook([`${prefix}MATCH${suffix}`]);
    const hits = await searchInBook(book, { query: 'MATCH', cfiFor: fakeCfi });
    expect(hits).toHaveLength(1);
    const hit = hits[0]!;
    // excerpt = (up to 30 before) + MATCH + (up to 30 after)
    expect(hit.matchStart).toBe(30); // exactly 30 'a's before
    expect(hit.matchEnd).toBe(35);   // 30 + len('MATCH')
    expect(hit.excerpt.slice(hit.matchStart, hit.matchEnd)).toBe('MATCH');
  });

  it('returns multiple hits within the same text node', async () => {
    const book = makeBook(['cat and cat and cat']);
    const hits = await searchInBook(book, { query: 'cat', cfiFor: fakeCfi });
    expect(hits).toHaveLength(3);
  });

  it('respects maxHits cap', async () => {
    const text = Array.from({ length: 20 }, () => 'word').join(' ');
    const book = makeBook([text]);
    const hits = await searchInBook(book, { query: 'word', cfiFor: fakeCfi, maxHits: 5 });
    expect(hits.length).toBe(5);
  });

  it('returns early when signal is aborted before the search starts', async () => {
    const book = makeBook(['needle here']);
    const ctrl = new AbortController();
    ctrl.abort();
    const hits = await searchInBook(book, {
      query: 'needle',
      signal: ctrl.signal,
      cfiFor: fakeCfi,
    });
    expect(hits).toHaveLength(0);
  });

  it('stops mid-search when signal is aborted between sections', async () => {
    const ctrl = new AbortController();
    // Abort after first section resolves (use createDocument as hook).
    let calls = 0;
    const book: FoliateBook = {
      sections: [
        {
          createDocument: async () => {
            calls++;
            if (calls === 1) ctrl.abort();
            return makeDoc('needle');
          },
          unload: () => undefined,
        },
        {
          createDocument: async () => {
            calls++;
            return makeDoc('needle');
          },
          unload: () => undefined,
        },
      ],
      toc: [],
      metadata: {} as FoliateBook['metadata'],
      dir: 'ltr',
    } as unknown as FoliateBook;

    const hits = await searchInBook(book, {
      query: 'needle',
      signal: ctrl.signal,
      cfiFor: fakeCfi,
    });
    // First section produced 1 hit; abort fires before second section.
    expect(hits.length).toBeLessThanOrEqual(1);
  });

  it('skips sections that throw during createDocument', async () => {
    const book: FoliateBook = {
      sections: [
        {
          createDocument: async () => { throw new Error('parse error'); },
          unload: () => undefined,
        },
        {
          createDocument: async () => makeDoc('needle'),
          unload: () => undefined,
        },
      ],
      toc: [],
      metadata: {} as FoliateBook['metadata'],
      dir: 'ltr',
    } as unknown as FoliateBook;

    const hits = await searchInBook(book, { query: 'needle', cfiFor: fakeCfi });
    expect(hits).toHaveLength(1);
    expect(hits[0]?.sectionIndex).toBe(1);
  });
});
