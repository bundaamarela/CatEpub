import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { importEpubFile } from '@/lib/epub/import';
import { BOOK_QUERY_KEYS } from '@/lib/store/library';
import {
  isTauri,
  pathExists,
  readEpubFile,
  scanFolder,
  watchFolder,
} from '@/lib/tauri/library-scan';

export type SyncOutcome = 'imported' | 'duplicate' | 'error';

export interface SyncSummary {
  found: number;
  imported: number;
  duplicates: number;
  errors: number;
}

export interface FolderSyncStatus {
  scanning: boolean;
  lastSyncAt?: string;
  found: number;
  imported: number;
  driveAvailable: boolean;
}

export interface UseFolderSyncResult extends FolderSyncStatus {
  scanNow: () => Promise<void>;
}

export const fileNameFromPath = (path: string): string => {
  const i = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return i >= 0 ? path.slice(i + 1) : path;
};

export const importFromPath = async (path: string): Promise<SyncOutcome> => {
  const bytes = await readEpubFile(path);
  if (bytes === null) return 'error';
  const name = fileNameFromPath(path);
  const file = new File([bytes], name, { type: 'application/epub+zip' });
  const result = await importEpubFile(file);
  return result.status === 'imported'
    ? 'imported'
    : result.status === 'duplicate'
      ? 'duplicate'
      : 'error';
};

/**
 * Imports each path that is not yet in the DB. Returns counts.
 * Never deletes books — caller passes only what was found on disk.
 */
export const syncLibraryFromPaths = async (
  paths: string[],
  importer: (path: string) => Promise<SyncOutcome> = importFromPath,
): Promise<SyncSummary> => {
  let imported = 0;
  let duplicates = 0;
  let errors = 0;
  for (const path of paths) {
    const result = await importer(path);
    if (result === 'imported') imported++;
    else if (result === 'duplicate') duplicates++;
    else errors++;
  }
  return { found: paths.length, imported, duplicates, errors };
};

export const useFolderSync = (libraryFolder: string | undefined): UseFolderSyncResult => {
  const qc = useQueryClient();
  const [status, setStatus] = useState<FolderSyncStatus>({
    scanning: false,
    found: 0,
    imported: 0,
    driveAvailable: true,
  });

  const scanNow = useCallback(async (): Promise<void> => {
    if (libraryFolder === undefined || libraryFolder.length === 0 || !isTauri()) return;
    setStatus((s) => ({ ...s, scanning: true }));

    const [paths, exists] = await Promise.all([
      scanFolder(libraryFolder),
      pathExists(libraryFolder),
    ]);
    const summary = await syncLibraryFromPaths(paths);

    setStatus({
      scanning: false,
      lastSyncAt: new Date().toISOString(),
      found: paths.length,
      imported: summary.imported,
      driveAvailable: exists,
    });

    if (summary.imported > 0) {
      await qc.invalidateQueries({ queryKey: BOOK_QUERY_KEYS.all });
    }
  }, [libraryFolder, qc]);

  useEffect(() => {
    if (libraryFolder === undefined || libraryFolder.length === 0 || !isTauri()) return;

    const t = setTimeout(() => {
      void scanNow();
    }, 0);

    let cleanup: (() => void) | null = null;
    void (async () => {
      cleanup = await watchFolder(libraryFolder, (ev) => {
        if (ev.kind === 'added') {
          void importFromPath(ev.path).then((result) => {
            if (result === 'imported') {
              setStatus((s) => ({ ...s, imported: s.imported + 1, found: s.found + 1 }));
              void qc.invalidateQueries({ queryKey: BOOK_QUERY_KEYS.all });
            }
          });
        }
      });
    })();

    return () => {
      clearTimeout(t);
      cleanup?.();
    };
  }, [libraryFolder, qc, scanNow]);

  return { ...status, scanNow };
};
