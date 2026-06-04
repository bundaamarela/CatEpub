import { describe, expect, it } from 'vitest';

import {
  extractConcepts,
  exportConceptMarkdown,
  getConceptDetail,
} from '@/lib/knowledge/concepts';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';

const makeHighlight = (id: string, bookId: string, tags: string[]): Highlight => ({
  id,
  bookId,
  cfiRange: `cfi-${id}`,
  text: `Text for ${id}`,
  color: 'yellow',
  tags,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const makeNote = (id: string, bookId: string, tags: string[]): Note => ({
  id,
  bookId,
  body: 'body',
  tags,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
});

const makeBook = (id: string, title: string): Book =>
  ({
    id,
    title,
    author: 'Autor',
    fileBlob: new Blob(),
    fileSize: 0,
    fileHash: `hash-${id}`,
    coverHue: 180,
    spineLength: 1,
    tags: [],
    addedAt: '2026-01-01T00:00:00Z',
  }) as Book;

describe('extractConcepts', () => {
  it('extracts unique concepts from highlights and notes', () => {
    const highlights = [
      makeHighlight('h1', 'b1', ['ethics', 'philosophy']),
      makeHighlight('h2', 'b1', ['ethics']),
      makeHighlight('h3', 'b2', ['ecology']),
    ];
    const notes = [makeNote('n1', 'b1', ['philosophy'])];

    const concepts = extractConcepts(highlights, notes);
    expect(concepts.find((c) => c.tag === 'ethics')?.count).toBe(2);
    expect(concepts.find((c) => c.tag === 'philosophy')?.count).toBe(2);
    expect(concepts.find((c) => c.tag === 'ecology')?.count).toBe(1);
  });

  it('sorts by count descending', () => {
    const highlights = [
      makeHighlight('h1', 'b1', ['a', 'b']),
      makeHighlight('h2', 'b1', ['a']),
    ];
    const concepts = extractConcepts(highlights, []);
    expect(concepts[0]?.tag).toBe('a');
  });

  it('tracks book IDs per concept', () => {
    const highlights = [
      makeHighlight('h1', 'b1', ['ethics']),
      makeHighlight('h2', 'b2', ['ethics']),
    ];
    const concepts = extractConcepts(highlights, []);
    const ethics = concepts.find((c) => c.tag === 'ethics');
    expect(ethics?.bookIds).toHaveLength(2);
  });

  it('returns empty for no tags', () => {
    const highlights = [makeHighlight('h1', 'b1', [])];
    expect(extractConcepts(highlights, [])).toHaveLength(0);
  });

  it('normalises tags to lowercase', () => {
    const highlights = [
      makeHighlight('h1', 'b1', ['Ethics']),
      makeHighlight('h2', 'b1', ['ethics']),
    ];
    const concepts = extractConcepts(highlights, []);
    expect(concepts).toHaveLength(1);
    expect(concepts[0]?.count).toBe(2);
  });
});

describe('getConceptDetail', () => {
  it('returns highlights and related concepts', () => {
    const highlights = [
      makeHighlight('h1', 'b1', ['ethics', 'philosophy']),
      makeHighlight('h2', 'b2', ['ethics', 'law']),
      makeHighlight('h3', 'b1', ['biology']),
    ];
    const books = [makeBook('b1', 'Book A'), makeBook('b2', 'Book B')];

    const detail = getConceptDetail('ethics', highlights, [], books);
    expect(detail.highlights).toHaveLength(2);
    expect(detail.relatedConcepts).toContain('philosophy');
    expect(detail.relatedConcepts).toContain('law');
    expect(detail.relatedConcepts).not.toContain('biology');
  });

  it('includes book title in highlights', () => {
    const highlights = [makeHighlight('h1', 'b1', ['ethics'])];
    const books = [makeBook('b1', 'Os Maias')];

    const detail = getConceptDetail('ethics', highlights, [], books);
    expect(detail.highlights[0]?.bookTitle).toBe('Os Maias');
  });
});

describe('exportConceptMarkdown', () => {
  it('generates valid markdown', () => {
    const detail = {
      tag: 'ethics',
      highlights: [
        {
          ...makeHighlight('h1', 'b1', ['ethics']),
          bookTitle: 'Book A',
        },
      ],
      relatedConcepts: ['philosophy'],
    };

    const md = exportConceptMarkdown(detail);
    expect(md).toContain('# ethics');
    expect(md).toContain('## Conceitos relacionados');
    expect(md).toContain('- philosophy');
    expect(md).toContain('## Highlights');
    expect(md).toContain('Book A');
  });
});
