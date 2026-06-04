import JSZip from 'jszip';

import * as booksDb from '@/lib/db/books';
import * as flashcardsDb from '@/lib/db/flashcards';
import * as highlightsDb from '@/lib/db/highlights';
import * as notesDb from '@/lib/db/notes';
import { noteToMarkdown } from '@/lib/knowledge/markdown';
import type { Book } from '@/types/book';

const SCHEMA_VERSION = 1;

const ILLEGAL_CHARS = /[/\\:*?"<>|]/g;

export const toSlug = (text: string): string => {
  const base = text
    .replace(ILLEGAL_CHARS, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return base.length === 0 ? 'untitled' : base;
};

const dedupeSlug = (slug: string, used: Set<string>): string => {
  if (!used.has(slug)) {
    used.add(slug);
    return slug;
  }
  let i = 1;
  let candidate = `${slug}-${i}`;
  while (used.has(candidate)) {
    i += 1;
    candidate = `${slug}-${i}`;
  }
  used.add(candidate);
  return candidate;
};

const stripBlobs = (book: Book): Omit<Book, 'fileBlob' | 'coverBlob'> => {
  const { fileBlob: _f, coverBlob: _c, ...rest } = book;
  return rest;
};

export interface ExportOptions {
  includeEpubs: boolean;
  onProgress?: (pct: number) => void;
}

export interface ExportManifest {
  schemaVersion: number;
  exportedAt: string;
  counts: {
    books: number;
    notes: number;
    highlights: number;
    flashcards: number;
  };
}

export const exportArsenal = async (options: ExportOptions): Promise<Blob> => {
  const { includeEpubs, onProgress } = options;
  const report = onProgress ?? (() => {});

  const [books, allNotes, allHighlights, allFlashcards] = await Promise.all([
    booksDb.getAll(),
    notesDb.getAll(),
    highlightsDb.getAll(),
    flashcardsDb.getAll(),
  ]);
  report(10);

  const highlightsByBook = new Map<string, typeof allHighlights>();
  for (const h of allHighlights) {
    const arr = highlightsByBook.get(h.bookId);
    if (arr !== undefined) arr.push(h);
    else highlightsByBook.set(h.bookId, [h]);
  }

  const highlightById = new Map(allHighlights.map((h) => [h.id, h]));
  const zip = new JSZip();
  const usedSlugs = new Set<string>();

  const total = books.length;
  for (let i = 0; i < total; i++) {
    const book = books[i];
    if (book === undefined) continue;
    const slug = dedupeSlug(toSlug(book.title), usedSlugs);
    const bookNotes = allNotes.filter((n) => n.bookId === book.id);

    for (const note of bookNotes) {
      const highlight =
        note.highlightId !== undefined ? highlightById.get(note.highlightId) : undefined;
      const md = noteToMarkdown(note, highlight, book);
      zip.file(`notes/${slug}/${note.id}.md`, md);
    }

    if (includeEpubs) {
      const arrayBuffer = await book.fileBlob.arrayBuffer();
      zip.file(`epubs/${slug}.epub`, arrayBuffer);
    }

    report(10 + Math.round(((i + 1) / total) * 70));
  }

  zip.file(
    'books.json',
    JSON.stringify(books.map(stripBlobs), null, 2),
  );
  zip.file('highlights.json', JSON.stringify(allHighlights, null, 2));
  zip.file('flashcards.json', JSON.stringify(allFlashcards, null, 2));
  report(85);

  const manifest: ExportManifest = {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      books: books.length,
      notes: allNotes.length,
      highlights: allHighlights.length,
      flashcards: allFlashcards.length,
    },
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));
  report(90);

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  report(100);
  return blob;
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
