import type { Backlink } from '@/types/backlink';
import { db } from './schema';

export const getByTarget = async (targetId: string): Promise<Backlink[]> =>
  db.backlinks.where('targetId').equals(targetId).toArray();

export const getBySource = async (sourceId: string): Promise<Backlink[]> =>
  db.backlinks.where('sourceId').equals(sourceId).toArray();

export const replaceForSource = async (sourceId: string, links: Backlink[]): Promise<void> => {
  await db.transaction('rw', db.backlinks, async () => {
    await db.backlinks.where('sourceId').equals(sourceId).delete();
    if (links.length > 0) {
      await db.backlinks.bulkAdd(links);
    }
  });
};

export const removeBySource = async (sourceId: string): Promise<void> => {
  await db.backlinks.where('sourceId').equals(sourceId).delete();
};

export const removeByTarget = async (targetId: string): Promise<void> => {
  await db.backlinks.where('targetId').equals(targetId).delete();
};

export const getAll = async (): Promise<Backlink[]> => db.backlinks.toArray();
