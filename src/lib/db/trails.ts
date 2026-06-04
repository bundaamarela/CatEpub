import type { TrailStep } from '@/types/trail';
import { db } from './schema';

export const add = async (step: TrailStep): Promise<string> => db.trailSteps.add(step);

export const getAll = async (): Promise<TrailStep[]> => db.trailSteps.toArray();

export const getBySession = async (sessionId: string): Promise<TrailStep[]> =>
  db.trailSteps.where('sessionId').equals(sessionId).toArray();

export const getSince = async (isoTimestamp: string): Promise<TrailStep[]> =>
  db.trailSteps.where('timestamp').above(isoTimestamp).toArray();

export const clear = async (): Promise<void> => {
  await db.trailSteps.clear();
};
