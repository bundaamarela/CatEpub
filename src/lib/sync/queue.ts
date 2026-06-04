/**
 * Offline sync queue. Mudanças locais que falham por rede ficam armazenadas
 * em `db.syncQueue` e são drenadas quando o browser dispara `online`.
 */

import { ulid } from 'ulid';

import { db } from '@/lib/db/schema';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SyncOperation, SyncQueueItem, SyncTable } from '@/types/sync';

interface EnqueueArgs {
  table: SyncTable;
  recordId: string;
  operation: SyncOperation;
  payload: unknown;
}

export const enqueue = async (args: EnqueueArgs): Promise<void> => {
  const item: SyncQueueItem = {
    id: ulid(),
    table: args.table,
    recordId: args.recordId,
    operation: args.operation,
    payload: args.payload,
    createdAt: new Date().toISOString(),
  };
  await db.syncQueue.add(item);
};

export const queueSize = async (): Promise<number> => db.syncQueue.count();

export const peekQueue = async (): Promise<SyncQueueItem[]> =>
  db.syncQueue.orderBy('createdAt').toArray();

export const clearQueue = async (): Promise<void> => {
  await db.syncQueue.clear();
};

interface DrainOpts {
  client: SupabaseClient;
  userId: string;
}

interface DrainResult {
  drained: number;
  remaining: number;
  errors: string[];
}

/**
 * Drena a fila enviando cada item. Itens que falhem permanecem na fila.
 * Devolve o número de itens drenados e quantos ficaram pendentes.
 */
export const drainQueue = async (opts: DrainOpts): Promise<DrainResult> => {
  const items = await peekQueue();
  const result: DrainResult = { drained: 0, remaining: 0, errors: [] };
  for (const item of items) {
    try {
      if (item.operation === 'upsert') {
        const payload = (item.payload ?? {}) as Record<string, unknown>;
        const { error } = await opts.client
          .from(item.table)
          .upsert({ ...payload, user_id: opts.userId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await opts.client
          .from(item.table)
          .delete()
          .eq('id', item.recordId)
          .eq('user_id', opts.userId);
        if (error) throw new Error(error.message);
      }
      await db.syncQueue.delete(item.id);
      result.drained += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`${item.table}/${item.recordId}: ${msg}`);
    }
  }
  result.remaining = await queueSize();
  return result;
};
