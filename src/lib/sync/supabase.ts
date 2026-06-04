/**
 * Supabase client wrapper — lazy-initialised when sync is enabled and
 * `supabaseUrl` + `supabaseKey` are configured. Never sends `Book.fileBlob`
 * to the remote: only metadata is synced.
 *
 * Conflict resolution is last-write-wins per `updatedAt`.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { db } from '@/lib/db/schema';
import type { Book } from '@/types/book';
import type { Bookmark, Note } from '@/types/note';
import type { Flashcard } from '@/types/flashcard';
import type { Highlight } from '@/types/highlight';
import type { Preferences } from '@/types/prefs';
import type { ReadingPosition } from '@/types/book';
import type { SyncResult } from '@/types/sync';

interface ClientConfig {
  url: string;
  key: string;
}

let client: SupabaseClient | null = null;
let clientKey: string | null = null;

/**
 * Get or create the Supabase client. Returns null when sync is not configured.
 * Re-creates the client when URL/key change.
 */
export const getSupabase = (config: Partial<ClientConfig> | null): SupabaseClient | null => {
  if (!config || !config.url || !config.key) {
    client = null;
    clientKey = null;
    return null;
  }
  const cacheKey = `${config.url}::${config.key}`;
  if (client && clientKey === cacheKey) return client;
  client = createClient(config.url, config.key, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  clientKey = cacheKey;
  return client;
};

/** Apenas para testes — força recriação do cliente. */
export const resetSupabaseClient = (): void => {
  client = null;
  clientKey = null;
};

/** Envia magic link para o email indicado. Devolve mensagem de erro se falhar. */
export const signIn = async (
  cfg: ClientConfig,
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  const sb = getSupabase(cfg);
  if (!sb) return { ok: false, error: 'Cliente Supabase não configurado.' };
  const { error } = await sb.auth.signInWithOtp({ email });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
};

export const signOut = async (cfg: ClientConfig): Promise<void> => {
  const sb = getSupabase(cfg);
  if (!sb) return;
  await sb.auth.signOut();
};

export const getUser = async (
  cfg: ClientConfig,
): Promise<{ id: string; email: string | null } | null> => {
  const sb = getSupabase(cfg);
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  if (!data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
};

/**
 * Last-write-wins por `updatedAt`. Devolve o registo a manter.
 * Empate → fica o local (evita escrita desnecessária).
 */
export const resolveConflicts = <T extends { updatedAt: string }>(local: T, remote: T): T => {
  const lt = new Date(local.updatedAt).getTime();
  const rt = new Date(remote.updatedAt).getTime();
  return rt > lt ? remote : local;
};

/**
 * Strip `fileBlob` and `coverBlob` antes de enviar — só metadata vai para a cloud.
 */
export const stripBookBlobs = (b: Book): Omit<Book, 'fileBlob' | 'coverBlob'> => {
  const { fileBlob: _f, coverBlob: _c, ...meta } = b;
  void _f;
  void _c;
  return meta;
};

interface PushOpts {
  cfg: ClientConfig;
  userId: string;
  /** ISO date — apenas registos com `updatedAt > since` são enviados. */
  since: string;
}

/**
 * Envia mudanças locais ocorridas após `since`. Nunca inclui `fileBlob`.
 * Devolve número de linhas enviadas por tabela.
 */
export const pushChanges = async (opts: PushOpts): Promise<SyncResult> => {
  const sb = getSupabase(opts.cfg);
  const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };
  if (!sb) {
    result.errors.push('Cliente Supabase não configurado.');
    return result;
  }
  const sinceTs = new Date(opts.since).getTime();

  // Highlights
  const highlights = (await db.highlights.toArray()).filter(
    (h) => new Date(h.updatedAt).getTime() > sinceTs,
  );
  if (highlights.length > 0) {
    const rows = highlights.map((h) => ({ ...h, user_id: opts.userId }));
    const { error } = await sb.from('highlights').upsert(rows);
    if (error) result.errors.push(`highlights: ${error.message}`);
    else result.pushed += rows.length;
  }

  // Notes
  const notes = (await db.notes.toArray()).filter(
    (n) => new Date(n.updatedAt).getTime() > sinceTs,
  );
  if (notes.length > 0) {
    const rows = notes.map((n) => ({ ...n, user_id: opts.userId }));
    const { error } = await sb.from('notes').upsert(rows);
    if (error) result.errors.push(`notes: ${error.message}`);
    else result.pushed += rows.length;
  }

  // Bookmarks (sem updatedAt — sync sempre)
  const bookmarks = await db.bookmarks.toArray();
  if (bookmarks.length > 0) {
    const rows = bookmarks.map((b) => ({ ...b, user_id: opts.userId }));
    const { error } = await sb.from('bookmarks').upsert(rows);
    if (error) result.errors.push(`bookmarks: ${error.message}`);
    else result.pushed += rows.length;
  }

  // Flashcards
  const flashcards = await db.flashcards.toArray();
  if (flashcards.length > 0) {
    const rows = flashcards.map((f) => ({ ...f, user_id: opts.userId }));
    const { error } = await sb.from('flashcards').upsert(rows);
    if (error) result.errors.push(`flashcards: ${error.message}`);
    else result.pushed += rows.length;
  }

  // Positions
  const positions = (await db.positions.toArray()).filter(
    (p) => new Date(p.updatedAt).getTime() > sinceTs,
  );
  if (positions.length > 0) {
    const rows = positions.map((p) => ({ ...p, user_id: opts.userId }));
    const { error } = await sb.from('positions').upsert(rows);
    if (error) result.errors.push(`positions: ${error.message}`);
    else result.pushed += rows.length;
  }

  // Books meta — explicitamente sem fileBlob/coverBlob
  const books = await db.books.toArray();
  if (books.length > 0) {
    const rows = books.map((b) => ({ ...stripBookBlobs(b), user_id: opts.userId }));
    const { error } = await sb.from('books_meta').upsert(rows);
    if (error) result.errors.push(`books_meta: ${error.message}`);
    else result.pushed += rows.length;
  }

  // Prefs (singleton)
  const prefs = await db.prefs.get('singleton');
  if (prefs) {
    const { _persistEnvelopeKey: _k, _persistVersion: _v, ...payload } = prefs;
    void _k;
    void _v;
    const { error } = await sb.from('prefs').upsert({ ...payload, user_id: opts.userId });
    if (error) result.errors.push(`prefs: ${error.message}`);
    else result.pushed += 1;
  }

  return result;
};

interface PullOpts {
  cfg: ClientConfig;
  userId: string;
  since: string;
}

/** Recebe mudanças remotas com `updatedAt > since` e aplica conflict resolution. */
export const pullChanges = async (opts: PullOpts): Promise<SyncResult> => {
  const sb = getSupabase(opts.cfg);
  const result: SyncResult = { pushed: 0, pulled: 0, errors: [] };
  if (!sb) {
    result.errors.push('Cliente Supabase não configurado.');
    return result;
  }

  // Highlights
  {
    const { data, error } = await sb
      .from('highlights')
      .select('*')
      .eq('user_id', opts.userId)
      .gt('updatedAt', opts.since);
    if (error) result.errors.push(`highlights: ${error.message}`);
    else if (data) {
      for (const remote of data as Highlight[]) {
        const local = await db.highlights.get(remote.id);
        const winner = local ? resolveConflicts(local, remote) : remote;
        await db.highlights.put(winner);
        result.pulled += 1;
      }
    }
  }

  // Notes
  {
    const { data, error } = await sb
      .from('notes')
      .select('*')
      .eq('user_id', opts.userId)
      .gt('updatedAt', opts.since);
    if (error) result.errors.push(`notes: ${error.message}`);
    else if (data) {
      for (const remote of data as Note[]) {
        const local = await db.notes.get(remote.id);
        const winner = local ? resolveConflicts(local, remote) : remote;
        await db.notes.put(winner);
        result.pulled += 1;
      }
    }
  }

  // Bookmarks
  {
    const { data, error } = await sb.from('bookmarks').select('*').eq('user_id', opts.userId);
    if (error) result.errors.push(`bookmarks: ${error.message}`);
    else if (data) {
      for (const remote of data as Bookmark[]) {
        await db.bookmarks.put(remote);
        result.pulled += 1;
      }
    }
  }

  // Flashcards
  {
    const { data, error } = await sb.from('flashcards').select('*').eq('user_id', opts.userId);
    if (error) result.errors.push(`flashcards: ${error.message}`);
    else if (data) {
      for (const remote of data as Flashcard[]) {
        await db.flashcards.put(remote);
        result.pulled += 1;
      }
    }
  }

  // Positions
  {
    const { data, error } = await sb
      .from('positions')
      .select('*')
      .eq('user_id', opts.userId)
      .gt('updatedAt', opts.since);
    if (error) result.errors.push(`positions: ${error.message}`);
    else if (data) {
      for (const remote of data as ReadingPosition[]) {
        const local = await db.positions.get(remote.bookId);
        const winner = local ? resolveConflicts(local, remote) : remote;
        await db.positions.put(winner);
        result.pulled += 1;
      }
    }
  }

  // Prefs (singleton)
  {
    const { data, error } = await sb
      .from('prefs')
      .select('*')
      .eq('user_id', opts.userId)
      .maybeSingle();
    if (error) result.errors.push(`prefs: ${error.message}`);
    else if (data) {
      const remote = data as Preferences;
      const local = await db.prefs.get('singleton');
      // Local prefs sempre venceriam sem updatedAt — apenas aplicamos se não houver local.
      if (!local) await db.prefs.put({ ...remote, id: 'singleton' });
      result.pulled += 1;
    }
  }

  return result;
};
