import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';

export interface ConceptEntry {
  tag: string;
  count: number;
  bookIds: string[];
}

export const extractConcepts = (
  highlights: ReadonlyArray<Highlight>,
  notes: ReadonlyArray<Note>,
): ConceptEntry[] => {
  const map = new Map<string, { count: number; bookIds: Set<string> }>();

  for (const h of highlights) {
    for (const tag of h.tags) {
      const lower = tag.toLowerCase();
      const existing = map.get(lower) ?? { count: 0, bookIds: new Set<string>() };
      existing.count++;
      existing.bookIds.add(h.bookId);
      map.set(lower, existing);
    }
  }

  for (const n of notes) {
    for (const tag of n.tags) {
      const lower = tag.toLowerCase();
      const existing = map.get(lower) ?? { count: 0, bookIds: new Set<string>() };
      existing.count++;
      existing.bookIds.add(n.bookId);
      map.set(lower, existing);
    }
  }

  return [...map.entries()]
    .map(([tag, data]) => ({
      tag,
      count: data.count,
      bookIds: [...data.bookIds],
    }))
    .sort((a, b) => b.count - a.count);
};

export interface ConceptDetail {
  tag: string;
  highlights: Array<Highlight & { bookTitle: string }>;
  relatedConcepts: string[];
}

export const getConceptDetail = (
  tag: string,
  highlights: ReadonlyArray<Highlight>,
  notes: ReadonlyArray<Note>,
  books: ReadonlyArray<Book>,
): ConceptDetail => {
  const lower = tag.toLowerCase();
  const bookMap = new Map(books.map((b) => [b.id, b]));

  const matchingHighlights = highlights
    .filter((h) => h.tags.some((t) => t.toLowerCase() === lower))
    .map((h) => ({
      ...h,
      bookTitle: bookMap.get(h.bookId)?.title ?? '',
    }));

  const coOccurring = new Map<string, number>();
  for (const h of matchingHighlights) {
    for (const t of h.tags) {
      const tl = t.toLowerCase();
      if (tl === lower) continue;
      coOccurring.set(tl, (coOccurring.get(tl) ?? 0) + 1);
    }
  }

  const matchingNotes = notes.filter((n) => n.tags.some((t) => t.toLowerCase() === lower));
  for (const n of matchingNotes) {
    for (const t of n.tags) {
      const tl = t.toLowerCase();
      if (tl === lower) continue;
      coOccurring.set(tl, (coOccurring.get(tl) ?? 0) + 1);
    }
  }

  const relatedConcepts = [...coOccurring.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([t]) => t);

  return { tag, highlights: matchingHighlights, relatedConcepts };
};

export const exportConceptMarkdown = (detail: ConceptDetail): string => {
  const lines: string[] = [`# ${detail.tag}`, ''];

  if (detail.relatedConcepts.length > 0) {
    lines.push('## Conceitos relacionados', '');
    lines.push(detail.relatedConcepts.map((c) => `- ${c}`).join('\n'), '');
  }

  lines.push('## Highlights', '');
  for (const h of detail.highlights) {
    lines.push(`### ${h.bookTitle}`, '');
    lines.push(`> "${h.text}"`, '');
    if (h.note !== undefined && h.note.trim().length > 0) {
      lines.push(h.note, '');
    }
    lines.push(`*${new Date(h.createdAt).toLocaleDateString('pt-PT')}*`, '');
  }

  return lines.join('\n');
};
