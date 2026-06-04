import { describe, expect, it } from 'vitest';

import { markdownToNote, noteToMarkdown } from '@/lib/knowledge/markdown';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'n-1',
  bookId: 'b-1',
  highlightId: 'h-1',
  cfi: 'epubcfi(/6/4!/4/2)',
  title: 'Apontamento',
  body: 'Linha um.\n\nLinha dois com **negrito**.',
  tags: ['estratégia/jogos', 'moral'],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-02T11:30:00.000Z',
  ...overrides,
});

const makeHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  id: 'h-1',
  bookId: 'b-1',
  cfiRange: 'epubcfi(/6/4!/4/2,/1:0,/1:42)',
  text: 'Um excerto memorável.',
  color: 'yellow',
  tags: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
});

const makeBook = (overrides: Partial<Book> = {}): Book => ({
  id: 'b-1',
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

describe('noteToMarkdown', () => {
  it('emite frontmatter YAML com todos os campos canónicos', () => {
    const md = noteToMarkdown(makeNote(), makeHighlight(), makeBook());
    expect(md).toMatch(/^---\n/);
    expect(md).toContain('id: n-1');
    expect(md).toContain('bookId: b-1');
    expect(md).toContain('book: O Livro');
    expect(md).toContain('author: A. Autor');
    expect(md).toContain('color: yellow');
    expect(md).toContain('cfi: ');
    expect(md).toContain('epubcfi(/6/4!/4/2,/1:0,/1:42)');
    expect(md).toContain('highlightId: h-1');
    expect(md).toContain('created: ');
    expect(md).toContain('updated: ');
  });

  it('preserva tags hierárquicas no frontmatter', () => {
    const md = noteToMarkdown(makeNote(), makeHighlight(), makeBook());
    expect(md).toContain('estratégia/jogos');
    expect(md).toContain('moral');
  });

  it('embebe texto do highlight como blockquote', () => {
    const md = noteToMarkdown(makeNote(), makeHighlight({ text: 'frase única' }));
    expect(md).toContain('> frase única');
  });

  it('multi-linhas no highlight viram blockquote contínuo', () => {
    const md = noteToMarkdown(makeNote(), makeHighlight({ text: 'linha 1\nlinha 2' }));
    expect(md).toContain('> linha 1\n> linha 2');
  });

  it('omite blockquote quando não há highlight', () => {
    const md = noteToMarkdown(makeNote({ highlightId: undefined }), undefined, makeBook());
    expect(md).not.toContain('\n> ');
  });
});

describe('markdownToNote', () => {
  it('round-trip preserva todos os campos da nota', () => {
    const note = makeNote();
    const md = noteToMarkdown(note, makeHighlight(), makeBook());
    const back = markdownToNote(md);
    expect(back.id).toBe(note.id);
    expect(back.bookId).toBe(note.bookId);
    expect(back.highlightId).toBe(note.highlightId);
    expect(back.cfi).toBe('epubcfi(/6/4!/4/2,/1:0,/1:42)');
    expect(back.title).toBe(note.title);
    expect(back.body).toBe(note.body);
    expect(back.tags).toEqual(note.tags);
    expect(back.createdAt).toBe(note.createdAt);
    expect(back.updatedAt).toBe(note.updatedAt);
  });

  it('descarta blockquote do highlight ao reconstruir', () => {
    const md = noteToMarkdown(makeNote(), makeHighlight({ text: 'TEXTO HIGHLIGHT' }), makeBook());
    const back = markdownToNote(md);
    expect(back.body).not.toContain('TEXTO HIGHLIGHT');
    expect(back.body).not.toContain('> ');
  });

  it('preserva blockquotes no corpo da nota (não-iniciais)', () => {
    const note = makeNote({ body: 'Intro.\n\n> citação dentro da nota\n\nFim.' });
    const md = noteToMarkdown(note, makeHighlight());
    const back = markdownToNote(md);
    expect(back.body).toContain('> citação dentro da nota');
    expect(back.body).toContain('Intro.');
    expect(back.body).toContain('Fim.');
  });

  it('escapa caracteres especiais YAML (dois pontos, aspas)', () => {
    const note = makeNote({
      title: 'Título: com "aspas" e — travessão',
      body: 'corpo: simples',
    });
    const md = noteToMarkdown(note, undefined, makeBook());
    const back = markdownToNote(md);
    expect(back.title).toBe('Título: com "aspas" e — travessão');
    expect(back.body).toBe('corpo: simples');
  });

  it('aceita nota sem highlight (sem blockquote)', () => {
    const note = makeNote({ highlightId: undefined, cfi: undefined });
    const md = noteToMarkdown(note, undefined, makeBook());
    const back = markdownToNote(md);
    expect(back.body).toBe(note.body);
    expect(back.highlightId).toBeUndefined();
    expect(back.cfi).toBeUndefined();
  });

  it('tags vazias devolvem array vazio (não undefined)', () => {
    const note = makeNote({ tags: [] });
    const md = noteToMarkdown(note);
    const back = markdownToNote(md);
    expect(back.tags).toEqual([]);
  });

  it('preserva quebras de linha múltiplas no corpo', () => {
    const note = makeNote({ body: 'um\n\ndois\n\ntrês' });
    const md = noteToMarkdown(note, makeHighlight());
    const back = markdownToNote(md);
    expect(back.body).toBe('um\n\ndois\n\ntrês');
  });
});
