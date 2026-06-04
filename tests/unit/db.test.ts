import { beforeEach, describe, expect, it } from 'vitest';
import { ulid } from 'ulid';

import * as books from '@/lib/db/books';
import * as highlights from '@/lib/db/highlights';
import * as notes from '@/lib/db/notes';
import * as bookmarks from '@/lib/db/bookmarks';
import * as flashcards from '@/lib/db/flashcards';
import * as sessions from '@/lib/db/sessions';
import * as positions from '@/lib/db/positions';
import { getPrefs, putPrefs, getPrefsPersistVersion } from '@/lib/db/prefs';
import { db } from '@/lib/db/schema';
import { DEFAULT_PREFERENCES } from '@/lib/store/prefs';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import type { Note, Bookmark } from '@/types/note';
import type { Flashcard, ReadingSession } from '@/types/flashcard';

const isoOffset = (offsetMinutes: number): string =>
  new Date(Date.now() + offsetMinutes * 60_000).toISOString();

const makeBook = (overrides: Partial<Book> = {}): Book => ({
  id: ulid(),
  title: 'Livro de Teste',
  author: 'Autor',
  fileBlob: new Blob(['hello'], { type: 'application/epub+zip' }),
  fileSize: 5,
  fileHash: 'hash-' + Math.random().toString(36).slice(2),
  coverHue: 100,
  spineLength: 1,
  tags: [],
  addedAt: new Date().toISOString(),
  ...overrides,
});

const makeHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  id: ulid(),
  bookId: 'book-1',
  cfiRange: 'epubcfi(/6/4!/4/2)',
  text: 'um excerto qualquer',
  color: 'yellow',
  tags: [],
  createdAt: isoOffset(0),
  updatedAt: isoOffset(0),
  ...overrides,
});

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: ulid(),
  bookId: 'book-1',
  body: 'corpo da nota',
  tags: [],
  createdAt: isoOffset(0),
  updatedAt: isoOffset(0),
  ...overrides,
});

const makeBookmark = (overrides: Partial<Bookmark> = {}): Bookmark => ({
  id: ulid(),
  bookId: 'book-1',
  cfi: 'epubcfi(/6/4!/4/2)',
  createdAt: isoOffset(0),
  ...overrides,
});

const makeFlashcard = (overrides: Partial<Flashcard> = {}): Flashcard => ({
  id: ulid(),
  bookId: 'book-1',
  front: 'pergunta',
  back: 'resposta',
  due: isoOffset(0),
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  reps: 0,
  lapses: 0,
  state: 'new',
  ...overrides,
});

const makeSession = (overrides: Partial<ReadingSession> = {}): ReadingSession => ({
  id: ulid(),
  bookId: 'book-1',
  startCfi: 'epubcfi(/6/4!/4/2)',
  startedAt: isoOffset(0),
  pagesRead: 0,
  ...overrides,
});

beforeEach(async () => {
  // Limpa todas as tabelas antes de cada teste.
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
});

describe('books repository', () => {
  it('add + getById', async () => {
    const b = makeBook({ title: 'Os Maias' });
    const id = await books.add(b);
    const got = await books.getById(id);
    expect(got?.title).toBe('Os Maias');
  });

  it('getAll devolve por ordem de inserção (sem ordenação)', async () => {
    await books.add(makeBook({ title: 'A' }));
    await books.add(makeBook({ title: 'B' }));
    await books.add(makeBook({ title: 'C' }));
    expect((await books.getAll()).length).toBe(3);
  });

  it('getByHash devolve o livro com fileHash correspondente', async () => {
    const b = makeBook({ fileHash: 'abc123' });
    await books.add(b);
    const got = await books.getByHash('abc123');
    expect(got?.id).toBe(b.id);
    expect(await books.getByHash('inexistente')).toBeUndefined();
  });

  it('update aplica patch', async () => {
    const b = makeBook({ rating: undefined });
    await books.add(b);
    await books.update(b.id, { rating: 5 });
    const updated = await books.getById(b.id);
    expect(updated?.rating).toBe(5);
  });

  it('remove apaga o livro e dados associados', async () => {
    const b = makeBook({ id: 'book-A' });
    await books.add(b);
    await highlights.add(makeHighlight({ bookId: 'book-A' }));
    await notes.add(makeNote({ bookId: 'book-A' }));
    await bookmarks.add(makeBookmark({ bookId: 'book-A' }));
    await sessions.add(makeSession({ bookId: 'book-A' }));
    await flashcards.add(makeFlashcard({ bookId: 'book-A' }));
    await positions.upsert({
      bookId: 'book-A',
      cfi: 'x',
      chapterIndex: 0,
      percentage: 10,
      updatedAt: isoOffset(0),
    });

    await books.remove('book-A');

    expect(await books.getById('book-A')).toBeUndefined();
    expect((await highlights.getByBook('book-A')).length).toBe(0);
    expect((await notes.getByBook('book-A')).length).toBe(0);
    expect((await bookmarks.getByBook('book-A')).length).toBe(0);
    expect((await sessions.getByBook('book-A')).length).toBe(0);
    expect((await flashcards.getByBook('book-A')).length).toBe(0);
    expect(await positions.getById('book-A')).toBeUndefined();
  });

  it('query: ordena por title asc', async () => {
    await books.add(makeBook({ title: 'Cebola' }));
    await books.add(makeBook({ title: 'Abóbora' }));
    await books.add(makeBook({ title: 'Beterraba' }));
    const result = await books.query({ sort: 'title', order: 'asc' });
    expect(result.map((b) => b.title)).toEqual(['Abóbora', 'Beterraba', 'Cebola']);
  });

  it('query: filtra por tag', async () => {
    await books.add(makeBook({ title: 'A', tags: ['ficção'] }));
    await books.add(makeBook({ title: 'B', tags: ['ensaio'] }));
    await books.add(makeBook({ title: 'C', tags: ['ficção', 'clássico'] }));
    const result = await books.query({ tag: 'ficção' });
    expect(result.map((b) => b.title).sort()).toEqual(['A', 'C']);
  });

  it('query: onlyOpened filtra por lastReadAt', async () => {
    await books.add(makeBook({ title: 'A', lastReadAt: isoOffset(-60) }));
    await books.add(makeBook({ title: 'B' }));
    const result = await books.query({ onlyOpened: true });
    expect(result.length).toBe(1);
    expect(result[0]?.title).toBe('A');
  });

  it('count', async () => {
    expect(await books.count()).toBe(0);
    await books.add(makeBook());
    await books.add(makeBook());
    expect(await books.count()).toBe(2);
  });
});

describe('highlights repository', () => {
  it('add + getByBook + update + remove', async () => {
    const h = makeHighlight({ bookId: 'b1', color: 'yellow' });
    await highlights.add(h);
    expect((await highlights.getByBook('b1')).length).toBe(1);
    await highlights.update(h.id, { color: 'green' });
    const got = await highlights.getById(h.id);
    expect(got?.color).toBe('green');
    await highlights.remove(h.id);
    expect(await highlights.getById(h.id)).toBeUndefined();
  });

  it('query: filtra por color', async () => {
    await highlights.add(makeHighlight({ bookId: 'b', color: 'yellow' }));
    await highlights.add(makeHighlight({ bookId: 'b', color: 'green' }));
    await highlights.add(makeHighlight({ bookId: 'b', color: 'yellow' }));
    const result = await highlights.query({ bookId: 'b', color: 'yellow' });
    expect(result.length).toBe(2);
  });

  it('query: tagPrefix hierárquico (estratégia casa estratégia/jogos)', async () => {
    await highlights.add(makeHighlight({ id: 'h1', tags: ['estratégia'] }));
    await highlights.add(makeHighlight({ id: 'h2', tags: ['estratégia/jogos'] }));
    await highlights.add(makeHighlight({ id: 'h3', tags: ['outro'] }));
    const result = await highlights.query({ tagPrefix: 'estratégia' });
    expect(result.map((h) => h.id).sort()).toEqual(['h1', 'h2']);
  });
});

describe('notes repository', () => {
  it('add + getByHighlight + remove', async () => {
    const n = makeNote({ highlightId: 'h-x', body: 'nota referência' });
    await notes.add(n);
    expect((await notes.getByHighlight('h-x')).length).toBe(1);
    await notes.remove(n.id);
    expect(await notes.getById(n.id)).toBeUndefined();
  });

  it('query: full-text case-insensitive em body e title', async () => {
    await notes.add(makeNote({ body: 'Wittgenstein é difícil' }));
    await notes.add(makeNote({ body: 'simples e claro', title: 'Wittgenstein' }));
    await notes.add(makeNote({ body: 'irrelevante' }));
    const result = await notes.query({ text: 'wittgen' });
    expect(result.length).toBe(2);
  });
});

describe('bookmarks repository', () => {
  it('add + getByBook + query desc', async () => {
    await bookmarks.add(makeBookmark({ bookId: 'b1', createdAt: isoOffset(-30) }));
    await bookmarks.add(makeBookmark({ bookId: 'b1', createdAt: isoOffset(-10) }));
    await bookmarks.add(makeBookmark({ bookId: 'b2', createdAt: isoOffset(0) }));
    expect((await bookmarks.getByBook('b1')).length).toBe(2);
    const desc = await bookmarks.query({ bookId: 'b1', order: 'desc' });
    expect(new Date(desc[0]!.createdAt).getTime()).toBeGreaterThan(
      new Date(desc[1]!.createdAt).getTime(),
    );
  });
});

describe('flashcards repository', () => {
  it('getDue e countDue respeitam o "now"', async () => {
    await flashcards.add(makeFlashcard({ id: 'c1', due: isoOffset(-60) })); // due
    await flashcards.add(makeFlashcard({ id: 'c2', due: isoOffset(-1) })); // due
    await flashcards.add(makeFlashcard({ id: 'c3', due: isoOffset(60) })); // future
    const now = new Date();
    const due = await flashcards.getDue(now);
    expect(due.map((c) => c.id).sort()).toEqual(['c1', 'c2']);
    expect(await flashcards.countDue(now)).toBe(2);
  });

  it('query: filtra por state', async () => {
    await flashcards.add(makeFlashcard({ state: 'new' }));
    await flashcards.add(makeFlashcard({ state: 'review' }));
    await flashcards.add(makeFlashcard({ state: 'review' }));
    const result = await flashcards.query({ state: 'review' });
    expect(result.length).toBe(2);
  });
});

describe('sessions repository', () => {
  it('add + getByBook', async () => {
    await sessions.add(makeSession({ bookId: 'b1' }));
    await sessions.add(makeSession({ bookId: 'b1' }));
    await sessions.add(makeSession({ bookId: 'b2' }));
    expect((await sessions.getByBook('b1')).length).toBe(2);
  });

  it('query: filtro from/to (intervalo de datas)', async () => {
    const t0 = isoOffset(-120);
    const t1 = isoOffset(-60);
    const t2 = isoOffset(0);
    await sessions.add(makeSession({ startedAt: t0 }));
    await sessions.add(makeSession({ startedAt: t1 }));
    await sessions.add(makeSession({ startedAt: t2 }));
    const result = await sessions.query({ from: t1, to: t2 });
    expect(result.length).toBe(2);
  });
});

describe('positions repository', () => {
  it('upsert substitui o existente', async () => {
    await positions.upsert({
      bookId: 'b1',
      cfi: 'a',
      chapterIndex: 0,
      percentage: 10,
      updatedAt: isoOffset(0),
    });
    await positions.upsert({
      bookId: 'b1',
      cfi: 'b',
      chapterIndex: 1,
      percentage: 20,
      updatedAt: isoOffset(1),
    });
    const got = await positions.getById('b1');
    expect(got?.cfi).toBe('b');
    expect(got?.percentage).toBe(20);
  });
});

describe('prefs repository', () => {
  it('getPrefs devolve undefined quando vazio', async () => {
    expect(await getPrefs()).toBeUndefined();
  });

  it('putPrefs + getPrefs round-trip preserva campos canónicos', async () => {
    await putPrefs(DEFAULT_PREFERENCES, { persistVersion: 0 });
    const got = await getPrefs();
    expect(got?.theme).toBe('light');
    expect(got?.fontFamily).toBe('serif');
    expect(got?.fontSize).toBe(19);
  });

  it('getPrefs não devolve campos internos _persist*', async () => {
    await putPrefs({ ...DEFAULT_PREFERENCES, theme: 'dark' }, { persistVersion: 3 });
    const got = await getPrefs();
    expect(got).not.toHaveProperty('_persistVersion');
    expect(got).not.toHaveProperty('_persistEnvelopeKey');
    expect(await getPrefsPersistVersion()).toBe(3);
  });
});
