import type { Highlight, HighlightColor } from '@/types/highlight';
import { db } from './schema';

export interface HighlightQuery {
  bookId?: string;
  color?: HighlightColor;
  /** Filtro hierárquico por tag (`estratégia` casa também `estratégia/jogos`). */
  tagPrefix?: string;
  sort?: 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
  limit?: number;
}

export const getAll = async (): Promise<Highlight[]> => db.highlights.toArray();

export const getById = async (id: string): Promise<Highlight | undefined> => db.highlights.get(id);

export const getByBook = async (bookId: string): Promise<Highlight[]> =>
  db.highlights.where('bookId').equals(bookId).toArray();

export const add = async (h: Highlight): Promise<string> => db.highlights.add(h);

export const update = async (id: string, patch: Partial<Highlight>): Promise<number> =>
  db.highlights.update(id, patch);

export const remove = async (id: string): Promise<void> => {
  await db.highlights.delete(id);
};

export const query = async (q: HighlightQuery = {}): Promise<Highlight[]> => {
  let items: Highlight[];
  if (q.bookId !== undefined) {
    items = await db.highlights.where('bookId').equals(q.bookId).toArray();
  } else {
    items = await db.highlights.toArray();
  }

  if (q.color !== undefined) items = items.filter((h) => h.color === q.color);
  if (q.tagPrefix !== undefined) {
    const prefix = q.tagPrefix;
    items = items.filter((h) => h.tags.some((t) => t === prefix || t.startsWith(`${prefix}/`)));
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

export const count = async (): Promise<number> => db.highlights.count();
