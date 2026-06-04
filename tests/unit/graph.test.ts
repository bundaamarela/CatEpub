import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/embeddings', () => ({
  getByBook: vi.fn(),
}));

import { buildSemanticEdges, getRelatedIdeas } from '@/lib/knowledge/graph';
import { getByBook } from '@/lib/db/embeddings';
import type { Book } from '@/types/book';
import type { Embedding } from '@/types/embedding';
import type { Highlight } from '@/types/highlight';

const makeHighlight = (id: string, bookId: string, text: string): Highlight => ({
  id,
  bookId,
  cfiRange: `cfi-${id}`,
  text,
  color: 'yellow',
  tags: [],
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

const makeEmbedding = (bookId: string, chunkIndex: number, text: string, vec: number[]): Embedding => ({
  id: `${bookId}-${chunkIndex}`,
  bookId,
  chunkIndex,
  chunkText: text,
  vector: vec,
});

const normalise = (v: number[]): number[] => {
  const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / len);
};

describe('getRelatedIdeas', () => {
  it('returns empty when highlight not found', async () => {
    const result = await getRelatedIdeas('nope', [], [], 5);
    expect(result).toEqual([]);
  });

  it('returns related highlights from other books', async () => {
    const h1 = makeHighlight('h1', 'book-a', 'ecology is important');
    const h2 = makeHighlight('h2', 'book-b', 'nature and ecosystems');
    const books = [makeBook('book-a', 'Book A'), makeBook('book-b', 'Book B')];

    const vecA = normalise([1, 0.9, 0.1]);
    const vecB = normalise([0.95, 0.85, 0.15]);

    vi.mocked(getByBook).mockImplementation(async (bookId) => {
      if (bookId === 'book-a') return [makeEmbedding('book-a', 0, 'ecology is important for us', vecA)];
      if (bookId === 'book-b') return [makeEmbedding('book-b', 0, 'nature and ecosystems matter', vecB)];
      return [];
    });

    const result = await getRelatedIdeas('h1', [h1, h2], books, 5);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0]!.highlight.id).toBe('h2');
    expect(result[0]!.similarity).toBeGreaterThan(0.78);
  });

  it('excludes same-book highlights', async () => {
    const h1 = makeHighlight('h1', 'book-a', 'topic one');
    const h2 = makeHighlight('h2', 'book-a', 'topic two');
    const books = [makeBook('book-a', 'Book A')];

    vi.mocked(getByBook).mockResolvedValue([
      makeEmbedding('book-a', 0, 'topic one here', normalise([1, 0, 0])),
    ]);

    const result = await getRelatedIdeas('h1', [h1, h2], books, 5);
    expect(result).toEqual([]);
  });
});

describe('buildSemanticEdges', () => {
  it('returns empty for no highlights', async () => {
    const edges = await buildSemanticEdges([], []);
    expect(edges).toEqual([]);
  });

  it('creates edges between similar cross-book highlights', async () => {
    const h1 = makeHighlight('h1', 'book-a', 'philosophy of mind');
    const h2 = makeHighlight('h2', 'book-b', 'consciousness theory');

    const vecA = normalise([1, 0.9, 0.1]);
    const vecB = normalise([0.98, 0.88, 0.12]);

    vi.mocked(getByBook).mockImplementation(async (bookId) => {
      if (bookId === 'book-a') return [makeEmbedding('book-a', 0, 'philosophy of mind chapter', vecA)];
      if (bookId === 'book-b') return [makeEmbedding('book-b', 0, 'consciousness theory section', vecB)];
      return [];
    });

    const books = [makeBook('book-a', 'Book A'), makeBook('book-b', 'Book B')];
    const edges = await buildSemanticEdges([h1, h2], books, 0.78);

    expect(edges.length).toBe(1);
    expect(edges[0]!.sourceBookId).not.toBe(edges[0]!.targetBookId);
  });

  it('caps edges per node at 5', async () => {
    const highlights: Highlight[] = [];
    const embeddings = new Map<string, Embedding[]>();

    for (let i = 0; i < 8; i++) {
      const bookId = `book-${i}`;
      const hlId = `h${i}`;
      highlights.push(makeHighlight(hlId, bookId, `text ${i}`));
      const vec = normalise([1, 0.9 + i * 0.001, 0.1]);
      embeddings.set(bookId, [makeEmbedding(bookId, 0, `text ${i} chunk`, vec)]);
    }

    vi.mocked(getByBook).mockImplementation(async (bookId) => embeddings.get(bookId) ?? []);

    const books = highlights.map((h) => makeBook(h.bookId, `Book ${h.bookId}`));
    const edges = await buildSemanticEdges(highlights, books, 0.5);

    const counts = new Map<string, number>();
    for (const e of edges) {
      counts.set(e.sourceId, (counts.get(e.sourceId) ?? 0) + 1);
      counts.set(e.targetId, (counts.get(e.targetId) ?? 0) + 1);
    }
    for (const [, count] of counts) {
      expect(count).toBeLessThanOrEqual(5);
    }
  });

  it('reports progress', async () => {
    const h1 = makeHighlight('h1', 'book-a', 'alpha');
    const h2 = makeHighlight('h2', 'book-b', 'beta');

    vi.mocked(getByBook).mockImplementation(async (bookId) => {
      const vec = bookId === 'book-a' ? normalise([1, 0, 0]) : normalise([0, 1, 0]);
      return [makeEmbedding(bookId, 0, 'text', vec)];
    });

    const books = [makeBook('book-a', 'A'), makeBook('book-b', 'B')];
    const progressValues: number[] = [];
    await buildSemanticEdges([h1, h2], books, 0.78, (p) => progressValues.push(p));

    expect(progressValues[progressValues.length - 1]).toBe(100);
  });
});
