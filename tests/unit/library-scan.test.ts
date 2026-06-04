import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/epub/import', () => ({
  importEpubFile: vi.fn(),
}));

import {
  fileNameFromPath,
  syncLibraryFromPaths,
  type SyncOutcome,
} from '@/lib/library/folder-sync';
import {
  isTauri,
  pathExists,
  pickFolder,
  readEpubFile,
  scanFolder,
  watchFolder,
} from '@/lib/tauri/library-scan';

describe('library-scan PWA fallback', () => {
  it('isTauri returns false when window has no __TAURI_INTERNALS__', () => {
    expect(isTauri()).toBe(false);
  });

  it('scanFolder returns [] outside Tauri', async () => {
    expect(await scanFolder('/any/path')).toEqual([]);
  });

  it('pathExists returns false outside Tauri', async () => {
    expect(await pathExists('/any/path')).toBe(false);
  });

  it('readEpubFile returns null outside Tauri', async () => {
    expect(await readEpubFile('/any/path')).toBeNull();
  });

  it('pickFolder returns null outside Tauri', async () => {
    expect(await pickFolder()).toBeNull();
  });

  it('watchFolder returns a noop cleanup outside Tauri', async () => {
    const cleanup = await watchFolder('/any', () => {});
    expect(typeof cleanup).toBe('function');
    expect(() => cleanup()).not.toThrow();
  });
});

describe('fileNameFromPath', () => {
  it('extracts file name from Windows path', () => {
    expect(fileNameFromPath('F:\\.BACK - UP\\BIBLIOTECA IMPERIAL\\Dune.epub')).toBe('Dune.epub');
  });

  it('extracts file name from POSIX path', () => {
    expect(fileNameFromPath('/Users/ti/Books/Dune.epub')).toBe('Dune.epub');
  });

  it('returns the input when no separator is present', () => {
    expect(fileNameFromPath('Dune.epub')).toBe('Dune.epub');
  });
});

describe('syncLibraryFromPaths', () => {
  it('returns zero counts for empty path list (drive unavailable)', async () => {
    const importer = vi.fn<(path: string) => Promise<SyncOutcome>>();
    const result = await syncLibraryFromPaths([], importer);
    expect(result).toEqual({ found: 0, imported: 0, duplicates: 0, errors: 0 });
    expect(importer).not.toHaveBeenCalled();
  });

  it('never calls importer when drive is unmounted — existing books preserved', async () => {
    // Spec rule: "Never delete a book from DB because the file is missing from disk".
    // The pure function only iterates over paths returned by scan; if scan returns []
    // (drive unmounted) the function does no work at all, so no delete path exists.
    const importer = vi.fn<(path: string) => Promise<SyncOutcome>>();
    await syncLibraryFromPaths([], importer);
    expect(importer).not.toHaveBeenCalled();
  });

  it('imports each path returned by scan', async () => {
    const importer = vi
      .fn<(path: string) => Promise<SyncOutcome>>()
      .mockResolvedValue('imported');
    const result = await syncLibraryFromPaths(['/a.epub', '/b.epub'], importer);
    expect(result).toEqual({ found: 2, imported: 2, duplicates: 0, errors: 0 });
    expect(importer).toHaveBeenCalledTimes(2);
  });

  it('counts duplicates and errors separately', async () => {
    const importer = vi
      .fn<(path: string) => Promise<SyncOutcome>>()
      .mockResolvedValueOnce('imported')
      .mockResolvedValueOnce('duplicate')
      .mockResolvedValueOnce('error');
    const result = await syncLibraryFromPaths(['/a', '/b', '/c'], importer);
    expect(result).toEqual({ found: 3, imported: 1, duplicates: 1, errors: 1 });
  });
});
