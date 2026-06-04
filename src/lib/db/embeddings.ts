import type { Embedding } from '@/types/embedding';
import { db } from './schema';

export const add = async (row: Embedding): Promise<string> => db.embeddings.put(row);

export const addBatch = async (rows: Embedding[]): Promise<void> => {
  await db.embeddings.bulkPut(rows);
};

export const getByBook = async (bookId: string): Promise<Embedding[]> =>
  db.embeddings.where('bookId').equals(bookId).toArray();

export const countByBook = async (bookId: string): Promise<number> =>
  db.embeddings.where('bookId').equals(bookId).count();

export const deleteByBook = async (bookId: string): Promise<void> => {
  await db.embeddings.where('bookId').equals(bookId).delete();
};
