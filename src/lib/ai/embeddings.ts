import type { FoliateBook } from 'foliate-js/view.js';

import * as embeddingsDb from '@/lib/db/embeddings';
import * as books from '@/lib/db/books';
import { chunkText } from './chunker';

/** Modelo MiniLM — ~25 MB, 384-dim, suficiente para retrieval. */
const MODEL_ID = 'Xenova/all-MiniLM-L6-v2';

type Pipeline = (input: string, opts: { pooling: 'mean'; normalize: boolean }) => Promise<{
  data: Float32Array;
}>;
let extractorPromise: Promise<Pipeline> | null = null;

/**
 * Lazy-load do pipeline de feature-extraction. Apenas importa
 * `@xenova/transformers` na primeira chamada para evitar carga inicial
 * de ~25 MB no bundle se o utilizador nunca usa IA.
 */
const getExtractor = async (): Promise<Pipeline> => {
  if (extractorPromise === null) {
    extractorPromise = (async (): Promise<Pipeline> => {
      const transformers = await import('@xenova/transformers');
      // `pipeline` returns a callable function — we narrow to the shape we use.
      const pipe = await transformers.pipeline('feature-extraction', MODEL_ID);
      return pipe as unknown as Pipeline;
    })();
  }
  return extractorPromise;
};

/**
 * Gera o embedding de um trecho de texto. Resultado é mean-pooled e
 * normalizado, pronto para cosine similarity.
 */
export const embedText = async (text: string): Promise<Float32Array> => {
  const extractor = await getExtractor();
  const out = await extractor(text, { pooling: 'mean', normalize: true });
  return out.data;
};

/** Extrai todo o texto plano das secções dum livro foliate-js. */
const extractSectionText = async (
  section: NonNullable<FoliateBook['sections']>[number],
): Promise<string> => {
  try {
    if (typeof section.createDocument === 'function') {
      const doc = await section.createDocument();
      return doc.body?.textContent?.trim() ?? '';
    }
    const html = await section.load();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    return parsed.body?.textContent?.trim() ?? '';
  } catch {
    return '';
  } finally {
    try {
      section.unload?.();
    } catch {
      /* ignore */
    }
  }
};

interface EmbedBookOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

/**
 * Gera embeddings para um livro inteiro (todas as secções, chunked) e persiste
 * em `db.embeddings`. Cancelável via `signal`. `onProgress` recebe 0–100 entre
 * cada section processada. Mantém `book.embeddingsStatus`/`book.embeddingsProgress`
 * actualizados na DB para a UI poder ler.
 */
export const embedBook = async (
  bookId: string,
  book: FoliateBook,
  opts: EmbedBookOptions = {},
): Promise<{ status: 'done' | 'cancelled' | 'error'; chunksWritten: number }> => {
  const sections = book.sections ?? [];
  const sectionCount = sections.length;
  if (sectionCount === 0) {
    await books.update(bookId, { embeddingsStatus: 'done', embeddingsProgress: 100 });
    return { status: 'done', chunksWritten: 0 };
  }

  await books.update(bookId, { embeddingsStatus: 'running', embeddingsProgress: 0 });
  await embeddingsDb.deleteByBook(bookId);

  let chunksWritten = 0;
  let chunkCounter = 0;

  for (let i = 0; i < sectionCount; i++) {
    if (opts.signal?.aborted) {
      await books.update(bookId, { embeddingsStatus: 'pending' });
      return { status: 'cancelled', chunksWritten };
    }

    const section = sections[i];
    if (!section) continue;
    const text = await extractSectionText(section);
    if (text.length === 0) continue;

    const chunks = chunkText(text);
    for (const chunk of chunks) {
      if (opts.signal?.aborted) {
        await books.update(bookId, { embeddingsStatus: 'pending' });
        return { status: 'cancelled', chunksWritten };
      }
      try {
        const vec = await embedText(chunk.text);
        await embeddingsDb.add({
          id: `${bookId}-${chunkCounter}`,
          bookId,
          chunkIndex: chunkCounter,
          chunkText: chunk.text,
          vector: Array.from(vec),
        });
        chunksWritten++;
        chunkCounter++;
      } catch (err) {
        console.error('[ai/embeddings] embed failed for chunk', chunkCounter, err);
        await books.update(bookId, { embeddingsStatus: 'error' });
        return { status: 'error', chunksWritten };
      }
    }

    const progress = Math.round(((i + 1) / sectionCount) * 100);
    opts.onProgress?.(progress);
    await books.update(bookId, { embeddingsProgress: progress });

    // Yield para o event loop não bloquear UI.
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  await books.update(bookId, { embeddingsStatus: 'done', embeddingsProgress: 100 });
  return { status: 'done', chunksWritten };
};
