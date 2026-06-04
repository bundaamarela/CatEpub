import type { Flashcard, FlashcardState } from '@/types/flashcard';
import { db } from './schema';

export interface FlashcardQuery {
  bookId?: string;
  highlightId?: string;
  state?: FlashcardState;
  /** Cards com `due` <= esta data (default: agora). */
  dueBefore?: string;
  sort?: 'due' | 'reps' | 'difficulty' | 'stability';
  order?: 'asc' | 'desc';
  limit?: number;
}

export const getAll = async (): Promise<Flashcard[]> => db.flashcards.toArray();

export const getById = async (id: string): Promise<Flashcard | undefined> => db.flashcards.get(id);

export const getByBook = async (bookId: string): Promise<Flashcard[]> =>
  db.flashcards.where('bookId').equals(bookId).toArray();

export const getByHighlight = async (highlightId: string): Promise<Flashcard[]> =>
  db.flashcards.where('highlightId').equals(highlightId).toArray();

export const add = async (c: Flashcard): Promise<string> => db.flashcards.add(c);

export const update = async (id: string, patch: Partial<Flashcard>): Promise<number> =>
  db.flashcards.update(id, patch);

export const remove = async (id: string): Promise<void> => {
  await db.flashcards.delete(id);
};

/** Cards 'due' à data passada (default: agora). */
export const getDue = async (now: Date = new Date()): Promise<Flashcard[]> => {
  const iso = now.toISOString();
  return db.flashcards.where('due').belowOrEqual(iso).toArray();
};

export const countDue = async (now: Date = new Date()): Promise<number> => {
  const iso = now.toISOString();
  return db.flashcards.where('due').belowOrEqual(iso).count();
};

export const query = async (q: FlashcardQuery = {}): Promise<Flashcard[]> => {
  let items: Flashcard[];
  if (q.bookId !== undefined) {
    items = await db.flashcards.where('bookId').equals(q.bookId).toArray();
  } else {
    items = await db.flashcards.toArray();
  }

  if (q.highlightId !== undefined) items = items.filter((c) => c.highlightId === q.highlightId);
  if (q.state !== undefined) items = items.filter((c) => c.state === q.state);
  if (q.dueBefore !== undefined) {
    const cutoff = q.dueBefore;
    items = items.filter((c) => c.due <= cutoff);
  }

  const sort = q.sort ?? 'due';
  const order = q.order ?? 'asc';
  const sign = order === 'desc' ? -1 : 1;
  items.sort((a, b) => {
    if (a[sort] < b[sort]) return -1 * sign;
    if (a[sort] > b[sort]) return 1 * sign;
    return 0;
  });

  if (q.limit !== undefined) items = items.slice(0, q.limit);
  return items;
};

export const count = async (): Promise<number> => db.flashcards.count();
