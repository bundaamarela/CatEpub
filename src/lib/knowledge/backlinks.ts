import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';

export interface ResolvedLink {
  type: 'note' | 'book' | 'highlight';
  id: string;
  title: string;
}

const LINK_RE = /\[\[([^\]]+)\]\]/g;

export const extractLinks = (body: string): string[] => {
  const links: string[] = [];
  let match: RegExpExecArray | null;
  LINK_RE.lastIndex = 0;
  while ((match = LINK_RE.exec(body)) !== null) {
    if (match[1] !== undefined && match[1].trim().length > 0) {
      links.push(match[1].trim());
    }
  }
  return links;
};

export const resolveLink = (
  target: string,
  notes: ReadonlyArray<Note>,
  books: ReadonlyArray<Book>,
  highlights?: ReadonlyArray<Highlight>,
): ResolvedLink | null => {
  const lower = target.toLowerCase();

  const note = notes.find(
    (n) => n.title !== undefined && n.title.toLowerCase() === lower,
  );
  if (note !== undefined) return { type: 'note', id: note.id, title: note.title ?? target };

  const book = books.find((b) => b.title.toLowerCase() === lower);
  if (book !== undefined) return { type: 'book', id: book.id, title: book.title };

  if (highlights !== undefined) {
    const hl = highlights.find(
      (h) => h.text.toLowerCase().startsWith(lower) || h.text.toLowerCase() === lower,
    );
    if (hl !== undefined) return { type: 'highlight', id: hl.id, title: hl.text.slice(0, 80) };
  }

  return null;
};

export interface BacklinkEntry {
  sourceId: string;
  sourceTitle: string;
  targetId: string;
  targetType: 'note' | 'book' | 'highlight';
}

export const buildBacklinkIndex = (
  notes: ReadonlyArray<Note>,
  books: ReadonlyArray<Book>,
  highlights?: ReadonlyArray<Highlight>,
): Map<string, BacklinkEntry[]> => {
  const index = new Map<string, BacklinkEntry[]>();

  for (const note of notes) {
    const links = extractLinks(note.body);
    for (const linkText of links) {
      const resolved = resolveLink(linkText, notes, books, highlights);
      if (resolved === null) continue;
      const existing = index.get(resolved.id) ?? [];
      if (!existing.some((e) => e.sourceId === note.id)) {
        existing.push({
          sourceId: note.id,
          sourceTitle: note.title ?? 'Sem título',
          targetId: resolved.id,
          targetType: resolved.type,
        });
        index.set(resolved.id, existing);
      }
    }
  }

  if (highlights !== undefined) {
    for (const hl of highlights) {
      if (hl.note === undefined || hl.note.trim().length === 0) continue;
      const links = extractLinks(hl.note);
      for (const linkText of links) {
        const resolved = resolveLink(linkText, notes, books, highlights);
        if (resolved === null) continue;
        const existing = index.get(resolved.id) ?? [];
        if (!existing.some((e) => e.sourceId === hl.id)) {
          existing.push({
            sourceId: hl.id,
            sourceTitle: hl.text.slice(0, 60),
            targetId: resolved.id,
            targetType: resolved.type,
          });
          index.set(resolved.id, existing);
        }
      }
    }
  }

  return index;
};

export const getAutocompleteCandidates = (
  notes: ReadonlyArray<Note>,
  books: ReadonlyArray<Book>,
): Array<{ label: string; type: 'note' | 'book' }> => {
  const items: Array<{ label: string; type: 'note' | 'book' }> = [];
  for (const n of notes) {
    if (n.title !== undefined && n.title.trim().length > 0) {
      items.push({ label: n.title, type: 'note' });
    }
  }
  for (const b of books) {
    items.push({ label: b.title, type: 'book' });
  }
  return items;
};
