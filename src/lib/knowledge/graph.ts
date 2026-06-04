import { cosineSimilarity } from '@/lib/ai/rag';
import * as embeddingsDb from '@/lib/db/embeddings';
import type { Book } from '@/types/book';
import type { Embedding } from '@/types/embedding';
import type { Highlight } from '@/types/highlight';

export interface RelatedIdea {
  highlight: Highlight;
  book: Book;
  similarity: number;
}

export interface Edge {
  sourceId: string;
  targetId: string;
  similarity: number;
  sourceBookId: string;
  targetBookId: string;
}

export interface GraphNode {
  id: string;
  label: string;
  bookId: string;
  bookTitle: string;
  type: 'highlight' | 'note';
}

export interface GraphData {
  nodes: GraphNode[];
  edges: Edge[];
}

const findBestChunkForHighlight = (
  highlightText: string,
  bookEmbeddings: Embedding[],
): Embedding | null => {
  if (bookEmbeddings.length === 0) return null;
  let best: Embedding | null = null;
  let bestScore = -1;
  for (const emb of bookEmbeddings) {
    const textOverlap = emb.chunkText.toLowerCase().includes(highlightText.toLowerCase().slice(0, 40))
      ? 1
      : 0;
    if (textOverlap > bestScore || best === null) {
      bestScore = textOverlap;
      best = emb;
    }
  }
  return best;
};

export const getRelatedIdeas = async (
  highlightId: string,
  highlights: ReadonlyArray<Highlight>,
  books: ReadonlyArray<Book>,
  k = 5,
): Promise<RelatedIdea[]> => {
  const source = highlights.find((h) => h.id === highlightId);
  if (source === undefined) return [];

  const sourceEmbeddings = await embeddingsDb.getByBook(source.bookId);
  const sourceChunk = findBestChunkForHighlight(source.text, sourceEmbeddings);
  if (sourceChunk === null) return [];

  const otherBookIds = [...new Set(
    highlights.filter((h) => h.bookId !== source.bookId).map((h) => h.bookId),
  )];

  const results: RelatedIdea[] = [];
  const bookMap = new Map(books.map((b) => [b.id, b]));

  for (const bookId of otherBookIds) {
    const bookEmbeddings = await embeddingsDb.getByBook(bookId);
    if (bookEmbeddings.length === 0) continue;
    const book = bookMap.get(bookId);
    if (book === undefined) continue;

    const bookHighlights = highlights.filter((h) => h.bookId === bookId);
    for (const hl of bookHighlights) {
      const chunk = findBestChunkForHighlight(hl.text, bookEmbeddings);
      if (chunk === null) continue;
      const sim = cosineSimilarity(sourceChunk.vector, chunk.vector);
      if (sim >= 0.78) {
        results.push({ highlight: hl, book, similarity: sim });
      }
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, k);
};

export const buildSemanticEdges = async (
  highlights: ReadonlyArray<Highlight>,
  _books: ReadonlyArray<Book>,
  threshold = 0.78,
  onProgress?: (pct: number) => void,
): Promise<Edge[]> => {
  const bookIds = [...new Set(highlights.map((h) => h.bookId))];
  const embeddingsByBook = new Map<string, Embedding[]>();

  for (const bid of bookIds) {
    embeddingsByBook.set(bid, await embeddingsDb.getByBook(bid));
  }

  type HLWithVec = { hl: Highlight; vec: number[] };
  const items: HLWithVec[] = [];
  for (const hl of highlights) {
    const bookEmbs = embeddingsByBook.get(hl.bookId) ?? [];
    const chunk = findBestChunkForHighlight(hl.text, bookEmbs);
    if (chunk !== null) {
      items.push({ hl, vec: chunk.vector });
    }
  }

  const edges: Edge[] = [];
  const edgeCount = new Map<string, number>();
  const total = items.length * (items.length - 1) / 2;
  let processed = 0;

  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      if (b === undefined) continue;
      if (a.hl.bookId === b.hl.bookId) {
        processed++;
        continue;
      }
      const sim = cosineSimilarity(a.vec, b.vec);
      processed++;

      if (sim >= threshold) {
        const aCount = edgeCount.get(a.hl.id) ?? 0;
        const bCount = edgeCount.get(b.hl.id) ?? 0;
        if (aCount < 5 && bCount < 5) {
          edges.push({
            sourceId: a.hl.id,
            targetId: b.hl.id,
            similarity: sim,
            sourceBookId: a.hl.bookId,
            targetBookId: b.hl.bookId,
          });
          edgeCount.set(a.hl.id, aCount + 1);
          edgeCount.set(b.hl.id, bCount + 1);
        }
      }

      if (processed % 50 === 0) {
        onProgress?.(Math.round((processed / total) * 100));
        await new Promise<void>((r) => {
          if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => r());
          } else {
            setTimeout(r, 0);
          }
        });
      }
    }
  }

  onProgress?.(100);
  return edges;
};
