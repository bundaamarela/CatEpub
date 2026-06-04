/**
 * Testes para src/lib/db/sessions.ts — startSession, endSession e queries.
 *
 * Nota: WebSpeechTTS (src/lib/tts/webspeech.ts) não tem testes unitários aqui
 * porque a Web Speech API (window.speechSynthesis / SpeechSynthesisUtterance)
 * não está disponível em jsdom. Testes de TTS requerem browser real ou puppeteer.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db/schema';
import {
  add,
  endSession,
  getByBook,
  query,
  startSession,
} from '@/lib/db/sessions';
import type { ReadingSession } from '@/types/flashcard';

beforeEach(async () => {
  await db.sessions.clear();
});

describe('startSession', () => {
  it('cria uma sessão com os campos obrigatórios corretos', async () => {
    const now = new Date('2026-05-01T10:00:00Z');
    const id = await startSession('book-1', 'epubcfi(/6/4!/4)', now);
    const stored = await db.sessions.get(id);
    expect(stored).toBeDefined();
    expect(stored?.bookId).toBe('book-1');
    expect(stored?.startCfi).toBe('epubcfi(/6/4!/4)');
    expect(stored?.startedAt).toBe('2026-05-01T10:00:00.000Z');
    expect(stored?.pagesRead).toBe(0);
    expect(stored?.endedAt).toBeUndefined();
  });

  it('devolve um id que é uma string não vazia', async () => {
    const id = await startSession('book-2', 'epubcfi(/6/2!/4)');
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('duas chamadas geram ids distintos', async () => {
    const a = await startSession('book-1', 'epubcfi(/6/4!/4)');
    const b = await startSession('book-1', 'epubcfi(/6/4!/4)');
    expect(a).not.toBe(b);
  });
});

describe('endSession', () => {
  it('actualiza endedAt, pagesRead e wordsRead estimado', async () => {
    const start = new Date('2026-05-01T10:00:00Z');
    const end = new Date('2026-05-01T10:30:00Z');
    const id = await startSession('book-1', 'epubcfi(/6/4!/4)', start);
    await endSession(id, 'epubcfi(/6/6!/4)', 5, end);
    const stored = await db.sessions.get(id);
    expect(stored?.endedAt).toBe('2026-05-01T10:30:00.000Z');
    expect(stored?.pagesRead).toBe(5);
    expect(stored?.wordsRead).toBe(5 * 250);
    expect(stored?.endCfi).toBe('epubcfi(/6/6!/4)');
  });

  it('endCfi fica undefined quando não fornecido', async () => {
    const id = await startSession('book-1', 'epubcfi(/6/4!/4)');
    await endSession(id, undefined, 3);
    const stored = await db.sessions.get(id);
    expect(stored?.endCfi).toBeUndefined();
  });

  it('wordsRead é 0 quando pagesRead === 0', async () => {
    const id = await startSession('book-1', 'epubcfi(/6/4!/4)');
    await endSession(id, undefined, 0);
    const stored = await db.sessions.get(id);
    expect(stored?.wordsRead).toBe(0);
  });
});

describe('getByBook', () => {
  it('devolve apenas sessões do livro pedido', async () => {
    await startSession('book-a', 'epubcfi(/6/4!/4)');
    await startSession('book-b', 'epubcfi(/6/2!/4)');
    await startSession('book-a', 'epubcfi(/6/6!/4)');
    const sessions = await getByBook('book-a');
    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.bookId === 'book-a')).toBe(true);
  });
});

describe('query — filtro de datas', () => {
  const makeSession = (startedAt: string): ReadingSession => ({
    id: startedAt.replace(/\D/g, ''),
    bookId: 'b1',
    startCfi: 'epubcfi(/6/4!/4)',
    startedAt,
    pagesRead: 0,
  });

  it('filtra por from e to', async () => {
    await add(makeSession('2026-04-28T10:00:00Z'));
    await add(makeSession('2026-04-30T10:00:00Z'));
    await add(makeSession('2026-05-02T10:00:00Z'));
    const results = await query({
      from: '2026-04-29T00:00:00Z',
      to: '2026-05-01T00:00:00Z',
    });
    expect(results).toHaveLength(1);
    expect(results[0]?.startedAt).toBe('2026-04-30T10:00:00Z');
  });
});
