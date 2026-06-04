import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { cn } from '@/lib/utils/cn';
import { useAllHighlights } from '@/lib/store/highlights';
import { useBooks } from '@/lib/store/library';
import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';
import * as notesDb from '@/lib/db/notes';
import styles from './Search.module.css';

const CONTEXT = 30;

interface MatchInfo {
  before: string;
  match: string;
  after: string;
}

/**
 * Encontra a primeira ocorrência (case-insensitive) de `needle` em `haystack`
 * e devolve um excerto com 30 chars antes e depois. `null` se não houver match.
 */
const excerpt = (haystack: string, needle: string): MatchInfo | null => {
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return null;
  const before = haystack.slice(Math.max(0, idx - CONTEXT), idx);
  const match = haystack.slice(idx, idx + needle.length);
  const after = haystack.slice(idx + needle.length, idx + needle.length + CONTEXT);
  return {
    before: (idx > CONTEXT ? '…' : '') + before,
    match,
    after: after + (haystack.length > idx + needle.length + CONTEXT ? '…' : ''),
  };
};

const Excerpt = ({ info }: { info: MatchInfo }) => (
  <>
    {info.before}
    <mark className={cn(styles.mark)}>{info.match}</mark>
    {info.after}
  </>
);

interface BookHit {
  book: Book;
  field: 'title' | 'author';
  info: MatchInfo;
}

interface HighlightHit {
  highlight: Highlight;
  bookTitle: string;
  field: 'text' | 'note' | 'tag';
  info: MatchInfo;
}

interface NoteHit {
  note: Note;
  bookTitle: string;
  field: 'body' | 'title' | 'tag';
  info: MatchInfo;
}

const Search = () => {
  const [params, setParams] = useSearchParams();
  const initialQuery = params.get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync URL ?q= when query changes (debounced 200ms).
  useEffect(() => {
    const t = setTimeout(() => {
      const q = query.trim();
      if (q.length === 0) {
        if (params.has('q')) {
          params.delete('q');
          setParams(params, { replace: true });
        }
      } else if (params.get('q') !== q) {
        params.set('q', q);
        setParams(params, { replace: true });
      }
    }, 200);
    return () => clearTimeout(t);
  }, [query, params, setParams]);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const booksQuery = useBooks();
  const highlightsQuery = useAllHighlights();
  const [allNotes, setAllNotes] = useState<Note[]>([]);

  useEffect(() => {
    void notesDb.getAll().then(setAllNotes);
  }, []);

  const trimmed = query.trim();

  const { bookHits, highlightHits, noteHits } = useMemo(() => {
    if (trimmed.length < 2) return { bookHits: [], highlightHits: [], noteHits: [] };
    const allBooks = booksQuery.data ?? [];
    const allHighlights = highlightsQuery.data ?? [];
    const titleByBook = new Map(allBooks.map((b) => [b.id, b.title]));

    const bookHits: BookHit[] = [];
    for (const book of allBooks) {
      const t = excerpt(book.title, trimmed);
      if (t) {
        bookHits.push({ book, field: 'title', info: t });
        continue;
      }
      if (book.author !== undefined) {
        const a = excerpt(book.author, trimmed);
        if (a) bookHits.push({ book, field: 'author', info: a });
      }
    }

    const highlightHits: HighlightHit[] = [];
    for (const h of allHighlights) {
      const tx = excerpt(h.text, trimmed);
      if (tx) {
        highlightHits.push({
          highlight: h,
          bookTitle: titleByBook.get(h.bookId) ?? 'Livro desconhecido',
          field: 'text',
          info: tx,
        });
        continue;
      }
      if (h.note !== undefined) {
        const n = excerpt(h.note, trimmed);
        if (n) {
          highlightHits.push({
            highlight: h,
            bookTitle: titleByBook.get(h.bookId) ?? 'Livro desconhecido',
            field: 'note',
            info: n,
          });
          continue;
        }
      }
      const tagMatch = h.tags.find((tag) => tag.toLowerCase().includes(trimmed.toLowerCase()));
      if (tagMatch !== undefined) {
        const m = excerpt(tagMatch, trimmed);
        if (m)
          highlightHits.push({
            highlight: h,
            bookTitle: titleByBook.get(h.bookId) ?? 'Livro desconhecido',
            field: 'tag',
            info: m,
          });
      }
    }

    const noteHits: NoteHit[] = [];
    for (const n of allNotes) {
      const b = excerpt(n.body, trimmed);
      if (b) {
        noteHits.push({
          note: n,
          bookTitle: titleByBook.get(n.bookId) ?? 'Livro desconhecido',
          field: 'body',
          info: b,
        });
        continue;
      }
      if (n.title !== undefined) {
        const t = excerpt(n.title, trimmed);
        if (t) {
          noteHits.push({
            note: n,
            bookTitle: titleByBook.get(n.bookId) ?? 'Livro desconhecido',
            field: 'title',
            info: t,
          });
          continue;
        }
      }
      const tagMatch = n.tags.find((tag) => tag.toLowerCase().includes(trimmed.toLowerCase()));
      if (tagMatch !== undefined) {
        const m = excerpt(tagMatch, trimmed);
        if (m)
          noteHits.push({
            note: n,
            bookTitle: titleByBook.get(n.bookId) ?? 'Livro desconhecido',
            field: 'tag',
            info: m,
          });
      }
    }

    return { bookHits, highlightHits, noteHits };
  }, [trimmed, booksQuery.data, highlightsQuery.data, allNotes]);

  const total = bookHits.length + highlightHits.length + noteHits.length;

  return (
    <section className={cn(styles.page)}>
      <div className={cn(styles.header)}>
        <h1 className={cn(styles.title)}>Pesquisa</h1>
        <input
          ref={inputRef}
          type="search"
          className={cn(styles.input)}
          placeholder="Procurar em livros, anotações e notas…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Procura global"
          data-testid="global-search-input"
        />
        {trimmed.length >= 2 && (
          <p className={cn(styles.summary)}>
            {total} resultado{total === 1 ? '' : 's'} para “{trimmed}”
          </p>
        )}
        {trimmed.length > 0 && trimmed.length < 2 && (
          <p className={cn(styles.summary)}>Escreve pelo menos 2 caracteres.</p>
        )}
      </div>

      {bookHits.length > 0 && (
        <section className={cn(styles.group)}>
          <h2 className={cn(styles.groupTitle)}>
            Livros <span className={cn(styles.count)}>({bookHits.length})</span>
          </h2>
          <ul className={cn(styles.list)}>
            {bookHits.map(({ book, field, info }) => (
              <li key={`${book.id}-${field}`}>
                <Link to={`/reader/${book.id}`} className={cn(styles.hit)}>
                  <span className={cn(styles.hitField)}>
                    {field === 'title' ? 'Título' : 'Autor'}
                  </span>
                  <span className={cn(styles.hitText)}>
                    <Excerpt info={info} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {highlightHits.length > 0 && (
        <section className={cn(styles.group)}>
          <h2 className={cn(styles.groupTitle)}>
            Anotações <span className={cn(styles.count)}>({highlightHits.length})</span>
          </h2>
          <ul className={cn(styles.list)}>
            {highlightHits.map(({ highlight, bookTitle, field, info }) => (
              <li key={highlight.id + field}>
                <Link to={`/reader/${highlight.bookId}`} className={cn(styles.hit)}>
                  <span className={cn(styles.hitField)}>
                    {field === 'text' ? 'Texto' : field === 'note' ? 'Nota' : 'Tag'}
                  </span>
                  <span className={cn(styles.hitText)}>
                    <Excerpt info={info} />
                  </span>
                  <span className={cn(styles.hitMeta)}>{bookTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {noteHits.length > 0 && (
        <section className={cn(styles.group)}>
          <h2 className={cn(styles.groupTitle)}>
            Notas <span className={cn(styles.count)}>({noteHits.length})</span>
          </h2>
          <ul className={cn(styles.list)}>
            {noteHits.map(({ note, bookTitle, field, info }) => (
              <li key={note.id + field}>
                <Link to={`/reader/${note.bookId}`} className={cn(styles.hit)}>
                  <span className={cn(styles.hitField)}>
                    {field === 'body' ? 'Corpo' : field === 'title' ? 'Título' : 'Tag'}
                  </span>
                  <span className={cn(styles.hitText)}>
                    <Excerpt info={info} />
                  </span>
                  <span className={cn(styles.hitMeta)}>{bookTitle}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trimmed.length >= 2 && total === 0 && (
        <p className={cn(styles.empty)}>
          Sem resultados. Tenta outra palavra ou frase.
        </p>
      )}
    </section>
  );
};

export default Search;
