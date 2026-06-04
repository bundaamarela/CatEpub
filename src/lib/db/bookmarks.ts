import type { Bookmark } from '@/types/note';
import { db } from './schema';

export interface BookmarkQuery {
  bookId?: string;
  sort?: 'createdAt';
  order?: 'asc' | 'desc';
  limit?: number;
}

export const getAll = async (): Promise<Bookmark[]> => db.bookmarks.toArray();

export const getById = async (id: string): Promise<Bookmark | undefined> => db.bookmarks.get(id);

export const getByBook = async (bookId: string): Promise<Bookmark[]> =>
  db.bookmarks.where('bookId').equals(bookId).toArray();

export const add = async (b: Bookmark): Promise<string> => db.bookmarks.add(b);

export const update = async (id: string, patch: Partial<Bookmark>): Promise<number> =>
  db.bookmarks.update(id, patch);

export const remove = async (id: string): Promise<void> => {
  await db.bookmarks.delete(id);
};

export const query = async (q: BookmarkQuery = {}): Promise<Bookmark[]> => {
  let items: Bookmark[];
  if (q.bookId !== undefined) {
    items = await db.bookmarks.where('bookId').equals(q.bookId).toArray();
  } else {
    items = await db.bookmarks.toArray();
  }
  const order = q.order ?? 'desc';
  const sign = order === 'desc' ? -1 : 1;
  items.sort((a, b) => {
    if (a.createdAt < b.createdAt) return -1 * sign;
    if (a.createdAt > b.createdAt) return 1 * sign;
    return 0;
  });
  if (q.limit !== undefined) items = items.slice(0, q.limit);
  return items;
};

export const count = async (): Promise<number> => db.bookmarks.count();
