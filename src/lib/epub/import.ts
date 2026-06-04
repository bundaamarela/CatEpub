import { ulid } from 'ulid';

import { embedBook } from '@/lib/ai/embeddings';
import { isAiEnabled } from '@/lib/ai/client';
import * as books from '@/lib/db/books';
import { sha256 } from '@/lib/utils/hash';
import type { Book } from '@/types/book';
import { parseEpub } from './parser';

export type ImportStage = 'hashing' | 'parsing' | 'saving' | 'done';

export interface ImportProgress {
  file: string;
  stage: ImportStage;
}

export interface ImportSuccess {
  status: 'imported';
  bookId: string;
  title: string;
}

export interface ImportDuplicate {
  status: 'duplicate';
  bookId: string;
  title: string;
}

export interface ImportError {
  status: 'error';
  error: Error;
}

export type ImportResult = ImportSuccess | ImportDuplicate | ImportError;

const ACCEPTED_EXT = /\.epub$/i;

const isLikelyEpub = (file: File): boolean => {
  if (ACCEPTED_EXT.test(file.name)) return true;
  return file.type === 'application/epub+zip' || file.type === 'application/zip';
};

/**
 * Importa um único ficheiro EPUB. Calcula sha-256, detecta duplicados (mesmo
 * `fileHash`), parsa metadados + capa, persiste o `Book` na DB.
 *
 * Erros são capturados e devolvidos no resultado — não lança. O caller decide
 * como mostrar.
 */
export const importEpubFile = async (
  file: File,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportResult> => {
  const notify = (stage: ImportStage): void => onProgress?.({ file: file.name, stage });

  if (!isLikelyEpub(file)) {
    return {
      status: 'error',
      error: new Error(`O ficheiro "${file.name}" não parece ser um EPUB.`),
    };
  }

  try {
    notify('hashing');
    const fileHash = await sha256(file);

    const existing = await books.getByHash(fileHash);
    if (existing) {
      return { status: 'duplicate', bookId: existing.id, title: existing.title };
    }

    notify('parsing');
    const parsed = await parseEpub(file);

    notify('saving');
    const id = ulid();
    const now = new Date().toISOString();
    const book: Book = {
      id,
      title: parsed.metadata.title,
      author: parsed.metadata.author,
      fileBlob: file,
      fileSize: file.size,
      fileHash,
      coverHue: hueFromHash(fileHash),
      spineLength: parsed.spineLength,
      tags: parsed.metadata.subjects ?? [],
      addedAt: now,
    };
    if (parsed.metadata.language !== undefined) book.language = parsed.metadata.language;
    if (parsed.metadata.publisher !== undefined) book.publisher = parsed.metadata.publisher;
    if (parsed.metadata.publishedAt !== undefined) book.publishedAt = parsed.metadata.publishedAt;
    if (parsed.metadata.identifier !== undefined) book.isbn = parsed.metadata.identifier;
    if (parsed.metadata.description !== undefined) book.description = parsed.metadata.description;
    if (parsed.coverBlob !== undefined) book.coverBlob = parsed.coverBlob;
    if (isAiEnabled()) book.embeddingsStatus = 'pending';

    await books.add(book);

    // Background job: gera embeddings sem bloquear o import. Erros são registados
    // na própria row (book.embeddingsStatus === 'error'), nunca propagam ao caller.
    if (isAiEnabled()) {
      void embedBook(id, parsed.book).catch((err) => {
        console.error('[import] embedBook background job failed', err);
      });
    }

    notify('done');
    return { status: 'imported', bookId: id, title: book.title };
  } catch (err) {
    return { status: 'error', error: err instanceof Error ? err : new Error(String(err)) };
  }
};

/** Hash hex → hue 0–360 determinística (apenas para fallback de capa). */
const hueFromHash = (hex: string): number => {
  let n = 0;
  for (let i = 0; i < Math.min(hex.length, 8); i++) {
    n = (n * 31 + hex.charCodeAt(i)) >>> 0;
  }
  return n % 360;
};
