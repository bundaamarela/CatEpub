import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/knowledge/graph', () => ({
  getRelatedIdeas: vi.fn(),
}));

import { db } from '@/lib/db/schema';
import { createCard, getDueCluster } from '@/lib/srs/scheduler';
import { getRelatedIdeas } from '@/lib/knowledge/graph';
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

describe('getDueCluster', () => {
  beforeEach(async () => {
    await db.flashcards.clear();
    await db.highlights.clear();
    await db.books.clear();
    vi.clearAllMocks();
  });

  it('returns empty when no card exists for highlight', async () => {
    vi.mocked(getRelatedIdeas).mockResolvedValue([]);
    const cluster = await getDueCluster('missing-highlight');
    expect(cluster).toEqual([]);
  });

  it('returns only the main card when no related ideas exist', async () => {
    const card = createCard({
      bookId: 'b1',
      front: 'q',
      back: 'a',
      highlightId: 'h1',
    });
    await db.flashcards.add(card);
    vi.mocked(getRelatedIdeas).mockResolvedValue([]);

    const cluster = await getDueCluster('h1');
    expect(cluster).toHaveLength(1);
    expect(cluster[0]!.id).toBe(card.id);
  });

  it('includes related cards from other highlights', async () => {
    const mainCard = createCard({
      bookId: 'b1',
      front: 'main',
      back: 'a',
      highlightId: 'h1',
    });
    const related1 = createCard({
      bookId: 'b2',
      front: 'r1',
      back: 'a',
      highlightId: 'h2',
    });
    const related2 = createCard({
      bookId: 'b3',
      front: 'r2',
      back: 'a',
      highlightId: 'h3',
    });
    await db.flashcards.bulkAdd([mainCard, related1, related2]);

    vi.mocked(getRelatedIdeas).mockResolvedValue([
      {
        highlight: makeHighlight('h2', 'b2', 'related text 1'),
        book: { id: 'b2', title: 'B2' } as never,
        similarity: 0.85,
      },
      {
        highlight: makeHighlight('h3', 'b3', 'related text 2'),
        book: { id: 'b3', title: 'B3' } as never,
        similarity: 0.82,
      },
    ]);

    const cluster = await getDueCluster('h1');
    expect(cluster).toHaveLength(3);
    expect(cluster[0]!.id).toBe(mainCard.id);
    expect(cluster.slice(1).map((c) => c.id).sort()).toEqual(
      [related1.id, related2.id].sort(),
    );
  });

  it('caps cluster at 4 cards total', async () => {
    const mainCard = createCard({ bookId: 'b1', front: 'q', back: 'a', highlightId: 'h1' });
    await db.flashcards.add(mainCard);

    const relatedCards = ['h2', 'h3', 'h4', 'h5', 'h6'].map((hid, i) =>
      createCard({ bookId: `b${i + 2}`, front: `r${i}`, back: 'a', highlightId: hid }),
    );
    await db.flashcards.bulkAdd(relatedCards);

    vi.mocked(getRelatedIdeas).mockResolvedValue(
      ['h2', 'h3', 'h4', 'h5', 'h6'].map((hid, i) => ({
        highlight: makeHighlight(hid, `b${i + 2}`, `text ${i}`),
        book: { id: `b${i + 2}`, title: `B${i + 2}` } as never,
        similarity: 0.85 - i * 0.01,
      })),
    );

    const cluster = await getDueCluster('h1');
    expect(cluster.length).toBeLessThanOrEqual(4);
  });

  it('skips related highlights with no flashcards', async () => {
    const mainCard = createCard({ bookId: 'b1', front: 'q', back: 'a', highlightId: 'h1' });
    await db.flashcards.add(mainCard);

    vi.mocked(getRelatedIdeas).mockResolvedValue([
      {
        highlight: makeHighlight('h-without-card', 'b2', 'no card here'),
        book: { id: 'b2', title: 'B2' } as never,
        similarity: 0.85,
      },
    ]);

    const cluster = await getDueCluster('h1');
    expect(cluster).toHaveLength(1);
    expect(cluster[0]!.id).toBe(mainCard.id);
  });
});
