import type { ReadingPosition } from '@/types/book';
import { db } from './schema';

export const getAll = async (): Promise<ReadingPosition[]> => db.positions.toArray();

export const getById = async (bookId: string): Promise<ReadingPosition | undefined> =>
  db.positions.get(bookId);

export const upsert = async (pos: ReadingPosition): Promise<string> => db.positions.put(pos);

export const remove = async (bookId: string): Promise<void> => {
  await db.positions.delete(bookId);
};
