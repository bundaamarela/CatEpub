import { describe, expect, it } from 'vitest';

import { exportAllBooks, exportBookMarkdown } from '@/lib/notes/export';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';

const makeBook = (overrides: Partial<Book> = {}): Book => ({
  id: 'b1',
  title: 'O Livro',
  author: 'A. Autor',
  fileBlob: new Blob(['x']),
  fileSize: 1,
  fileHash: 'h',
  coverHue: 0,
  spineLength: 1,
  tags: [],
  addedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  id: 'h1',
  bookId: 'b1',
  cfiRange: 'epubcfi(/6/4!/4/2)',
  text: 'um excerto memorável',
  color: 'yellow',
  tags: [],
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
  ...overrides,
});

describe('exportBookMarkdown', () => {
  it('inclui título e autor no cabeçalho', () => {
    const md = exportBookMarkdown(makeBook(), [makeHighlight()]);
    expect(md).toMatch(/^# O Livro/);
    expect(md).toContain('*A. Autor*');
  });

  it('formata cada highlight como blockquote com nota e tags', () => {
    const md = exportBookMarkdown(makeBook(), [
      makeHighlight({
        text: 'frase única',
        note: 'A minha leitura disto',
        tags: ['estratégia/jogos', 'moral'],
        color: 'green',
      }),
    ]);
    expect(md).toContain('> frase única');
    expect(md).toContain('**Nota:** A minha leitura disto');
    expect(md).toContain('**Tags:** estratégia/jogos, moral');
    expect(md).toContain('**Cor:** green');
  });

  it('ordena por data de criação ascendente', () => {
    const md = exportBookMarkdown(makeBook(), [
      makeHighlight({ id: 'h2', text: 'segundo', createdAt: '2026-02-01T00:00:00.000Z' }),
      makeHighlight({ id: 'h1', text: 'primeiro', createdAt: '2026-01-01T00:00:00.000Z' }),
    ]);
    const idxFirst = md.indexOf('primeiro');
    const idxSecond = md.indexOf('segundo');
    expect(idxFirst).toBeLessThan(idxSecond);
    expect(idxFirst).toBeGreaterThan(-1);
  });

  it('omite secção de nota quando ausente', () => {
    const md = exportBookMarkdown(makeBook(), [makeHighlight({ note: undefined })]);
    expect(md).not.toContain('**Nota:**');
  });

  it('marca livros sem highlights de forma explícita', () => {
    const md = exportBookMarkdown(makeBook(), []);
    expect(md).toContain('_Sem anotações._');
  });

  it('preserva quebras de linha no texto convertendo em blockquote contínuo', () => {
    const md = exportBookMarkdown(makeBook(), [
      makeHighlight({ text: 'linha 1\nlinha 2' }),
    ]);
    expect(md).toContain('> linha 1\n> linha 2');
  });
});

describe('exportAllBooks', () => {
  it('apenas inclui livros com highlights', () => {
    const books: Book[] = [
      makeBook({ id: 'b1', title: 'Com notas' }),
      makeBook({ id: 'b2', title: 'Sem notas' }),
    ];
    const map = new Map<string, Highlight[]>([['b1', [makeHighlight({ bookId: 'b1' })]]]);
    const result = exportAllBooks(books, map);
    expect(result.has('b1')).toBe(true);
    expect(result.has('b2')).toBe(false);
  });

  it('devolve markdown com cabeçalho do livro respectivo', () => {
    const books: Book[] = [makeBook({ id: 'b1', title: 'Frankenstein' })];
    const map = new Map<string, Highlight[]>([
      ['b1', [makeHighlight({ bookId: 'b1', text: 'O monstro' })]],
    ]);
    const result = exportAllBooks(books, map);
    const md = result.get('b1');
    expect(md).toBeDefined();
    expect(md).toMatch(/^# Frankenstein/);
    expect(md).toContain('> O monstro');
  });
});
