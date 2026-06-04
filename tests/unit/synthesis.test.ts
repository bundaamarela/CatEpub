import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  isAiEnabled: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock('@/lib/ai/embeddings', () => ({
  embedText: vi.fn(),
}));

vi.mock('@/lib/db/embeddings', () => ({
  getByBook: vi.fn(),
}));

import { synthesiseAcrossLibrary } from '@/lib/ai/synthesis';
import { isAiEnabled, generateText } from '@/lib/ai/client';
import { embedText } from '@/lib/ai/embeddings';
import { getByBook } from '@/lib/db/embeddings';
import type { Book } from '@/types/book';
import type { Embedding } from '@/types/embedding';

const makeBook = (id: string, title: string): Book =>
  ({
    id,
    title,
    author: 'Author',
    fileBlob: new Blob(),
    fileSize: 0,
    fileHash: `hash-${id}`,
    coverHue: 180,
    spineLength: 1,
    tags: [],
    addedAt: '2026-01-01T00:00:00Z',
  }) as Book;

const makeEmbedding = (bookId: string, idx: number, text: string, vec: number[]): Embedding => ({
  id: `${bookId}-${idx}`,
  bookId,
  chunkIndex: idx,
  chunkText: text,
  vector: vec,
});

const normalise = (v: number[]): number[] => {
  const len = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
  return v.map((x) => x / len);
};

describe('synthesiseAcrossLibrary', () => {
  it('returns null when AI is disabled', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(false);
    const result = await synthesiseAcrossLibrary('query', [makeBook('b1', 'B1')]);
    expect(result).toBeNull();
  });

  it('returns null for empty query', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    const result = await synthesiseAcrossLibrary('', [makeBook('b1', 'B1')]);
    expect(result).toBeNull();
  });

  it('returns null when no embeddings exist', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(getByBook).mockResolvedValue([]);
    const result = await synthesiseAcrossLibrary('query', [makeBook('b1', 'B1')]);
    expect(result).toBeNull();
  });

  it('synthesises across books and returns sources', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    const queryVec = normalise([1, 0, 0]);
    vi.mocked(embedText).mockResolvedValue(new Float32Array(queryVec));

    vi.mocked(getByBook).mockImplementation(async (bookId) => {
      if (bookId === 'b1') {
        return [makeEmbedding('b1', 0, 'Ethics chapter content', normalise([0.9, 0.1, 0]))];
      }
      if (bookId === 'b2') {
        return [makeEmbedding('b2', 0, 'Moral philosophy text', normalise([0.8, 0.2, 0]))];
      }
      return [];
    });

    vi.mocked(generateText).mockResolvedValue(
      'A ética e a moral diferem em...\n\nTENSÕES:\n- Book A define ética como X, Book B define como Y',
    );

    const books = [makeBook('b1', 'Book A'), makeBook('b2', 'Book B')];
    const result = await synthesiseAcrossLibrary('ética vs moral', books, 10);

    expect(result).not.toBeNull();
    expect(result!.answer).toContain('ética');
    expect(result!.sources).toHaveLength(2);
    expect(result!.tensions).toHaveLength(1);
    expect(result!.tensions[0]).toContain('Book A');
  });

  it('handles response without tensions', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(embedText).mockResolvedValue(new Float32Array(normalise([1, 0, 0])));

    vi.mocked(getByBook).mockResolvedValue([
      makeEmbedding('b1', 0, 'Chunk text', normalise([1, 0, 0])),
    ]);

    vi.mocked(generateText).mockResolvedValue('Simple answer without tensions.');

    const result = await synthesiseAcrossLibrary('query', [makeBook('b1', 'B1')]);
    expect(result).not.toBeNull();
    expect(result!.tensions).toHaveLength(0);
    expect(result!.answer).toBe('Simple answer without tensions.');
  });

  it('returns null when generateText fails', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(embedText).mockResolvedValue(new Float32Array(normalise([1, 0, 0])));
    vi.mocked(getByBook).mockResolvedValue([
      makeEmbedding('b1', 0, 'Text', normalise([1, 0, 0])),
    ]);
    vi.mocked(generateText).mockResolvedValue(null);

    const result = await synthesiseAcrossLibrary('query', [makeBook('b1', 'B1')]);
    expect(result).toBeNull();
  });

  it('respects abort signal', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    const controller = new AbortController();
    controller.abort();

    const result = await synthesiseAcrossLibrary(
      'query',
      [makeBook('b1', 'B1')],
      10,
      controller.signal,
    );
    expect(result).toBeNull();
  });
});
