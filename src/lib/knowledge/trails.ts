import { ulid } from 'ulid';

import * as trailsDb from '@/lib/db/trails';
import type { TrailNodeType, TrailSource, TrailStep } from '@/types/trail';

let activeSessionId: string | null = null;

const getSessionId = (): string => {
  if (activeSessionId === null) {
    activeSessionId = ulid();
  }
  return activeSessionId;
};

export const startNewSession = (): string => {
  activeSessionId = ulid();
  return activeSessionId;
};

export interface RecordStepInput {
  fromType: TrailNodeType;
  fromId: string;
  fromBookId?: string;
  toType: TrailNodeType;
  toId: string;
  toBookId?: string;
  source: TrailSource;
}

export const recordStep = async (input: RecordStepInput): Promise<void> => {
  const step: TrailStep = {
    id: ulid(),
    sessionId: getSessionId(),
    fromType: input.fromType,
    fromId: input.fromId,
    ...(input.fromBookId !== undefined ? { fromBookId: input.fromBookId } : {}),
    toType: input.toType,
    toId: input.toId,
    ...(input.toBookId !== undefined ? { toBookId: input.toBookId } : {}),
    source: input.source,
    timestamp: new Date().toISOString(),
  };
  await trailsDb.add(step);
};

export const getCurrentSessionTrail = async (): Promise<TrailStep[]> => {
  if (activeSessionId === null) return [];
  const steps = await trailsDb.getBySession(activeSessionId);
  return steps.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
};

export const getTodayTrail = async (): Promise<TrailStep[]> => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const steps = await trailsDb.getSince(startOfDay.toISOString());
  return steps.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
};

export interface BookInfluence {
  fromBookId: string;
  toBookId: string;
  count: number;
}

export interface TrailGraph {
  edges: BookInfluence[];
  totalSteps: number;
}

export const buildTrailGraph = async (): Promise<TrailGraph> => {
  const all = await trailsDb.getAll();
  const counts = new Map<string, number>();

  for (const s of all) {
    if (s.fromBookId === undefined || s.toBookId === undefined) continue;
    if (s.fromBookId === s.toBookId) continue;
    const key = `${s.fromBookId}::${s.toBookId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const edges: BookInfluence[] = [];
  for (const [key, count] of counts) {
    const [fromBookId, toBookId] = key.split('::');
    if (fromBookId === undefined || toBookId === undefined) continue;
    edges.push({ fromBookId, toBookId, count });
  }

  edges.sort((a, b) => b.count - a.count);
  return { edges, totalSteps: all.length };
};
