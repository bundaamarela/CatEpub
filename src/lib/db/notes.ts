import type { Note } from '@/types/note';
import { db } from './schema';

export interface NoteQuery {
  bookId?: string;
  highlightId?: string;
  tagPrefix?: string;
  /** Procura textual (case-insensitive) no `body` e `title`. */
  text?: string;
  sort?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  limit?: number;
}

export const getAll = async (): Promise<Note[]> => db.notes.toArray();

export const getById = async (id: string): Promise<Note | undefined> => db.notes.get(id);

export const getByBook = async (bookId: string): Promise<Note[]> =>
  db.notes.where('bookId').equals(bookId).toArray();

export const getByHighlight = async (highlightId: string): Promise<Note[]> =>
  db.notes.where('highlightId').equals(highlightId).toArray();

export const add = async (n: Note): Promise<string> => db.notes.add(n);

export const update = async (id: string, patch: Partial<Note>): Promise<number> =>
  db.notes.update(id, patch);

export const remove = async (id: string): Promise<void> => {
  await db.notes.delete(id);
};

export const query = async (q: NoteQuery = {}): Promise<Note[]> => {
  let items: Note[];
  if (q.bookId !== undefined) {
    items = await db.notes.where('bookId').equals(q.bookId).toArray();
  } else if (q.highlightId !== undefined) {
    items = await db.notes.where('highlightId').equals(q.highlightId).toArray();
  } else {
    items = await db.notes.toArray();
  }

  if (q.tagPrefix !== undefined) {
    const prefix = q.tagPrefix;
    items = items.filter((n) => n.tags.some((t) => t === prefix || t.startsWith(`${prefix}/`)));
  }

  if (q.text !== undefined) {
    const needle = q.text.toLowerCase();
    items = items.filter(
      (n) =>
        n.body.toLowerCase().includes(needle) ||
        (n.title !== undefined && n.title.toLowerCase().includes(needle)),
    );
  }

  const sort = q.sort ?? 'createdAt';
  const order = q.order ?? 'desc';
  const sign = order === 'desc' ? -1 : 1;
  items.sort((a, b) => {
    if (a[sort] < b[sort]) return -1 * sign;
    if (a[sort] > b[sort]) return 1 * sign;
    return 0;
  });

  if (q.limit !== undefined) items = items.slice(0, q.limit);
  return items;
};

export const count = async (): Promise<number> => db.notes.count();
