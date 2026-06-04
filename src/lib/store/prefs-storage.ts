import Dexie, { type Table } from 'dexie';
import type { StateStorage } from 'zustand/middleware';

import { db } from '@/lib/db/schema';
import { putPrefs } from '@/lib/db/prefs';
import type { Preferences } from '@/types/prefs';

/**
 * Adapter Dexie para o middleware `persist` do Zustand.
 *
 * Persiste a linha `singleton` na tabela `prefs` do schema canónico
 * (`CatEpub`). O envelope Zustand (`{ state, version }`) é decomposto:
 *  - `state` → campos directos da linha singleton (mantém os tipos da
 *    interface `Preferences` consultáveis directamente em queries Dexie).
 *  - `version` → guardada em `_persistVersion` na mesma linha.
 *
 * Migração transparente: na primeira leitura, se existir a base antiga
 * `CatEpubPrefs.kv` (Phase 1) e ainda não houver singleton, copia o valor
 * e elimina a base antiga.
 */

interface ZustandEnvelope {
  state: Preferences;
  version?: number;
}

interface OldKvRow {
  key: string;
  value: string;
}

class OldPrefsKvDB extends Dexie {
  kv!: Table<OldKvRow, string>;
  constructor() {
    super('CatEpubPrefs');
    this.version(1).stores({ kv: 'key' });
  }
}

let migratedPromise: Promise<void> | null = null;

const ensureMigrated = async (): Promise<void> => {
  if (migratedPromise) return migratedPromise;
  migratedPromise = (async () => {
    const exists = await db.prefs.get('singleton');
    if (exists) return;
    if (typeof indexedDB === 'undefined') return;

    // Verifica se a base antiga existe sem a abrir desnecessariamente.
    const dbs = (await Dexie.getDatabaseNames()) ?? [];
    if (!dbs.includes('CatEpubPrefs')) return;

    const old = new OldPrefsKvDB();
    try {
      const rows = await old.kv.toArray();
      for (const row of rows) {
        try {
          const env = JSON.parse(row.value) as ZustandEnvelope;
          if (env && typeof env === 'object' && env.state) {
            await putPrefs(env.state, { persistVersion: env.version ?? 0 });
            break; // só uma linha relevante (o key do persist)
          }
        } catch {
          // valor inválido, ignora
        }
      }
    } finally {
      old.close();
      try {
        await Dexie.delete('CatEpubPrefs');
      } catch {
        // best-effort; não bloquear
      }
    }
  })();
  return migratedPromise;
};

export const dexieStorage: StateStorage = {
  getItem: async (_name) => {
    await ensureMigrated();
    const row = await db.prefs.get('singleton');
    if (!row) return null;
    const { _persistVersion, _persistEnvelopeKey, id, ...prefs } = row;
    void _persistEnvelopeKey;
    void id;
    const envelope: ZustandEnvelope = {
      state: prefs as Preferences,
      version: _persistVersion ?? 0,
    };
    return JSON.stringify(envelope);
  },
  setItem: async (_name, value) => {
    await ensureMigrated();
    const env = JSON.parse(value) as ZustandEnvelope;
    if (!env?.state) return;
    const stateWithId: Preferences = { ...env.state, id: 'singleton' };
    await putPrefs(stateWithId, { persistVersion: env.version ?? 0 });
  },
  removeItem: async (_name) => {
    await ensureMigrated();
    await db.prefs.delete('singleton');
  },
};
