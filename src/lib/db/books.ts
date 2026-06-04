import type { Book } from '@/types/book';
import { db } from './schema';

export type BookSort = 'title' | 'author' | 'addedAt' | 'lastReadAt';

export interface BookQuery {
  /** Filtro por categoria (utilizador-definida no `Book`). */
  category?: string;
  /** Filtro por tag (string match exacto contra elementos do array `tags`). */
  tag?: string;
  /** Filtro por autor (string match exacto). */
  author?: string;
  /** Apenas os com `lastReadAt` definido. */
  onlyOpened?: boolean;
  /** Apenas os com `finishedAt` definido. */
  onlyFinished?: boolean;
  sort?: BookSort;
  /** `desc` ordenação descendente. Default `desc` para `addedAt`/`lastReadAt`. */
  order?: 'asc' | 'desc';
  limit?: number;
}

export const getAll = async (): Promise<Book[]> => db.books.toArray();

export const getById = async (id: string): Promise<Book | undefined> => db.books.get(id);

export const getByHash = async (hash: string): Promise<Book | undefined> =>
  db.books.where('fileHash').equals(hash).first();

export const add = async (book: Book): Promise<string> => db.books.add(book);

export const update = async (id: string, patch: Partial<Book>): Promise<number> =>
  db.books.update(id, patch);

/** Remove o livro e os dados associados (positions, highlights, notes, bookmarks, sessions, flashcards, embeddings). */
export const remove = async (id: string): Promise<void> => {
  await db.transaction(
    'rw',
    [
      db.books,
      db.positions,
      db.highlights,
      db.notes,
      db.bookmarks,
      db.sessions,
      db.flashcards,
      db.embeddings,
    ],
    async () => {
      await db.books.delete(id);
      await db.positions.delete(id);
      await db.highlights.where('bookId').equals(id).delete();
      await db.notes.where('bookId').equals(id).delete();
      await db.bookmarks.where('bookId').equals(id).delete();
      await db.sessions.where('bookId').equals(id).delete();
      await db.flashcards.where('bookId').equals(id).delete();
      await db.embeddings.where('bookId').equals(id).delete();
    },
  );
};

export const query = async (q: BookQuery = {}): Promise<Book[]> => {
  let collection = db.books.toCollection();

  if (q.author !== undefined) {
    collection = db.books.where('author').equals(q.author);
  }

  let books = await collection.toArray();

  if (q.category !== undefined) {
    books = books.filter((b) => b.category === q.category);
  }
  if (q.tag !== undefined) {
    books = books.filter((b) => b.tags.includes(q.tag as string));
  }
  if (q.onlyOpened) {
    books = books.filter((b) => Boolean(b.lastReadAt));
  }
  if (q.onlyFinished) {
    books = books.filter((b) => Boolean(b.finishedAt));
  }

  const sort = q.sort ?? 'addedAt';
  const defaultDesc = sort === 'addedAt' || sort === 'lastReadAt';
  const order = q.order ?? (defaultDesc ? 'desc' : 'asc');
  const sign = order === 'desc' ? -1 : 1;

  books.sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (av === undefined && bv === undefined) return 0;
    if (av === undefined) return 1; // undefined sempre no fim
    if (bv === undefined) return -1;
    if (av < bv) return -1 * sign;
    if (av > bv) return 1 * sign;
    return 0;
  });

  if (q.limit !== undefined) books = books.slice(0, q.limit);
  return books;
};

export const count = async (): Promise<number> => db.books.count();
