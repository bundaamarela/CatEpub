import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as books from '@/lib/db/books';
import { importEpubFile } from '@/lib/epub/import';
import * as parser from '@/lib/epub/parser';
import { db } from '@/lib/db/schema';

const fakeFile = (name: string, content = 'fake-epub-content', type = 'application/epub+zip'): File =>
  new File([content], name, { type });

const stubParse = (overrides: Partial<parser.ParsedEpub> = {}): parser.ParsedEpub => ({
  metadata: { title: 'Livro Stub', author: 'Autor Stub' },
  toc: [],
  spineLength: 1,
  // O `book` é opaco para o teste — não usado pelo importEpubFile, basta passar.
  book: {} as unknown as parser.ParsedEpub['book'],
  ...overrides,
});

beforeEach(async () => {
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear();
  });
});

describe('importEpubFile', () => {
  it('rejeita ficheiros sem extensão .epub e MIME desconhecido', async () => {
    const file = new File(['x'], 'leitura.txt', { type: 'text/plain' });
    const r = await importEpubFile(file);
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.error.message).toMatch(/não parece ser um EPUB/);
  });

  it('aceita ficheiro .epub válido (parse mocked) e regista na DB', async () => {
    const spy = vi.spyOn(parser, 'parseEpub').mockResolvedValue(stubParse());
    const r = await importEpubFile(fakeFile('teste.epub'));
    expect(r.status).toBe('imported');
    if (r.status === 'imported') expect(r.title).toBe('Livro Stub');
    expect(await books.count()).toBe(1);
    spy.mockRestore();
  });

  it('detecta duplicado pelo fileHash e não duplica entrada', async () => {
    const spy = vi.spyOn(parser, 'parseEpub').mockResolvedValue(stubParse());
    const file = fakeFile('teste.epub', 'mesmo-conteudo-binario');
    const first = await importEpubFile(file);
    expect(first.status).toBe('imported');
    expect(await books.count()).toBe(1);

    const second = await importEpubFile(file);
    expect(second.status).toBe('duplicate');
    if (second.status === 'duplicate') {
      if (first.status === 'imported') {
        expect(second.bookId).toBe(first.bookId);
      }
    }
    expect(await books.count()).toBe(1);
    spy.mockRestore();
  });

  it('captura erros do parser e devolve status:error sem lançar', async () => {
    const spy = vi.spyOn(parser, 'parseEpub').mockRejectedValue(new Error('boom'));
    const r = await importEpubFile(fakeFile('mau.epub'));
    expect(r.status).toBe('error');
    if (r.status === 'error') expect(r.error.message).toBe('boom');
    expect(await books.count()).toBe(0);
    spy.mockRestore();
  });

  it('reporta progresso pelas etapas hashing → parsing → saving → done', async () => {
    const spy = vi.spyOn(parser, 'parseEpub').mockResolvedValue(stubParse());
    const stages: string[] = [];
    await importEpubFile(fakeFile('teste.epub'), (p) => stages.push(p.stage));
    expect(stages).toEqual(['hashing', 'parsing', 'saving', 'done']);
    spy.mockRestore();
  });

  it('preserva metadados completos do parser na entrada criada', async () => {
    const spy = vi.spyOn(parser, 'parseEpub').mockResolvedValue(
      stubParse({
        metadata: {
          title: 'Os Maias',
          author: 'Eça de Queirós',
          language: 'pt',
          publisher: 'Livraria Lello',
          publishedAt: '1888',
          identifier: 'isbn:9789725770000',
          description: 'Um romance.',
          subjects: ['ficção', 'século-xix'],
        },
        spineLength: 18,
      }),
    );
    const r = await importEpubFile(fakeFile('os-maias.epub'));
    expect(r.status).toBe('imported');
    if (r.status === 'imported') {
      const stored = await books.getById(r.bookId);
      expect(stored?.title).toBe('Os Maias');
      expect(stored?.author).toBe('Eça de Queirós');
      expect(stored?.language).toBe('pt');
      expect(stored?.publisher).toBe('Livraria Lello');
      expect(stored?.publishedAt).toBe('1888');
      expect(stored?.isbn).toBe('isbn:9789725770000');
      expect(stored?.description).toBe('Um romance.');
      expect(stored?.spineLength).toBe(18);
      expect(stored?.tags).toEqual(['ficção', 'século-xix']);
    }
    spy.mockRestore();
  });
});
