import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db/schema';
import {
  WebDAVClient,
  pullChanges,
  pushChanges,
  resolveConflicts,
  stripBookBlobs,
} from '@/lib/sync/webdav';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';

interface FetchCall {
  url: string;
  init: RequestInit;
}

const makeFetchMock = (
  responder: (call: FetchCall) => Partial<{
    status: number;
    statusText: string;
    body: string;
  }>,
): { fn: typeof fetch; calls: FetchCall[] } => {
  const calls: FetchCall[] = [];
  const fn = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === 'string' ? input : input.toString();
    const call: FetchCall = { url, init };
    calls.push(call);
    const r = responder(call);
    const status = r.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: r.statusText ?? '',
      text: async () => r.body ?? '',
      arrayBuffer: async () => new TextEncoder().encode(r.body ?? '').buffer,
    } as Response;
  }) as unknown as typeof fetch;
  return { fn, calls };
};

const CRED = {
  url: 'https://cloud.example/remote.php/dav/files/user',
  username: 'kouran',
  password: 'super-secret',
};

const makeHighlight = (id: string, updatedAt: string): Highlight => ({
  id,
  bookId: 'b-1',
  cfiRange: 'cfi-x',
  text: 'texto',
  color: 'yellow',
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt,
});

const makeBook = (id: string): Book => ({
  id,
  title: 'T',
  author: 'A',
  fileBlob: new Blob(['LARGE-EPUB']),
  fileSize: 9,
  fileHash: 'abc',
  coverHue: 0,
  spineLength: 1,
  tags: [],
  addedAt: '2026-01-01T00:00:00.000Z',
});

beforeEach(async () => {
  await db.highlights.clear();
  await db.notes.clear();
  await db.bookmarks.clear();
  await db.flashcards.clear();
  await db.positions.clear();
  await db.books.clear();
  await db.prefs.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('stripBookBlobs', () => {
  it('removes fileBlob and coverBlob — only metadata survives', () => {
    const b = makeBook('b-1');
    b.coverBlob = new Blob(['png']);
    const stripped = stripBookBlobs(b);
    expect(stripped).not.toHaveProperty('fileBlob');
    expect(stripped).not.toHaveProperty('coverBlob');
    expect(stripped.id).toBe('b-1');
  });
});

describe('resolveConflicts', () => {
  it('newer updatedAt wins', () => {
    const local = makeHighlight('h', '2026-01-01T00:00:00.000Z');
    const remote = makeHighlight('h', '2026-05-01T00:00:00.000Z');
    expect(resolveConflicts(local, remote)).toBe(remote);
  });

  it('tie → local stays', () => {
    const ts = '2026-01-01T00:00:00.000Z';
    expect(resolveConflicts(makeHighlight('h', ts), makeHighlight('h', ts)).updatedAt).toBe(ts);
  });
});

describe('WebDAVClient', () => {
  it('connect + testConnection issues PROPFIND with Basic auth', async () => {
    const { fn, calls } = makeFetchMock(() => ({ status: 207 }));
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    const ok = await client.testConnection();

    expect(ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0]!.init.method).toBe('PROPFIND');
    const auth = (calls[0]!.init.headers as Record<string, string>).Authorization;
    expect(auth).toMatch(/^Basic /);
    expect(atob(auth.slice('Basic '.length))).toBe(`${CRED.username}:${CRED.password}`);
  });

  it('testConnection returns false on 401', async () => {
    const { fn } = makeFetchMock(() => ({ status: 401 }));
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    expect(await client.testConnection()).toBe(false);
  });

  it('push PUTs JSON body to cat-epub/{path}', async () => {
    const { fn, calls } = makeFetchMock(() => ({ status: 201 }));
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    await client.push('highlights.json', '{"rows":[]}');

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe(`${CRED.url}/cat-epub/highlights.json`);
    expect(calls[0]!.init.method).toBe('PUT');
    expect(calls[0]!.init.body).toBe('{"rows":[]}');
  });

  it('pull returns null on 404', async () => {
    const { fn } = makeFetchMock(() => ({ status: 404 }));
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    expect(await client.pull('missing.json')).toBeNull();
  });

  it('list parses <d:href> entries from PROPFIND', async () => {
    const body = `<?xml version="1.0"?>
      <d:multistatus xmlns:d="DAV:">
        <d:response><d:href>/cat-epub/</d:href></d:response>
        <d:response><d:href>/cat-epub/highlights.json</d:href></d:response>
        <d:response><d:href>/cat-epub/notes.json</d:href></d:response>
      </d:multistatus>`;
    const { fn } = makeFetchMock(() => ({ status: 207, body }));
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    const items = await client.list();
    expect(items.sort()).toEqual(['highlights.json', 'notes.json']);
  });
});

describe('pushChanges — never includes fileBlob/coverBlob', () => {
  it('books_meta.json payload has no blobs', async () => {
    const b = makeBook('b-1');
    b.coverBlob = new Blob(['cover']);
    await db.books.add(b);

    const bodies: string[] = [];
    const { fn } = makeFetchMock((call) => {
      if (call.init.method === 'PUT' && call.url.includes('books_meta.json')) {
        bodies.push(call.init.body as string);
      }
      return { status: 201 };
    });
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    const result = await pushChanges({ client, since: '1970-01-01T00:00:00.000Z' });

    expect(result.errors).toEqual([]);
    expect(bodies).toHaveLength(1);
    expect(bodies[0]).not.toContain('LARGE-EPUB');
    expect(bodies[0]).not.toContain('"fileBlob"');
    expect(bodies[0]).not.toContain('"coverBlob"');
  });

  it('only pushes highlights with updatedAt > since', async () => {
    await db.highlights.add(makeHighlight('h-old', '2026-01-01T00:00:00.000Z'));
    await db.highlights.add(makeHighlight('h-new', '2026-05-01T00:00:00.000Z'));

    const bodies: string[] = [];
    const { fn } = makeFetchMock((call) => {
      if (call.init.method === 'PUT' && call.url.includes('highlights.json')) {
        bodies.push(call.init.body as string);
      }
      return { status: 201 };
    });
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    await pushChanges({ client, since: '2026-04-01T00:00:00.000Z' });

    expect(bodies).toHaveLength(1);
    expect(bodies[0]).toContain('h-new');
    expect(bodies[0]).not.toContain('h-old');
  });

  it('MKCOL collection error propagates as result.errors', async () => {
    const { fn } = makeFetchMock((call) => {
      if (call.init.method === 'MKCOL') return { status: 500, statusText: 'Internal' };
      return { status: 201 };
    });
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    const result = await pushChanges({ client, since: '1970-01-01T00:00:00.000Z' });

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('ensureRoot');
  });
});

describe('pullChanges — conflict resolution', () => {
  it('older remote loses; local row stays', async () => {
    const local = makeHighlight('h-1', '2026-05-01T10:00:00.000Z');
    const remote = makeHighlight('h-1', '2026-01-01T10:00:00.000Z');
    await db.highlights.add(local);

    const { fn } = makeFetchMock((call) => {
      if (call.url.endsWith('highlights.json') && call.init.method === 'GET') {
        return { status: 200, body: JSON.stringify({ schemaVersion: 1, rows: [remote] }) };
      }
      return { status: 404 };
    });
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    await pullChanges({ client });

    const after = await db.highlights.get('h-1');
    expect(after?.updatedAt).toBe(local.updatedAt);
  });

  it('newer remote wins', async () => {
    await db.highlights.add(makeHighlight('h-1', '2026-01-01T10:00:00.000Z'));
    const remote = makeHighlight('h-1', '2026-05-01T10:00:00.000Z');

    const { fn } = makeFetchMock((call) => {
      if (call.url.endsWith('highlights.json') && call.init.method === 'GET') {
        return { status: 200, body: JSON.stringify({ schemaVersion: 1, rows: [remote] }) };
      }
      return { status: 404 };
    });
    const client = new WebDAVClient(fn);
    client.connect(CRED);
    await pullChanges({ client });

    const after = await db.highlights.get('h-1');
    expect(after?.updatedAt).toBe(remote.updatedAt);
  });
});
