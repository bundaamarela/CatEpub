import * as embeddingsDb from '@/lib/db/embeddings';
import { cosineSimilarity } from './rag';
import { embedText } from './embeddings';
import { generateText, isAiEnabled } from './client';
import type { Book } from '@/types/book';
import type { Embedding } from '@/types/embedding';

export interface SynthesisSource {
  bookId: string;
  bookTitle: string;
  chunkText: string;
  score: number;
}

export interface SynthesisResult {
  answer: string;
  sources: SynthesisSource[];
  tensions: string[];
}

const SYNTHESIS_SYSTEM = `És um assistente de investigação que sintetiza conhecimento de múltiplos livros. Regras:
- Responde sempre em português europeu.
- Cita as fontes no formato [Livro: Título, Passagem N].
- Identifica tensões ou contradições entre as fontes quando existirem.
- Se as passagens não contêm informação relevante, diz-lo directamente.
- Não inventes conteúdo. Baseia-te apenas nas passagens fornecidas.
- No final, se encontrares posições que se contradizem ou complementam de forma interessante, lista-as numa secção "TENSÕES:" com uma frase por tensão.`;

const buildSynthesisPrompt = (
  query: string,
  grouped: Map<string, { title: string; chunks: Array<{ text: string; score: number }> }>,
): string => {
  const parts: string[] = ['Passagens relevantes de múltiplos livros:', ''];

  let passageIndex = 1;
  for (const [, group] of grouped) {
    parts.push(`## ${group.title}`);
    for (const chunk of group.chunks) {
      parts.push(`[Passagem ${passageIndex}] ${chunk.text}`);
      passageIndex++;
    }
    parts.push('');
  }

  parts.push(`Pergunta: ${query}`);
  parts.push('');
  parts.push('Responde sintetizando as passagens acima. Cita as fontes. Identifica tensões se existirem.');

  return parts.join('\n');
};

const parseTensions = (text: string): { answer: string; tensions: string[] } => {
  const tensionMatch = text.match(/TENSÕES:\s*\n?([\s\S]*?)$/i);
  if (tensionMatch === null) return { answer: text.trim(), tensions: [] };

  const answer = text.slice(0, tensionMatch.index).trim();
  const tensionBlock = tensionMatch[1] ?? '';
  const tensions = tensionBlock
    .split('\n')
    .map((l) => l.replace(/^[-•*]\s*/, '').trim())
    .filter((l) => l.length > 0);

  return { answer, tensions };
};

export const synthesiseAcrossLibrary = async (
  query: string,
  books: ReadonlyArray<Book>,
  k = 10,
  signal?: AbortSignal,
): Promise<SynthesisResult | null> => {
  if (!isAiEnabled()) return null;

  const trimmed = query.trim();
  if (trimmed.length === 0) return null;

  const allBookIds = books.map((b) => b.id);
  const allEmbeddings: Array<Embedding & { bookTitle: string }> = [];
  const bookMap = new Map(books.map((b) => [b.id, b]));

  for (const bookId of allBookIds) {
    if (signal?.aborted) return null;
    const embs = await embeddingsDb.getByBook(bookId);
    const title = bookMap.get(bookId)?.title ?? '';
    for (const emb of embs) {
      allEmbeddings.push({ ...emb, bookTitle: title });
    }
  }

  if (allEmbeddings.length === 0) return null;
  if (signal?.aborted) return null;

  const queryVec = await embedText(trimmed);
  if (signal?.aborted) return null;

  const scored = allEmbeddings
    .map((emb) => ({
      ...emb,
      score: cosineSimilarity(queryVec, emb.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const grouped = new Map<string, { title: string; chunks: Array<{ text: string; score: number }> }>();
  const sources: SynthesisSource[] = [];

  for (const item of scored) {
    const group = grouped.get(item.bookId) ?? { title: item.bookTitle, chunks: [] };
    group.chunks.push({ text: item.chunkText, score: item.score });
    grouped.set(item.bookId, group);
    sources.push({
      bookId: item.bookId,
      bookTitle: item.bookTitle,
      chunkText: item.chunkText,
      score: item.score,
    });
  }

  const prompt = buildSynthesisPrompt(trimmed, grouped);
  const response = await generateText({
    system: SYNTHESIS_SYSTEM,
    prompt,
    maxTokens: 2048,
    ...(signal !== undefined ? { signal } : {}),
  });

  if (response === null) return null;

  const { answer, tensions } = parseTensions(response);
  return { answer, sources, tensions };
};
