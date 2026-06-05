import JSZip from 'jszip';

import * as backlinksDb from '@/lib/db/backlinks';
import * as booksDb from '@/lib/db/books';
import * as flashcardsDb from '@/lib/db/flashcards';
import * as highlightsDb from '@/lib/db/highlights';
import * as notesDb from '@/lib/db/notes';
import { buildSemanticEdges } from '@/lib/knowledge/graph';
import { noteToMarkdown } from '@/lib/knowledge/markdown';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';

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

// ─── Obsidian vault export ────────────────────────────────────────────────

interface ObsidianFrontmatter {
  id: string;
  book: string;
  author?: string;
  tags: string[];
  cfi?: string;
  highlightId?: string;
  color?: string;
  created: string;
  updated: string;
}

const yamlEscape = (s: string): string => {
  if (/[:#'"\n]|^\s|\s$/.test(s)) return `"${s.replace(/"/g, '\\"')}"`;
  return s;
};

const buildObsidianFrontmatter = (fm: ObsidianFrontmatter): string => {
  const lines = ['---'];
  lines.push(`id: ${yamlEscape(fm.id)}`);
  lines.push(`book: ${yamlEscape(fm.book)}`);
  if (fm.author !== undefined) lines.push(`author: ${yamlEscape(fm.author)}`);
  lines.push(`tags: [${fm.tags.map((t) => yamlEscape(t)).join(', ')}]`);
  if (fm.cfi !== undefined) lines.push(`cfi: ${yamlEscape(fm.cfi)}`);
  if (fm.highlightId !== undefined) lines.push(`highlightId: ${yamlEscape(fm.highlightId)}`);
  if (fm.color !== undefined) lines.push(`color: ${fm.color}`);
  lines.push(`created: ${fm.created}`);
  lines.push(`updated: ${fm.updated}`);
  lines.push('---');
  return lines.join('\n');
};

const buildNoteWithWikilinks = (
  note: Note,
  highlight: Highlight | undefined,
  book: Book,
  noteTitlesById: Map<string, string>,
  bookSlugsByTitle: Map<string, string>,
  backlinksToThisNote: Array<{ sourceId: string; sourceTitle: string }>,
): string => {
  const fm: ObsidianFrontmatter = {
    id: note.id,
    book: book.title,
    tags: note.tags,
    created: note.createdAt,
    updated: note.updatedAt,
  };
  if (book.author.length > 0) fm.author = book.author;
  if (highlight !== undefined) {
    fm.color = highlight.color;
    fm.cfi = highlight.cfiRange;
    fm.highlightId = highlight.id;
  } else if (note.cfi !== undefined) {
    fm.cfi = note.cfi;
  }

  const parts: string[] = [];
  parts.push(buildObsidianFrontmatter(fm));
  parts.push('');

  if (note.title !== undefined && note.title.length > 0) {
    parts.push(`# ${note.title}`);
    parts.push('');
  }

  if (highlight !== undefined) {
    const quoted = highlight.text
      .trim()
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    parts.push(quoted);
    parts.push('');
  }

  // Rewrite [[X]] tokens so they resolve in Obsidian when the target is
  // another exported note/book. Unknown targets are kept verbatim — Obsidian
  // will render them as orphan links the user can resolve manually.
  let body = note.body;
  body = body.replace(/\[\[([^\]]+)\]\]/g, (_match, target: string) => {
    const targetLower = target.toLowerCase();
    const noteMatch = [...noteTitlesById.values()].find(
      (t) => t.toLowerCase() === targetLower,
    );
    if (noteMatch !== undefined) return `[[${noteMatch}]]`;
    const bookSlug = bookSlugsByTitle.get(targetLower);
    if (bookSlug !== undefined) return `[[${bookSlug}/_index]]`;
    return `[[${target}]]`;
  });
  parts.push(body);

  if (backlinksToThisNote.length > 0) {
    parts.push('');
    parts.push('---');
    parts.push('');
    parts.push('## Referenciado por');
    parts.push('');
    for (const bl of backlinksToThisNote) {
      parts.push(`- [[${bl.sourceTitle}]]`);
    }
  }

  return parts.join('\n');
};

const buildBookIndex = (
  book: Book,
  bookHighlights: Highlight[],
  bookNotes: Note[],
): string => {
  const lines: string[] = [];
  lines.push('---');
  lines.push(`book: ${yamlEscape(book.title)}`);
  if (book.author.length > 0) lines.push(`author: ${yamlEscape(book.author)}`);
  lines.push(`tags: [book]`);
  lines.push(`highlights: ${bookHighlights.length}`);
  lines.push(`notes: ${bookNotes.length}`);
  lines.push('---');
  lines.push('');
  lines.push(`# ${book.title}`);
  if (book.author.length > 0) {
    lines.push('');
    lines.push(`*${book.author}*`);
  }
  if (book.description !== undefined && book.description.length > 0) {
    lines.push('');
    lines.push(book.description);
  }

  if (bookHighlights.length > 0) {
    lines.push('');
    lines.push('## Highlights');
    lines.push('');
    for (const h of bookHighlights) {
      const quoted = h.text.trim().split('\n').map((l) => `> ${l}`).join('\n');
      lines.push(quoted);
      if (h.note !== undefined && h.note.trim().length > 0) {
        lines.push('');
        lines.push(h.note.trim());
      }
      lines.push('');
    }
  }

  if (bookNotes.length > 0) {
    lines.push('## Notas');
    lines.push('');
    for (const n of bookNotes) {
      const title = n.title !== undefined && n.title.length > 0 ? n.title : n.id;
      lines.push(`- [[${title}]]`);
    }
  }

  return lines.join('\n');
};

export interface ObsidianGraphData {
  nodes: Array<{ id: string; label: string; bookId: string; bookTitle: string }>;
  edges: Array<{ source: string; target: string; similarity: number }>;
}

/**
 * Generates an Obsidian-compatible vault as a ZIP. Folder layout:
 *
 * ```
 * /notes/{book-slug}/{note-id}.md   ← one note per file, frontmatter + wikilinks
 * /notes/{book-slug}/_index.md      ← summary of all highlights for the book
 * /graph-data.json                  ← semantic edges from buildSemanticEdges
 * ```
 *
 * `vaultPath` is metadata only — embedded in the manifest comment for the user
 * who wants to know where they should drop the contents. The ZIP itself is
 * always portable.
 */
export const exportToObsidian = async (vaultPath?: string): Promise<Blob> => {
  const [books, allNotes, allHighlights, allBacklinks] = await Promise.all([
    booksDb.getAll(),
    notesDb.getAll(),
    highlightsDb.getAll(),
    backlinksDb.getAll(),
  ]);

  const highlightById = new Map(allHighlights.map((h) => [h.id, h]));
  const noteById = new Map(allNotes.map((n) => [n.id, n]));
  const bookById = new Map(books.map((b) => [b.id, b]));
  const usedSlugs = new Set<string>();
  const bookSlugsById = new Map<string, string>();
  const bookSlugsByTitle = new Map<string, string>();
  for (const b of books) {
    const slug = dedupeSlug(toSlug(b.title), usedSlugs);
    bookSlugsById.set(b.id, slug);
    bookSlugsByTitle.set(b.title.toLowerCase(), slug);
  }

  const noteTitleFor = (n: Note): string => {
    if (n.title !== undefined && n.title.length > 0) return n.title;
    if (n.highlightId !== undefined) {
      const h = highlightById.get(n.highlightId);
      if (h !== undefined) return h.text.slice(0, 60);
    }
    return n.id;
  };
  const noteTitlesById = new Map(allNotes.map((n) => [n.id, noteTitleFor(n)] as const));

  const backlinksByTarget = new Map<string, Array<{ sourceId: string; sourceTitle: string }>>();
  for (const bl of allBacklinks) {
    const arr = backlinksByTarget.get(bl.targetId) ?? [];
    const sourceNote = noteById.get(bl.sourceId);
    if (sourceNote !== undefined) {
      arr.push({ sourceId: bl.sourceId, sourceTitle: noteTitlesById.get(bl.sourceId) ?? bl.sourceId });
    }
    backlinksByTarget.set(bl.targetId, arr);
  }

  const zip = new JSZip();

  for (const book of books) {
    const slug = bookSlugsById.get(book.id);
    if (slug === undefined) continue;
    const bookHighlights = allHighlights.filter((h) => h.bookId === book.id);
    const bookNotes = allNotes.filter((n) => n.bookId === book.id);

    for (const note of bookNotes) {
      const highlight = note.highlightId !== undefined ? highlightById.get(note.highlightId) : undefined;
      const bls = backlinksByTarget.get(note.id) ?? [];
      const md = buildNoteWithWikilinks(
        note,
        highlight,
        book,
        noteTitlesById,
        bookSlugsByTitle,
        bls,
      );
      zip.file(`notes/${slug}/${note.id}.md`, md);
    }

    zip.file(`notes/${slug}/_index.md`, buildBookIndex(book, bookHighlights, bookNotes));
  }

  const edges = await buildSemanticEdges(allHighlights, books);
  const graphNodes = allHighlights
    .filter((h) => edges.some((e) => e.sourceId === h.id || e.targetId === h.id))
    .map((h) => ({
      id: h.id,
      label: h.text.slice(0, 50),
      bookId: h.bookId,
      bookTitle: bookById.get(h.bookId)?.title ?? '',
    }));
  const graphData: ObsidianGraphData = {
    nodes: graphNodes,
    edges: edges.map((e) => ({ source: e.sourceId, target: e.targetId, similarity: e.similarity })),
  };
  zip.file('graph-data.json', JSON.stringify(graphData, null, 2));

  const manifest = {
    type: 'obsidian-vault',
    exportedAt: new Date().toISOString(),
    vaultPath: vaultPath ?? null,
    counts: {
      books: books.length,
      notes: allNotes.length,
      highlights: allHighlights.length,
      edges: edges.length,
    },
  };
  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
};

// ─── Anki text export ─────────────────────────────────────────────────────

const ANKI_HEADER = [
  '# Cat Epub → Anki import',
  '# Format: Tab-separated values (TSV)',
  '# Columns: Front<TAB>Back<TAB>Tags',
  '# Import: Anki → File → Import → choose this .txt → "Fields separated by Tab"',
  '#   set "Allow HTML in fields" OFF (cards are plain text)',
].join('\n');

const ankiEscape = (s: string): string =>
  s.replace(/\\/g, '\\\\').replace(/\t/g, ' ').replace(/\r?\n/g, '<br>');

const buildAnkiTags = (
  deckName: string,
  bookSlug: string | undefined,
  highlight: Highlight | undefined,
): string => {
  const tags: string[] = [`cat-epub::${deckName.replace(/\s+/g, '-')}`];
  if (bookSlug !== undefined) tags.push(`cat-epub::book::${bookSlug}`);
  if (highlight?.semanticTag !== undefined) {
    tags.push(`cat-epub::semantic::${highlight.semanticTag}`);
  }
  for (const t of highlight?.tags ?? []) {
    tags.push(`cat-epub::tag::${t.replace(/[\s\t]/g, '-')}`);
  }
  return tags.join(' ');
};

/**
 * Generates an Anki-importable TSV (.txt) Blob. Each line is
 * `front\tback\ttags`. Header comments at the top explain how to import.
 */
export const exportToAnki = async (deckName: string): Promise<Blob> => {
  const [books, allHighlights, allFlashcards] = await Promise.all([
    booksDb.getAll(),
    highlightsDb.getAll(),
    flashcardsDb.getAll(),
  ]);

  const highlightById = new Map(allHighlights.map((h) => [h.id, h]));
  const usedSlugs = new Set<string>();
  const bookSlugsById = new Map<string, string>();
  for (const b of books) {
    bookSlugsById.set(b.id, dedupeSlug(toSlug(b.title), usedSlugs));
  }

  const lines: string[] = [ANKI_HEADER, `# Deck: ${deckName}`, '#'];
  for (const card of allFlashcards) {
    const highlight = card.highlightId !== undefined ? highlightById.get(card.highlightId) : undefined;
    const front = ankiEscape(card.front);
    const back = ankiEscape(card.back);
    const tags = buildAnkiTags(deckName, bookSlugsById.get(card.bookId), highlight);
    lines.push(`${front}\t${back}\t${tags}`);
  }

  const content = `${lines.join('\n')}\n`;
  return new Blob([content], { type: 'text/plain;charset=utf-8' });
};

// ─── Highlights CSV export ────────────────────────────────────────────────

const csvEscape = (value: string): string => {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
};

export const CSV_BOM = '﻿';
export const CSV_HEADER = [
  'title',
  'author',
  'highlight',
  'note',
  'color',
  'tags',
  'created',
  'cfi',
] as const;

/**
 * Generates a CSV of all highlights with their parent book metadata.
 * Encoding: UTF-8 with BOM (so Excel auto-detects the encoding correctly).
 */
export const exportHighlightsCsv = async (): Promise<Blob> => {
  const [books, allHighlights] = await Promise.all([booksDb.getAll(), highlightsDb.getAll()]);
  const bookById = new Map(books.map((b) => [b.id, b]));

  const rows: string[] = [CSV_HEADER.join(',')];
  for (const h of allHighlights) {
    const b = bookById.get(h.bookId);
    const row = [
      csvEscape(b?.title ?? ''),
      csvEscape(b?.author ?? ''),
      csvEscape(h.text),
      csvEscape(h.note ?? ''),
      csvEscape(h.color),
      csvEscape(h.tags.join(';')),
      csvEscape(h.createdAt),
      csvEscape(h.cfiRange),
    ];
    rows.push(row.join(','));
  }

  const content = `${CSV_BOM}${rows.join('\r\n')}\r\n`;
  return new Blob([content], { type: 'text/csv;charset=utf-8' });
};
