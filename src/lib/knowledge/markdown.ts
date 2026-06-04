import matter from 'gray-matter';

import type { Book } from '@/types/book';
import type { Highlight, HighlightColor } from '@/types/highlight';
import type { Note } from '@/types/note';

/**
 * Forma canónica do frontmatter YAML emitido por `noteToMarkdown`. Os ficheiros
 * `.md` exportados são portáveis para Obsidian, Logseq, Foam, etc.
 */
export interface NoteFrontmatter {
  id: string;
  bookId: string;
  book?: string;
  author?: string;
  tags: string[];
  color?: HighlightColor;
  cfi?: string;
  highlightId?: string;
  title?: string;
  created: string;
  updated: string;
}

/**
 * Serializa uma nota como markdown com frontmatter YAML. Quando o highlight
 * associado é fornecido, o seu texto é embebido como blockquote acima do corpo
 * da nota para legibilidade humana — a fonte canónica continua a ser o registo
 * Highlight na base de dados.
 */
export const noteToMarkdown = (note: Note, highlight?: Highlight, book?: Book): string => {
  const fm: NoteFrontmatter = {
    id: note.id,
    bookId: note.bookId,
    tags: note.tags,
    created: note.createdAt,
    updated: note.updatedAt,
  };
  if (book !== undefined) {
    fm.book = book.title;
    if (book.author.length > 0) fm.author = book.author;
  }
  if (highlight !== undefined) {
    fm.color = highlight.color;
    fm.cfi = highlight.cfiRange;
    fm.highlightId = highlight.id;
  } else {
    if (note.cfi !== undefined) fm.cfi = note.cfi;
    if (note.highlightId !== undefined) fm.highlightId = note.highlightId;
  }
  if (note.title !== undefined && note.title.length > 0) fm.title = note.title;

  const parts: string[] = [];
  if (highlight !== undefined) {
    const quoted = highlight.text
      .trim()
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n');
    parts.push(quoted);
    parts.push('');
  }
  parts.push(note.body);

  return matter.stringify(parts.join('\n'), fm as unknown as Record<string, unknown>);
};

interface ParsedFrontmatter {
  id?: unknown;
  bookId?: unknown;
  tags?: unknown;
  cfi?: unknown;
  highlightId?: unknown;
  title?: unknown;
  created?: unknown;
  updated?: unknown;
}

const asString = (v: unknown): string | undefined => (typeof v === 'string' ? v : undefined);
const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/**
 * Parse inverso: extrai o `Partial<Note>` a partir do markdown gerado por
 * `noteToMarkdown`. O blockquote inicial (texto do highlight) é descartado
 * porque pertence ao registo Highlight, não à Note.
 */
export const markdownToNote = (md: string): Partial<Note> => {
  const parsed = matter(md);
  const fm = parsed.data as ParsedFrontmatter;
  let body = parsed.content;

  // Se o markdown veio com texto de highlight prefixado, descarta-o.
  const hasHighlightContext = fm.highlightId !== undefined || fm.cfi !== undefined;
  if (hasHighlightContext) {
    body = body.replace(/^\s*(?:>[^\n]*\n?)+/, '');
  }

  body = body.replace(/^\n+/, '').replace(/\n+$/, '');

  const out: Partial<Note> = {
    body,
    tags: asStringArray(fm.tags),
  };
  const id = asString(fm.id);
  if (id !== undefined) out.id = id;
  const bookId = asString(fm.bookId);
  if (bookId !== undefined) out.bookId = bookId;
  const cfi = asString(fm.cfi);
  if (cfi !== undefined) out.cfi = cfi;
  const highlightId = asString(fm.highlightId);
  if (highlightId !== undefined) out.highlightId = highlightId;
  const title = asString(fm.title);
  if (title !== undefined) out.title = title;
  const created = asString(fm.created);
  if (created !== undefined) out.createdAt = created;
  const updated = asString(fm.updated);
  if (updated !== undefined) out.updatedAt = updated;
  return out;
};
