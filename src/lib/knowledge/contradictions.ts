import { cosineSimilarity } from '@/lib/ai/rag';
import { generateText, isAiEnabled } from '@/lib/ai/client';
import * as embeddingsDb from '@/lib/db/embeddings';
import type { Book } from '@/types/book';
import type { Embedding } from '@/types/embedding';
import type { Highlight } from '@/types/highlight';

export type ContradictionVerdict = 'contradict' | 'tension' | 'agree';

export interface Contradiction {
  highlightA: Highlight;
  highlightB: Highlight;
  bookA: Book;
  bookB: Book;
  verdict: ContradictionVerdict;
  explanation: string;
  similarity: number;
}

const SYSTEM = 'És um analista filosófico. Avalia se duas passagens se contradizem, têm tensão parcial, ou concordam. Responde APENAS com JSON válido em português europeu.';

const buildPrompt = (textA: string, textB: string): string =>
  `Avalia estas duas passagens. Responde APENAS com JSON: { "verdict": "contradict" | "tension" | "agree", "explanation": string (máximo 20 palavras, português europeu) }.

Passagem A: ${textA}

Passagem B: ${textB}`;

const findBestChunk = (
  highlightText: string,
  bookEmbeddings: Embedding[],
): Embedding | null => {
  if (bookEmbeddings.length === 0) return null;
  let best: Embedding | null = null;
  let bestScore = -1;
  for (const emb of bookEmbeddings) {
    const overlap = emb.chunkText.toLowerCase().includes(highlightText.toLowerCase().slice(0, 40))
      ? 1
      : 0;
    if (overlap > bestScore || best === null) {
      bestScore = overlap;
      best = emb;
    }
  }
  return best;
};

const parseVerdict = (text: string): { verdict: ContradictionVerdict; explanation: string } | null => {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match === null) return null;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const v = parsed.verdict;
    if (v !== 'contradict' && v !== 'tension' && v !== 'agree') return null;
    const explanation = typeof parsed.explanation === 'string' ? parsed.explanation : '';
    return { verdict: v, explanation };
  } catch {
    return null;
  }
};

export interface DetectOptions {
  bookId?: string;
  similarityThreshold?: number;
  maxPairs?: number;
  signal?: AbortSignal;
  onProgress?: (current: number, total: number) => void;
}

export const detectContradictions = async (
  highlights: ReadonlyArray<Highlight>,
  books: ReadonlyArray<Book>,
  opts: DetectOptions = {},
): Promise<Contradiction[]> => {
  if (!isAiEnabled()) return [];

  const threshold = opts.similarityThreshold ?? 0.78;
  const maxPairs = opts.maxPairs ?? 50;

  const argueHighlights = highlights.filter((h) => {
    if (h.semanticTag !== 'argue') return false;
    if (opts.bookId !== undefined && h.bookId !== opts.bookId) return false;
    return true;
  });

  if (argueHighlights.length < 2) return [];

  const bookMap = new Map(books.map((b) => [b.id, b]));
  const bookIds = [...new Set(argueHighlights.map((h) => h.bookId))];
  const embeddingsByBook = new Map<string, Embedding[]>();

  for (const bid of bookIds) {
    embeddingsByBook.set(bid, await embeddingsDb.getByBook(bid));
  }

  type ItemWithVec = { hl: Highlight; vec: number[] };
  const items: ItemWithVec[] = [];
  for (const hl of argueHighlights) {
    const bookEmbs = embeddingsByBook.get(hl.bookId) ?? [];
    const chunk = findBestChunk(hl.text, bookEmbs);
    if (chunk !== null) items.push({ hl, vec: chunk.vector });
  }

  const candidates: Array<{ a: ItemWithVec; b: ItemWithVec; sim: number }> = [];
  for (let i = 0; i < items.length; i++) {
    const a = items[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < items.length; j++) {
      const b = items[j];
      if (b === undefined) continue;
      const sim = cosineSimilarity(a.vec, b.vec);
      if (sim >= threshold) {
        candidates.push({ a, b, sim });
      }
    }
  }

  candidates.sort((x, y) => y.sim - x.sim);
  const capped = candidates.slice(0, maxPairs);

  const results: Contradiction[] = [];

  for (let i = 0; i < capped.length; i++) {
    if (opts.signal?.aborted) break;
    const pair = capped[i];
    if (pair === undefined) continue;

    opts.onProgress?.(i, capped.length);

    const prompt = buildPrompt(pair.a.hl.text, pair.b.hl.text);
    const response = await generateText({
      system: SYSTEM,
      prompt,
      maxTokens: 256,
      ...(opts.signal !== undefined ? { signal: opts.signal } : {}),
    });
    if (response === null) continue;

    const parsed = parseVerdict(response);
    if (parsed === null) continue;
    if (parsed.verdict === 'agree') continue;

    const bookA = bookMap.get(pair.a.hl.bookId);
    const bookB = bookMap.get(pair.b.hl.bookId);
    if (bookA === undefined || bookB === undefined) continue;

    results.push({
      highlightA: pair.a.hl,
      highlightB: pair.b.hl,
      bookA,
      bookB,
      verdict: parsed.verdict,
      explanation: parsed.explanation,
      similarity: pair.sim,
    });
  }

  opts.onProgress?.(capped.length, capped.length);
  return results;
};
