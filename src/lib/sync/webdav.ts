/**
 * WebDAV sync — sovereign alternative to Supabase. The user controls the
 * server (Nextcloud, ownCloud, any RFC-4918 implementation).
 *
 * Storage layout under the configured base URL:
 *
 *   cat-epub/highlights.json
 *   cat-epub/notes.json
 *   cat-epub/bookmarks.json
 *   cat-epub/flashcards.json
 *   cat-epub/positions.json
 *   cat-epub/books_meta.json
 *   cat-epub/prefs.json
 *   cat-epub/last-sync.json   ← metadata about the most recent sync
 *
 * Conflict resolution: last-write-wins per `updatedAt`, same as Supabase.
 *
 * `fileBlob` and `coverBlob` are NEVER pushed — only metadata.
 */

import { db } from '@/lib/db/schema';
import type { Book } from '@/types/book';
import type { Note } from '@/types/note';
import type { Bookmark } from '@/types/note';
import type { Flashcard } from '@/types/flashcard';
import type { Highlight } from '@/types/highlight';
import type { Preferences } from '@/types/prefs';
import type { ReadingPosition } from '@/types/book';
import type { SyncResult } from '@/types/sync';

export interface WebDAVCredentials {
  url: string;
  username: string;
  password: string;
}

interface RequestOptions {
  method: string;
  body?: BodyInit;
  headers?: Record<string, string>;
}

const ROOT_DIR = 'cat-epub';

const joinUrl = (base: string, path: string): string => {
  const b = base.endsWith('/') ? base.slice(0, -1) : base;
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${b}${p}`;
};

const authHeader = (cred: WebDAVCredentials): string => {
  const token = btoa(`${cred.username}:${cred.password}`);
  return `Basic ${token}`;
};

export class WebDAVClient {
  private cred: WebDAVCredentials | null = null;
  private fetchImpl: typeof fetch;

  constructor(fetchImpl: typeof fetch = fetch) {
    this.fetchImpl = fetchImpl;
  }

  connect(cred: WebDAVCredentials): void {
    this.cred = cred;
  }

  isConnected(): boolean {
    return this.cred !== null;
  }

  private async request(path: string, options: RequestOptions): Promise<Response> {
    if (this.cred === null) throw new Error('WebDAV client not connected');
    const headers: Record<string, string> = {
      Authorization: authHeader(this.cred),
      ...(options.headers ?? {}),
    };
    const init: RequestInit = {
      method: options.method,
      headers,
    };
    if (options.body !== undefined) init.body = options.body;
    return this.fetchImpl(joinUrl(this.cred.url, path), init);
  }

  async testConnection(): Promise<boolean> {
    if (this.cred === null) return false;
    try {
      // PROPFIND on the configured root is a lightweight reachability check.
      const res = await this.request('/', {
        method: 'PROPFIND',
        headers: { Depth: '0' },
      });
      // 200 OK or 207 Multi-Status both signal a working endpoint with
      // a valid auth header; anything else (401, 403, 404, 5xx) means no.
      return res.status === 200 || res.status === 207;
    } catch {
      return false;
    }
  }

  async ensureRoot(): Promise<void> {
    // MKCOL is idempotent-ish: 405 (Method Not Allowed) usually means the
    // collection already exists, which is fine.
    const res = await this.request(`/${ROOT_DIR}`, { method: 'MKCOL' });
    if (res.status >= 400 && res.status !== 405 && res.status !== 301) {
      // 301 happens on some servers when the dir exists and PROPFIND would
      // be the correct verb — we treat it as "exists".
      throw new Error(`MKCOL failed: ${res.status} ${res.statusText}`);
    }
  }

  async push(path: string, data: string): Promise<void> {
    const res = await this.request(`/${ROOT_DIR}/${path}`, {
      method: 'PUT',
      body: data,
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status} ${res.statusText}`);
  }

  async pull(path: string): Promise<string | null> {
    const res = await this.request(`/${ROOT_DIR}/${path}`, { method: 'GET' });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status} ${res.statusText}`);
    return res.text();
  }

  /**
   * Returns the names (relative to `cat-epub/`) of all files at the root via
   * PROPFIND Depth: 1. The list is best-effort: callers should not assume any
   * particular ordering and must tolerate missing items.
   */
  async list(): Promise<string[]> {
    const res = await this.request(`/${ROOT_DIR}/`, {
      method: 'PROPFIND',
      headers: { Depth: '1' },
    });
    if (!res.ok && res.status !== 207) {
      throw new Error(`PROPFIND failed: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    const matches = [...text.matchAll(/<d:href>([^<]+)<\/d:href>/gi)];
    return matches
      .map((m) => decodeURIComponent(m[1] ?? ''))
      .map((href) => href.replace(/\/$/, ''))
      .map((href) => {
        const idx = href.lastIndexOf('/');
        return idx >= 0 ? href.slice(idx + 1) : href;
      })
      .filter((name) => name.length > 0 && name !== ROOT_DIR);
  }
}

// ─── Sync orchestration ───────────────────────────────────────────────────

/**
 * Strip blobs from a book before serialising. We never want fileBlob or
 * coverBlob to hit the wire.
 */
export const stripBookBlobs = (b: Book): Omit<Book, 'fileBlob' | 'coverBlob'> => {
  const { fileBlob: _f, coverBlob: _c, ...rest } = b;
  void _f;
  void _c;
  return rest;
};

export const resolveConflicts = <T extends { updatedAt: string }>(local: T, remote: T): T => {
  const lt = new Date(local.updatedAt).getTime();
  const rt = new Date(remote.updatedAt).getTime();
  return rt > lt ? remote : local;
};

interface FilePayload<T> {
  schemaVersion: 1;
  rows: T[];
}

const wrap = <T>(rows: T[]): FilePayload<T> => ({ schemaVersion: 1, rows });

const unwrap = <T>(text: string | null): T[] => {
  if (text === null) return [];
  try {
    const data = JSON.parse(text) as Partial<FilePayload<T>>;
    return Array.isArray(data.rows) ? (data.rows as T[]) : [];
  } catch {
    return [];
  }
};

export interface PushOpts {
  client: WebDAVClient;
  /** ISO timestamp — only records with updatedAt > since are sent. */
  since: string;
}

/**
 * Push local changes since `since`. Books are stripped of fileBlob/coverBlob.
 * Returns counts and any errors.
 */
export const pushChanges = async (opts: PushOpts): Promise<SyncResult> => {
  const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };
  const sinceTs = new Date(opts.since).getTime();

  try {
    await opts.client.ensureRoot();
  } catch (err) {
    result.errors.push(`ensureRoot: ${err instanceof Error ? err.message : String(err)}`);
    return result;
  }

  const push = async <T extends { updatedAt: string }>(
    path: string,
    rows: T[],
  ): Promise<void> => {
    const filtered = rows.filter((r) => new Date(r.updatedAt).getTime() > sinceTs);
    if (filtered.length === 0) return;
    await opts.client.push(path, JSON.stringify(wrap(filtered)));
    result.pushed += filtered.length;
  };

  try {
    await push('highlights.json', await db.highlights.toArray());
    await push('notes.json', await db.notes.toArray());

    const bookmarks = await db.bookmarks.toArray();
    if (bookmarks.length > 0) {
      await opts.client.push('bookmarks.json', JSON.stringify(wrap(bookmarks)));
      result.pushed += bookmarks.length;
    }

    const flashcards = await db.flashcards.toArray();
    if (flashcards.length > 0) {
      await opts.client.push('flashcards.json', JSON.stringify(wrap(flashcards)));
      result.pushed += flashcards.length;
    }

    await push('positions.json', await db.positions.toArray());

    const books = await db.books.toArray();
    if (books.length > 0) {
      const stripped = books.map(stripBookBlobs);
      await opts.client.push('books_meta.json', JSON.stringify(wrap(stripped)));
      result.pushed += stripped.length;
    }

    const prefs = await db.prefs.get('singleton');
    if (prefs !== undefined) {
      const { _persistEnvelopeKey: _k, _persistVersion: _v, ...payload } = prefs;
      void _k;
      void _v;
      await opts.client.push('prefs.json', JSON.stringify(payload));
      result.pushed += 1;
    }

    await opts.client.push('last-sync.json', JSON.stringify({ at: new Date().toISOString() }));
  } catch (err) {
    result.errors.push(err instanceof Error ? err.message : String(err));
  }

  return result;
};

export interface PullOpts {
  client: WebDAVClient;
}

/** Pull remote files and merge via resolveConflicts. */
export const pullChanges = async (opts: PullOpts): Promise<SyncResult> => {
  const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };

  const pullList = async <T extends { id?: string; updatedAt: string }>(
    path: string,
    table: { get: (k: string) => Promise<T | undefined>; put: (v: T) => Promise<unknown> },
  ): Promise<void> => {
    try {
      const text = await opts.client.pull(path);
      const rows = unwrap<T>(text);
      for (const remote of rows) {
        if (remote.id === undefined) continue;
        const local = await table.get(remote.id);
        const winner = local !== undefined ? resolveConflicts(local, remote) : remote;
        await table.put(winner);
        result.pulled += 1;
      }
    } catch (err) {
      result.errors.push(`${path}: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  await pullList<Highlight>('highlights.json', db.highlights);
  await pullList<Note>('notes.json', db.notes);

  // Flashcards: FSRS keeps state — last_review timestamp is the truth signal.
  try {
    const text = await opts.client.pull('flashcards.json');
    const rows = unwrap<Flashcard>(text);
    for (const remote of rows) {
      const local = await db.flashcards.get(remote.id);
      if (local === undefined) {
        await db.flashcards.put(remote);
      } else {
        const lt = new Date(local.last_review ?? '1970-01-01').getTime();
        const rt = new Date(remote.last_review ?? '1970-01-01').getTime();
        await db.flashcards.put(rt > lt ? remote : local);
      }
      result.pulled += 1;
    }
  } catch (err) {
    result.errors.push(`flashcards: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Bookmarks have no updatedAt — last-wins by id is enough.
  try {
    const text = await opts.client.pull('bookmarks.json');
    const rows = unwrap<Bookmark>(text);
    for (const remote of rows) {
      await db.bookmarks.put(remote);
      result.pulled += 1;
    }
  } catch (err) {
    result.errors.push(`bookmarks: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Positions keyed by bookId, not id.
  try {
    const text = await opts.client.pull('positions.json');
    const rows = unwrap<ReadingPosition>(text);
    for (const remote of rows) {
      const local = await db.positions.get(remote.bookId);
      const winner = local !== undefined ? resolveConflicts(local, remote) : remote;
      await db.positions.put(winner);
      result.pulled += 1;
    }
  } catch (err) {
    result.errors.push(`positions: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Books — metadata only. Local fileBlob/coverBlob preserved.
  try {
    const text = await opts.client.pull('books_meta.json');
    const rows = unwrap<Omit<Book, 'fileBlob' | 'coverBlob'>>(text);
    for (const remote of rows) {
      const local = await db.books.get(remote.id);
      if (local === undefined) continue;
      const winner = resolveConflicts(
        { ...local, updatedAt: local.lastReadAt ?? local.addedAt },
        { ...local, ...remote, updatedAt: remote.lastReadAt ?? remote.addedAt },
      );
      await db.books.put(winner);
      result.pulled += 1;
    }
  } catch (err) {
    result.errors.push(`books_meta: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Prefs — single object, not list. Local prefs win unless none exist.
  try {
    const text = await opts.client.pull('prefs.json');
    if (text !== null) {
      const remote = JSON.parse(text) as Preferences;
      const local = await db.prefs.get('singleton');
      if (local === undefined) {
        await db.prefs.put({ ...remote, id: 'singleton' });
        result.pulled += 1;
      }
    }
  } catch (err) {
    result.errors.push(`prefs: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
};
