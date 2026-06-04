/**
 * useSyncTrigger — corre sync ao iniciar a app (se logged in) e debounce 30s
 * após mudanças locais. Drena fila offline ao reconectar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { liveQuery } from 'dexie';
import { useShallow } from 'zustand/shallow';

import { db } from '@/lib/db/schema';
import { usePrefs } from '@/lib/store/prefs';
import { drainQueue } from './queue';
import { getSupabase, getUser, pullChanges, pushChanges } from './supabase';
import type { SyncStatus } from '@/types/sync';

const DEBOUNCE_MS = 30_000;
const LAST_SYNC_KEY = 'cat-epub:lastSyncAt';
const EPOCH_ISO = new Date(0).toISOString();

const readLastSync = (): string => {
  if (typeof localStorage === 'undefined') return EPOCH_ISO;
  return localStorage.getItem(LAST_SYNC_KEY) ?? EPOCH_ISO;
};

const writeLastSync = (iso: string): void => {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LAST_SYNC_KEY, iso);
};

export interface UseSyncTriggerApi {
  status: SyncStatus;
  triggerSync: () => Promise<void>;
}

export const useSyncTrigger = (): UseSyncTriggerApi => {
  const cfg = usePrefs(
    useShallow((s) => ({
      syncEnabled: s.syncEnabled,
      url: s.supabaseUrl,
      key: s.supabaseKey,
    })),
  );

  const [status, setStatus] = useState<SyncStatus>(() => {
    const last = readLastSync();
    return last === EPOCH_ISO ? { kind: 'idle' } : { kind: 'ok', lastSyncAt: last };
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef(false);

  const runSync = useCallback(async (): Promise<void> => {
    if (!cfg.syncEnabled || !cfg.url || !cfg.key) return;
    if (inflightRef.current) return;
    inflightRef.current = true;
    setStatus({ kind: 'syncing' });
    const config = { url: cfg.url, key: cfg.key };
    try {
      const sb = getSupabase(config);
      if (!sb) throw new Error('Cliente Supabase não disponível.');
      const user = await getUser(config);
      if (!user) throw new Error('Sem sessão activa.');

      const drain = await drainQueue({ client: sb, userId: user.id });
      const since = readLastSync();
      const push = await pushChanges({ cfg: config, userId: user.id, since });
      const pull = await pullChanges({ cfg: config, userId: user.id, since });

      const allErrors = [...drain.errors, ...push.errors, ...pull.errors];
      if (allErrors.length > 0) {
        setStatus({ kind: 'error', message: allErrors[0] ?? 'Erro desconhecido.' });
      } else {
        const now = new Date().toISOString();
        writeLastSync(now);
        setStatus({ kind: 'ok', lastSyncAt: now });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus({ kind: 'error', message: msg });
    } finally {
      inflightRef.current = false;
    }
  }, [cfg.syncEnabled, cfg.url, cfg.key]);

  // Drain queue on `online` event.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onOnline = (): void => {
      void runSync();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [runSync]);

  // Initial sync on mount when sync is enabled.
  // setTimeout 0 to avoid the cascading-render warning — sync state changes
  // belong outside the render cycle that triggered the effect.
  useEffect(() => {
    if (!cfg.syncEnabled || !cfg.url || !cfg.key) return;
    const t = setTimeout(() => {
      void runSync();
    }, 0);
    return () => clearTimeout(t);
  }, [cfg.syncEnabled, cfg.url, cfg.key, runSync]);

  // Debounced sync after changes in highlights/notes/bookmarks/flashcards.
  useEffect(() => {
    if (!cfg.syncEnabled || !cfg.url || !cfg.key) return;
    let firstEmission = true;
    const subscription = liveQuery(async () => {
      const [h, n, b, f] = await Promise.all([
        db.highlights.count(),
        db.notes.count(),
        db.bookmarks.count(),
        db.flashcards.count(),
      ]);
      return `${h}:${n}:${b}:${f}`;
    }).subscribe({
      next: () => {
        if (firstEmission) {
          firstEmission = false;
          return;
        }
        if (debounceRef.current !== null) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void runSync();
        }, DEBOUNCE_MS);
      },
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, [cfg.syncEnabled, cfg.url, cfg.key, runSync]);

  return { status, triggerSync: runSync };
};
