import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  isAiEnabled: vi.fn(),
  generateText: vi.fn(),
}));

vi.mock('@/lib/db/embeddings', () => ({
  getByBook: vi.fn(),
}));

import { detectContradictions } from '@/lib/knowledge/contradictions';
import { isAiEnabled, generateText } from '@/lib/ai/client';
import { getByBook } from '@/lib/db/embeddings';
import type { Book } from '@/types/book';
import type { Embedding } from '@/types/embedding';
import type { Highlight, SemanticTag } from '@/types/highlight';

const makeHighlight = (
  id: string,
  bookId: string,
  text: string,
  semanticTag?: SemanticTag,
): Highlight => ({
  id,
  bookId,
  cfiRange: `cfi-${id}`,
  text,
  color: 'yellow',
  tags: [],
  ...(semanticTag !== undefined ? { semanticTag } : {}),
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

describe('detectContradictions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty when AI is disabled', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(false);
    const result = await detectContradictions(
      [makeHighlight('h1', 'b1', 'text', 'argue')],
      [makeBook('b1', 'B')],
    );
    expect(result).toEqual([]);
  });

  it('returns empty when fewer than 2 argue highlights exist', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    const result = await detectContradictions(
      [
        makeHighlight('h1', 'b1', 'text', 'fact'),
        makeHighlight('h2', 'b1', 'text', 'quote'),
      ],
      [makeBook('b1', 'B')],
    );
    expect(result).toEqual([]);
    expect(generateText).not.toHaveBeenCalled();
  });

  it('only considers highlights tagged as argue', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"verdict":"contradict","explanation":"opposem-se"}',
    );

    const vec = normalise([1, 0, 0]);
    vi.mocked(getByBook).mockImplementation(async (bid) => [
      makeEmbedding(bid, 0, 'chunk', vec),
    ]);

    const highlights = [
      makeHighlight('h1', 'b1', 'thesis A', 'argue'),
      makeHighlight('h2', 'b2', 'thesis B', 'argue'),
      makeHighlight('h3', 'b1', 'fact text', 'fact'),
      makeHighlight('h4', 'b2', 'quote text', 'quote'),
    ];

    const result = await detectContradictions(highlights, [
      makeBook('b1', 'A'),
      makeBook('b2', 'B'),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.highlightA.semanticTag).toBe('argue');
    expect(result[0]!.highlightB.semanticTag).toBe('argue');
  });

  it('filters out agree verdicts from output', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"verdict":"agree","explanation":"dizem o mesmo"}',
    );

    const vec = normalise([1, 0, 0]);
    vi.mocked(getByBook).mockResolvedValue([makeEmbedding('b1', 0, 'chunk', vec)]);

    const result = await detectContradictions(
      [
        makeHighlight('h1', 'b1', 'a', 'argue'),
        makeHighlight('h2', 'b1', 'b', 'argue'),
      ],
      [makeBook('b1', 'B')],
    );

    expect(result).toEqual([]);
  });

  it('returns contradict and tension verdicts', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText)
      .mockResolvedValueOnce('{"verdict":"contradict","explanation":"opostas"}')
      .mockResolvedValueOnce('{"verdict":"tension","explanation":"parcial"}');

    const vec = normalise([1, 0, 0]);
    vi.mocked(getByBook).mockResolvedValue([makeEmbedding('b1', 0, 'chunk', vec)]);

    const result = await detectContradictions(
      [
        makeHighlight('h1', 'b1', 'a', 'argue'),
        makeHighlight('h2', 'b1', 'b', 'argue'),
        makeHighlight('h3', 'b1', 'c', 'argue'),
      ],
      [makeBook('b1', 'B')],
    );

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.verdict).sort()).toEqual(['contradict', 'tension']);
  });

  it('handles JSON inside markdown code blocks', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '```json\n{"verdict":"contradict","explanation":"opostas"}\n```',
    );

    const vec = normalise([1, 0, 0]);
    vi.mocked(getByBook).mockResolvedValue([makeEmbedding('b1', 0, 'chunk', vec)]);

    const result = await detectContradictions(
      [
        makeHighlight('h1', 'b1', 'a', 'argue'),
        makeHighlight('h2', 'b1', 'b', 'argue'),
      ],
      [makeBook('b1', 'B')],
    );

    expect(result).toHaveLength(1);
    expect(result[0]!.verdict).toBe('contradict');
  });

  it('ignores pairs below similarity threshold', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"verdict":"contradict","explanation":"x"}',
    );

    vi.mocked(getByBook).mockImplementation(async (bid) => {
      if (bid === 'b1') return [makeEmbedding('b1', 0, 'a', normalise([1, 0, 0]))];
      if (bid === 'b2') return [makeEmbedding('b2', 0, 'b', normalise([0, 1, 0]))];
      return [];
    });

    const result = await detectContradictions(
      [
        makeHighlight('h1', 'b1', 'unrelated text one', 'argue'),
        makeHighlight('h2', 'b2', 'unrelated text two', 'argue'),
      ],
      [makeBook('b1', 'A'), makeBook('b2', 'B')],
      { similarityThreshold: 0.78 },
    );

    expect(result).toEqual([]);
    expect(generateText).not.toHaveBeenCalled();
  });

  it('respects bookId filter', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"verdict":"contradict","explanation":"x"}',
    );

    const vec = normalise([1, 0, 0]);
    vi.mocked(getByBook).mockResolvedValue([makeEmbedding('b1', 0, 'chunk', vec)]);

    const result = await detectContradictions(
      [
        makeHighlight('h1', 'b1', 'a', 'argue'),
        makeHighlight('h2', 'b1', 'b', 'argue'),
        makeHighlight('h3', 'b2', 'c', 'argue'),
      ],
      [makeBook('b1', 'A'), makeBook('b2', 'B')],
      { bookId: 'b1' },
    );

    expect(result.every((r) => r.bookA.id === 'b1' && r.bookB.id === 'b1')).toBe(true);
  });

  it('returns empty for malformed AI response', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue('not valid json');

    const vec = normalise([1, 0, 0]);
    vi.mocked(getByBook).mockResolvedValue([makeEmbedding('b1', 0, 'chunk', vec)]);

    const result = await detectContradictions(
      [
        makeHighlight('h1', 'b1', 'a', 'argue'),
        makeHighlight('h2', 'b1', 'b', 'argue'),
      ],
      [makeBook('b1', 'B')],
    );

    expect(result).toEqual([]);
  });
});
