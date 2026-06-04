import type { Preferences } from '@/types/prefs';
import { db, type PreferencesRow } from './schema';

const SINGLETON = 'singleton' as const;

/** Lê a linha singleton sem os campos internos `_persist*`. */
export const getPrefs = async (): Promise<Preferences | undefined> => {
  const row = await db.prefs.get(SINGLETON);
  if (!row) return undefined;
  return stripInternal(row);
};

/** Substitui completamente as preferências persistidas. */
export const putPrefs = async (
  prefs: Preferences,
  meta?: { persistVersion?: number },
): Promise<void> => {
  const row: PreferencesRow = { ...prefs, id: SINGLETON };
  if (meta?.persistVersion !== undefined) row._persistVersion = meta.persistVersion;
  await db.prefs.put(row);
};

/** Lê a versão guardada pelo middleware persist do Zustand (se existir). */
export const getPrefsPersistVersion = async (): Promise<number | undefined> => {
  const row = await db.prefs.get(SINGLETON);
  return row?._persistVersion;
};

const stripInternal = (row: PreferencesRow): Preferences => {
  const clone: Record<string, unknown> = { ...row };
  delete clone['_persistVersion'];
  delete clone['_persistEnvelopeKey'];
  return clone as unknown as Preferences;
};
