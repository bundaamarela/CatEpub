/**
 * Testes para a camada de sync (Phase 12).
 *
 * Mockamos `@supabase/supabase-js` para evitar dependências de rede e
 * verificar o contrato dos pushes/pulls — em particular, garantir que
 * `Book.fileBlob` nunca sai do dispositivo.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/schema';

// ── Mock @supabase/supabase-js ───────────────────────────────────────────────
const upsertSpy = vi.fn(async (_rows: unknown) => ({ error: null }));
const selectSpy = vi.fn();
const deleteEqEqSpy = vi.fn(async () => ({ error: null }));

const fromSpy = vi.fn((_table: string) => {
  const builder: Record<string, unknown> = {};
  builder.upsert = (rows: unknown) => upsertSpy(rows);
  builder.select = () => ({
    eq: () => ({
      gt: async () => ({ data: [], error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
    }),
  });
  void selectSpy;
  builder.delete = () => ({
    eq: () => ({
      eq: deleteEqEqSpy,
    }),
  });
  return builder;
});

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithOtp: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
      getUser: vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'a@b.pt' } } })),
    },
    from: fromSpy,
  })),
}));

import {
  pushChanges,
  resolveConflicts,
  resetSupabaseClient,
  stripBookBlobs,
} from '@/lib/sync/supabase';
import { clearQueue, drainQueue, enqueue, queueSize } from '@/lib/sync/queue';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';

const cfg = { url: 'https://x.supabase.co', key: 'anon-key' };

const makeBook = (id: string): Book => ({
  id,
  title: 'T',
  author: 'A',
  fileBlob: new Blob(['LARGE-EPUB-CONTENT'], { type: 'application/epub+zip' }),
  fileSize: 17,
  fileHash: 'abc',
  coverHue: 200,
  spineLength: 5,
  tags: [],
  addedAt: new Date('2026-01-01').toISOString(),
});

const makeHighlight = (id: string, updatedAt: string): Highlight => ({
  id,
  bookId: 'book-1',
  cfiRange: 'cfi-x',
  text: 'lorem',
  color: 'yellow',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt,
});

beforeEach(async () => {
  await db.highlights.clear();
  await db.notes.clear();
  await db.bookmarks.clear();
  await db.flashcards.clear();
  await db.positions.clear();
  await db.books.clear();
  await db.prefs.clear();
  await clearQueue();
  upsertSpy.mockClear();
  fromSpy.mockClear();
  resetSupabaseClient();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('resolveConflicts', () => {
  it('local vence quando updatedAt local é mais recente', () => {
    const local = makeHighlight('h1', '2026-05-02T10:00:00.000Z');
    const remote = makeHighlight('h1', '2026-05-01T10:00:00.000Z');
    expect(resolveConflicts(local, remote)).toBe(local);
  });

  it('remote vence quando updatedAt remoto é mais recente', () => {
    const local = makeHighlight('h1', '2026-05-01T10:00:00.000Z');
    const remote = makeHighlight('h1', '2026-05-02T10:00:00.000Z');
    expect(resolveConflicts(local, remote)).toBe(remote);
  });

  it('em empate, mantém o local (evita escrita desnecessária)', () => {
    const ts = '2026-05-01T10:00:00.000Z';
    const local = makeHighlight('h1', ts);
    const remote = makeHighlight('h1', ts);
    expect(resolveConflicts(local, remote)).toBe(local);
  });
});

describe('stripBookBlobs', () => {
  it('remove fileBlob e coverBlob da metadata', () => {
    const b = makeBook('b1');
    b.coverBlob = new Blob(['png-data']);
    const stripped = stripBookBlobs(b);
    expect(stripped).not.toHaveProperty('fileBlob');
    expect(stripped).not.toHaveProperty('coverBlob');
    expect(stripped.id).toBe('b1');
    expect(stripped.title).toBe('T');
  });
});

describe('pushChanges', () => {
  it('nunca inclui fileBlob nem coverBlob no payload de books_meta', async () => {
    const b = makeBook('b1');
    b.coverBlob = new Blob(['cover']);
    await db.books.add(b);

    const result = await pushChanges({ cfg, userId: 'user-1', since: '1970-01-01T00:00:00.000Z' });
    expect(result.errors).toEqual([]);

    // Encontra a chamada feita à tabela books_meta.
    const tableCalls = fromSpy.mock.calls.map((c) => c[0]);
    expect(tableCalls).toContain('books_meta');

    // O upsertSpy foi invocado com rows — verifica que nenhuma row contém os blobs.
    const allRows = upsertSpy.mock.calls.flatMap(([rows]) =>
      Array.isArray(rows) ? rows : [rows],
    );
    const bookRow = allRows.find(
      (r): r is Record<string, unknown> =>
        typeof r === 'object' && r !== null && (r as Record<string, unknown>).id === 'b1',
    );
    expect(bookRow).toBeDefined();
    expect(bookRow).not.toHaveProperty('fileBlob');
    expect(bookRow).not.toHaveProperty('coverBlob');
  });

  it('apenas envia highlights com updatedAt > since', async () => {
    await db.highlights.add(makeHighlight('h-old', '2026-01-01T10:00:00.000Z'));
    await db.highlights.add(makeHighlight('h-new', '2026-05-01T10:00:00.000Z'));

    const result = await pushChanges({
      cfg,
      userId: 'user-1',
      since: '2026-04-01T00:00:00.000Z',
    });
    expect(result.errors).toEqual([]);

    const allRows = upsertSpy.mock.calls.flatMap(([rows]) =>
      Array.isArray(rows) ? rows : [rows],
    );
    const highlightRows = allRows.filter(
      (r): r is Record<string, unknown> =>
        typeof r === 'object' &&
        r !== null &&
        (r as Record<string, unknown>).cfiRange !== undefined,
    );
    expect(highlightRows.map((r) => r.id)).toEqual(['h-new']);
  });

  it('anexa user_id a cada linha enviada', async () => {
    await db.highlights.add(makeHighlight('h1', '2026-05-01T10:00:00.000Z'));
    await pushChanges({ cfg, userId: 'user-1', since: '1970-01-01T00:00:00.000Z' });

    const allRows = upsertSpy.mock.calls.flatMap(([rows]) =>
      Array.isArray(rows) ? rows : [rows],
    );
    for (const row of allRows) {
      expect(row).toHaveProperty('user_id', 'user-1');
    }
  });
});

describe('offline queue', () => {
  it('cresce quando há mudanças offline', async () => {
    expect(await queueSize()).toBe(0);
    await enqueue({
      table: 'highlights',
      recordId: 'h1',
      operation: 'upsert',
      payload: makeHighlight('h1', '2026-05-01T10:00:00.000Z'),
    });
    await enqueue({
      table: 'notes',
      recordId: 'n1',
      operation: 'upsert',
      payload: { id: 'n1', body: 'x' },
    });
    expect(await queueSize()).toBe(2);
  });

  it('drena quando online (drainQueue) e remove itens enviados', async () => {
    await enqueue({
      table: 'highlights',
      recordId: 'h1',
      operation: 'upsert',
      payload: makeHighlight('h1', '2026-05-01T10:00:00.000Z'),
    });
    await enqueue({
      table: 'notes',
      recordId: 'n1',
      operation: 'delete',
      payload: null,
    });

    // Cliente fictício com a mesma forma usada por drainQueue.
    const fakeClient = {
      from: fromSpy,
    } as unknown as SupabaseClient;

    const result = await drainQueue({ client: fakeClient, userId: 'user-1' });
    expect(result.drained).toBe(2);
    expect(result.remaining).toBe(0);
    expect(await queueSize()).toBe(0);
  });

  it('mantém itens na fila se a operação falhar', async () => {
    await enqueue({
      table: 'highlights',
      recordId: 'h1',
      operation: 'upsert',
      payload: makeHighlight('h1', '2026-05-01T10:00:00.000Z'),
    });
    upsertSpy.mockResolvedValueOnce({ error: { message: 'network down' } });

    const fakeClient = {
      from: fromSpy,
    } as unknown as SupabaseClient;

    const result = await drainQueue({ client: fakeClient, userId: 'user-1' });
    expect(result.drained).toBe(0);
    expect(result.remaining).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(await queueSize()).toBe(1);
  });
});
