import * as embeddingsDb from '@/lib/db/embeddings';
import { embedText } from './embeddings';

export interface RetrievedChunk {
  /** Index original do chunk dentro do livro. */
  chunkIndex: number;
  /** Texto integral do chunk. */
  chunkText: string;
  /** Score de similaridade no intervalo `[-1, 1]`. */
  score: number;
}

/**
 * Cosine similarity entre dois vectores de igual dimensão. Pura, testável.
 *
 * Não normaliza — assumimos que os vectores produzidos por `embedText`
 * já estão normalizados (`normalize: true` na pipeline). Para vectores
 * arbitrários, dividir por `‖a‖·‖b‖` antes do dot product.
 */
export const cosineSimilarity = (a: ArrayLike<number>, b: ArrayLike<number>): number => {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    dot += av * bv;
    normA += av * av;
    normB += bv * bv;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

interface RetrieveOptions {
  signal?: AbortSignal;
  /** Top-K. Default 5. */
  k?: number;
}

/**
 * Devolve os `k` chunks mais relevantes para `query` num livro. Retorna `[]`
 * se o livro não tiver embeddings persistidos. Não chama o cliente Anthropic;
 * apenas embedding local + similarity.
 */
export const retrieveRelevant = async (
  bookId: string,
  query: string,
  opts: RetrieveOptions = {},
): Promise<RetrievedChunk[]> => {
  const k = opts.k ?? 5;
  const trimmed = query.trim();
  if (trimmed.length === 0) return [];

  const rows = await embeddingsDb.getByBook(bookId);
  if (rows.length === 0) return [];
  if (opts.signal?.aborted) return [];

  const queryVec = await embedText(trimmed);
  if (opts.signal?.aborted) return [];

  const scored: RetrievedChunk[] = rows.map((row) => ({
    chunkIndex: row.chunkIndex,
    chunkText: row.chunkText,
    score: cosineSimilarity(queryVec, row.vector),
  }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
};
