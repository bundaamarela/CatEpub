export interface TextChunk {
  index: number;
  text: string;
}

interface ChunkOptions {
  /** Tamanho máximo do chunk em palavras. Default 500. */
  maxWords?: number;
  /** Overlap entre chunks consecutivos em palavras. Default 50. */
  overlapWords?: number;
}

/**
 * Divide um texto em chunks de ~`maxWords` palavras com `overlapWords` de
 * sobreposição entre janelas. Whitespace excessivo é normalizado.
 *
 * Pura e determinística — testável sem mocks.
 */
export const chunkText = (text: string, opts: ChunkOptions = {}): TextChunk[] => {
  const maxWords = opts.maxWords ?? 500;
  const overlapWords = opts.overlapWords ?? 50;
  if (maxWords <= 0) return [];
  const stride = Math.max(1, maxWords - Math.max(0, overlapWords));

  const words = text
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const out: TextChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < words.length) {
    const end = Math.min(start + maxWords, words.length);
    const chunk = words.slice(start, end).join(' ');
    if (chunk.length > 0) {
      out.push({ index, text: chunk });
      index++;
    }
    if (end >= words.length) break;
    start += stride;
  }
  return out;
};
