import { describe, expect, it } from 'vitest';

import {
  buildBacklinkIndex,
  extractLinks,
  getAutocompleteCandidates,
  resolveLink,
} from '@/lib/knowledge/backlinks';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';

const makeNote = (id: string, title: string, body: string): Note => ({
  id,
  bookId: 'book-1',
  title,
  body,
  tags: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const makeBook = (id: string, title: string): Book =>
  ({
    id,
    title,
    author: 'Autor',
    language: 'pt',
    fileBlob: new Blob(),
    fileSize: 0,
    fileHash: `hash-${id}`,
    coverHue: 180,
    spineLength: 1,
    tags: [],
    addedAt: '2026-01-01T00:00:00Z',
  }) as Book;

const makeHighlight = (id: string, text: string, note?: string): Highlight => ({
  id,
  bookId: 'book-1',
  cfiRange: `cfi-${id}`,
  text,
  color: 'yellow',
  tags: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...(note !== undefined ? { note } : {}),
});

describe('extractLinks', () => {
  it('extracts single link', () => {
    expect(extractLinks('See [[My Note]] for details')).toEqual(['My Note']);
  });

  it('extracts multiple links', () => {
    expect(extractLinks('[[A]] and [[B]] together')).toEqual(['A', 'B']);
  });

  it('returns empty for text without links', () => {
    expect(extractLinks('No links here')).toEqual([]);
  });

  it('trims whitespace inside brackets', () => {
    expect(extractLinks('[[ Spaced Title ]]')).toEqual(['Spaced Title']);
  });

  it('ignores empty brackets', () => {
    expect(extractLinks('[[]]')).toEqual([]);
  });

  it('handles nested square brackets gracefully', () => {
    expect(extractLinks('[[Valid Link]]')).toEqual(['Valid Link']);
  });
});

describe('resolveLink', () => {
  const notes = [makeNote('n1', 'Ética', 'body'), makeNote('n2', 'Metafísica', 'body')];
  const books = [makeBook('b1', 'Os Maias'), makeBook('b2', 'Dune')];

  it('resolves to a note by title (case-insensitive)', () => {
    const result = resolveLink('ética', notes, books);
    expect(result).toEqual({ type: 'note', id: 'n1', title: 'Ética' });
  });

  it('resolves to a book by title', () => {
    const result = resolveLink('Os Maias', notes, books);
    expect(result).toEqual({ type: 'book', id: 'b1', title: 'Os Maias' });
  });

  it('returns null for unresolvable link', () => {
    expect(resolveLink('Nonexistent', notes, books)).toBeNull();
  });

  it('prioritises notes over books when names collide', () => {
    const noteWithBookName = makeNote('n3', 'Os Maias', 'body');
    const result = resolveLink('Os Maias', [...notes, noteWithBookName], books);
    expect(result).toEqual({ type: 'note', id: 'n3', title: 'Os Maias' });
  });

  it('resolves to a highlight when provided', () => {
    const hls = [makeHighlight('h1', 'The spice must flow')];
    const result = resolveLink('the spice must flow', notes, books, hls);
    expect(result).toEqual({ type: 'highlight', id: 'h1', title: 'The spice must flow' });
  });
});

describe('buildBacklinkIndex', () => {
  it('builds index from notes with links', () => {
    const notes = [
      makeNote('n1', 'Ética', 'See also [[Metafísica]]'),
      makeNote('n2', 'Metafísica', 'References [[Ética]]'),
    ];
    const books: Book[] = [];
    const index = buildBacklinkIndex(notes, books);

    const refsToN1 = index.get('n1');
    expect(refsToN1).toBeDefined();
    expect(refsToN1).toHaveLength(1);
    expect(refsToN1![0]!.sourceId).toBe('n2');

    const refsToN2 = index.get('n2');
    expect(refsToN2).toBeDefined();
    expect(refsToN2).toHaveLength(1);
    expect(refsToN2![0]!.sourceId).toBe('n1');
  });

  it('includes book references', () => {
    const notes = [makeNote('n1', 'Review', 'I loved [[Dune]]')];
    const books = [makeBook('b1', 'Dune')];
    const index = buildBacklinkIndex(notes, books);

    const refsToBook = index.get('b1');
    expect(refsToBook).toBeDefined();
    expect(refsToBook).toHaveLength(1);
    expect(refsToBook![0]!.targetType).toBe('book');
  });

  it('deduplicates same source referencing same target', () => {
    const notes = [makeNote('n1', 'Review', '[[Dune]] is great. Read [[Dune]] again.')];
    const books = [makeBook('b1', 'Dune')];
    const index = buildBacklinkIndex(notes, books);

    expect(index.get('b1')).toHaveLength(1);
  });

  it('includes backlinks from highlight notes', () => {
    const notes = [makeNote('n1', 'Ética', 'body')];
    const books: Book[] = [];
    const hls = [makeHighlight('h1', 'some text', 'See [[Ética]]')];
    const index = buildBacklinkIndex(notes, books, hls);

    const refsToN1 = index.get('n1');
    expect(refsToN1).toBeDefined();
    expect(refsToN1).toHaveLength(1);
    expect(refsToN1![0]!.sourceId).toBe('h1');
  });

  it('returns empty map when no links exist', () => {
    const notes = [makeNote('n1', 'Plain', 'No links')];
    const index = buildBacklinkIndex(notes, []);
    expect(index.size).toBe(0);
  });
});

describe('getAutocompleteCandidates', () => {
  it('returns notes and books as candidates', () => {
    const notes = [makeNote('n1', 'Ética', 'body')];
    const books = [makeBook('b1', 'Os Maias')];
    const candidates = getAutocompleteCandidates(notes, books);

    expect(candidates).toHaveLength(2);
    expect(candidates).toContainEqual({ label: 'Ética', type: 'note' });
    expect(candidates).toContainEqual({ label: 'Os Maias', type: 'book' });
  });

  it('skips notes without titles', () => {
    const notes = [{ ...makeNote('n1', '', 'body'), title: undefined }];
    const books: Book[] = [];
    const candidates = getAutocompleteCandidates(notes as Note[], books);

    expect(candidates).toHaveLength(0);
  });
});
