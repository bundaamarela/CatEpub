import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { cn } from '@/lib/utils/cn';
import * as backlinksDb from '@/lib/db/backlinks';
import { downloadAsFile, exportBookMarkdown } from '@/lib/notes/export';
import { renderMarkdown } from '@/lib/utils/markdown';
import { useAllHighlights } from '@/lib/store/highlights';
import { useBooks } from '@/lib/store/library';
import type { Backlink } from '@/types/backlink';
import type { Book } from '@/types/book';
import type { Highlight, HighlightColor } from '@/types/highlight';
import styles from './Notes.module.css';

const COLOR_VARS: Record<HighlightColor, string> = {
  yellow: 'var(--highlight-yellow)',
  green: 'var(--highlight-green)',
  blue: 'var(--highlight-blue)',
  pink: 'var(--highlight-pink)',
  purple: 'var(--highlight-purple)',
};

const sanitizeFilename = (s: string): string =>
  s.replace(/[^\p{L}\p{N}\-_ ]+/gu, '').trim().replace(/\s+/g, '-').toLowerCase() || 'livro';

const matchesSearch = (h: Highlight, needle: string): boolean => {
  if (needle.length === 0) return true;
  const n = needle.toLowerCase();
  if (h.text.toLowerCase().includes(n)) return true;
  if (h.note !== undefined && h.note.toLowerCase().includes(n)) return true;
  if (h.tags.some((t) => t.toLowerCase().includes(n))) return true;
  return false;
};

const Notes = () => {
  const booksQuery = useBooks();
  const highlightsQuery = useAllHighlights();
  const backlinksQuery = useQuery({
    queryKey: ['backlinks', 'all'],
    queryFn: () => backlinksDb.getAll(),
  });
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const allBooks: ReadonlyArray<Book> = booksQuery.data ?? [];
    const allHighlights: ReadonlyArray<Highlight> = highlightsQuery.data ?? [];
    const byBook = new Map<string, Highlight[]>();
    for (const h of allHighlights) {
      if (!matchesSearch(h, search.trim())) continue;
      const list = byBook.get(h.bookId);
      if (list) list.push(h);
      else byBook.set(h.bookId, [h]);
    }
    return allBooks
      .filter((b) => byBook.has(b.id))
      .map((book) => ({
        book,
        highlights: (byBook.get(book.id) ?? []).sort((a, b) =>
          a.createdAt < b.createdAt ? 1 : -1,
        ),
      }));
  }, [booksQuery.data, highlightsQuery.data, search]);

  const backlinksByTarget = useMemo(() => {
    const all: ReadonlyArray<Backlink> = backlinksQuery.data ?? [];
    const map = new Map<string, Backlink[]>();
    for (const bl of all) {
      const list = map.get(bl.targetId);
      if (list) list.push(bl);
      else map.set(bl.targetId, [bl]);
    }
    return map;
  }, [backlinksQuery.data]);

  const allHighlightsFlat = useMemo(
    () => highlightsQuery.data ?? [],
    [highlightsQuery.data],
  );

  const totalHighlights = grouped.reduce((sum, g) => sum + g.highlights.length, 0);

  const exportOne = (book: Book, list: ReadonlyArray<Highlight>): void => {
    const md = exportBookMarkdown(book, list);
    downloadAsFile(`${sanitizeFilename(book.title)}.md`, md);
  };

  const exportAll = (): void => {
    for (const { book, highlights } of grouped) {
      exportOne(book, highlights);
    }
  };

  return (
    <section className={cn(styles.page)}>
      <div className={cn(styles.header)}>
        <h1 className={cn(styles.title)}>Notas</h1>
        <div className={cn(styles.tools)}>
          <input
            type="search"
            className={cn(styles.search)}
            placeholder="Buscar texto, nota, tag…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            type="button"
            className={cn(styles.button)}
            onClick={exportAll}
            disabled={totalHighlights === 0}
            data-testid="export-all"
          >
            Exportar tudo
          </button>
        </div>
      </div>

      {totalHighlights === 0 && (
        <div className={cn(styles.empty)}>
          {highlightsQuery.data && highlightsQuery.data.length > 0
            ? 'Nada coincide com a procura.'
            : 'Sem anotações ainda. Selecciona texto num livro para começar.'}
        </div>
      )}

      {grouped.map(({ book, highlights }) => (
        <section key={book.id} className={cn(styles.bookSection)}>
          <header className={cn(styles.bookHeader)}>
            <div>
              <h2 className={cn(styles.bookTitle)}>
                <Link to={`/reader/${book.id}`} style={{ color: 'inherit' }}>
                  {book.title}
                </Link>
              </h2>
              {book.author && <span className={cn(styles.bookAuthor)}>{book.author}</span>}
            </div>
            <button
              type="button"
              className={cn(styles.exportLink)}
              onClick={() => exportOne(book, highlights)}
            >
              Exportar (.md)
            </button>
          </header>
          {highlights.map((h) => (
            <article key={h.id} className={cn(styles.highlight)}>
              <p className={cn(styles.highlightText)}>“{h.text}”</p>
              {h.note !== undefined && h.note.trim().length > 0 && (
                <div
                  className={cn(styles.highlightNote)}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(h.note) }}
                />
              )}
              <div className={cn(styles.highlightMeta)}>
                <span
                  className={cn(styles.colorPip)}
                  style={{ background: COLOR_VARS[h.color] }}
                  aria-label={h.color}
                />
                {h.tags.map((t) => (
                  <span key={t} className={cn(styles.tag)}>
                    {t}
                  </span>
                ))}
                <span style={{ marginLeft: 'auto' }}>
                  {new Date(h.createdAt).toLocaleDateString('pt-PT')}
                </span>
              </div>
              {(backlinksByTarget.get(h.id) ?? []).length > 0 && (
                <div className={cn(styles.backlinks)}>
                  <span className={cn(styles.backlinksLabel)}>Referenciado por:</span>
                  {(backlinksByTarget.get(h.id) ?? []).map((bl) => {
                    const src = allHighlightsFlat.find((x) => x.id === bl.sourceId);
                    return (
                      <span key={bl.id} className={cn(styles.backlinkChip)}>
                        {src ? `"${src.text.slice(0, 40)}…"` : bl.sourceId.slice(0, 8)}
                      </span>
                    );
                  })}
                </div>
              )}
            </article>
          ))}
        </section>
      ))}
    </section>
  );
};

export default Notes;
