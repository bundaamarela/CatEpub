import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { CatEmpty } from '@/components/icons';
import { extractConcepts, getConceptDetail, exportConceptMarkdown } from '@/lib/knowledge/concepts';
import * as notesDb from '@/lib/db/notes';
import { useAllHighlights } from '@/lib/store/highlights';
import { useBooks } from '@/lib/store/library';
import { cn } from '@/lib/utils/cn';
import { renderMarkdown } from '@/lib/utils/markdown';
import { downloadAsFile } from '@/lib/notes/export';
import styles from './Concepts.module.css';

const ConceptListView = () => {
  const booksQuery = useBooks();
  const highlightsQuery = useAllHighlights();
  const notesQuery = useQuery({ queryKey: ['notes', 'all'], queryFn: () => notesDb.getAll() });
  const [search, setSearch] = useState('');

  const concepts = useMemo(
    () => extractConcepts(highlightsQuery.data ?? [], notesQuery.data ?? []),
    [highlightsQuery.data, notesQuery.data],
  );

  const bookMap = useMemo(
    () => new Map((booksQuery.data ?? []).map((b) => [b.id, b])),
    [booksQuery.data],
  );

  const filtered = useMemo(() => {
    if (search.trim().length === 0) return concepts;
    const needle = search.toLowerCase();
    return concepts.filter((c) => c.tag.includes(needle));
  }, [concepts, search]);

  if (concepts.length === 0) {
    return (
      <section className={cn(styles.page)}>
        <div className={cn(styles.header)}>
          <h1 className={cn(styles.title)}>Conceitos</h1>
        </div>
        <div className={cn(styles.empty)}>
          <CatEmpty size={48} />
          <p>Sem conceitos ainda. Adiciona tags às tuas anotações para criar conceitos.</p>
        </div>
      </section>
    );
  }

  return (
    <section className={cn(styles.page)}>
      <div className={cn(styles.header)}>
        <h1 className={cn(styles.title)}>Conceitos</h1>
        <input
          type="search"
          className={cn(styles.search)}
          placeholder="Filtrar conceitos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className={cn(styles.grid)}>
        {filtered.map((c) => (
          <Link key={c.tag} to={`/concepts?tag=${encodeURIComponent(c.tag)}`} className={cn(styles.chip)}>
            {c.tag}
            <span className={cn(styles.chipCount)}>{c.count}</span>
            <span className={cn(styles.chipBooks)}>
              {c.bookIds.length === 1
                ? (bookMap.get(c.bookIds[0] ?? '')?.title.slice(0, 20) ?? '1 livro')
                : `${c.bookIds.length} livros`}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

const ConceptDetailView = ({ tag }: { tag: string }) => {
  const booksQuery = useBooks();
  const highlightsQuery = useAllHighlights();
  const notesQuery = useQuery({ queryKey: ['notes', 'all'], queryFn: () => notesDb.getAll() });
  const [search, setSearch] = useState('');

  const detail = useMemo(
    () =>
      getConceptDetail(tag, highlightsQuery.data ?? [], notesQuery.data ?? [], booksQuery.data ?? []),
    [tag, highlightsQuery.data, notesQuery.data, booksQuery.data],
  );

  const filtered = useMemo(() => {
    if (search.trim().length === 0) return detail.highlights;
    const needle = search.toLowerCase();
    return detail.highlights.filter(
      (h) => h.text.toLowerCase().includes(needle) || h.bookTitle.toLowerCase().includes(needle),
    );
  }, [detail.highlights, search]);

  const handleExport = (): void => {
    const md = exportConceptMarkdown(detail);
    downloadAsFile(`conceito-${tag}.md`, md);
  };

  return (
    <section className={cn(styles.page)}>
      <Link to="/concepts" className={cn(styles.back)}>
        ← Conceitos
      </Link>
      <h1 className={cn(styles.detailTitle)}>{tag}</h1>
      <p className={cn(styles.detailMeta)}>
        {detail.highlights.length} highlight{detail.highlights.length !== 1 ? 's' : ''} ·{' '}
        {[...new Set(detail.highlights.map((h) => h.bookId))].length} livro
        {[...new Set(detail.highlights.map((h) => h.bookId))].length !== 1 ? 's' : ''}
      </p>

      <div className={cn(styles.tools)}>
        <input
          type="search"
          className={cn(styles.search)}
          placeholder="Buscar dentro do conceito…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button type="button" className={cn(styles.exportBtn)} onClick={handleExport}>
          Exportar conceito (.md)
        </button>
      </div>

      {detail.relatedConcepts.length > 0 && (
        <div className={cn(styles.section)}>
          <h2 className={cn(styles.sectionTitle)}>Conceitos relacionados</h2>
          <div className={cn(styles.relatedGrid)}>
            {detail.relatedConcepts.map((c) => (
              <Link
                key={c}
                to={`/concepts?tag=${encodeURIComponent(c)}`}
                className={cn(styles.relatedChip)}
              >
                {c}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className={cn(styles.section)}>
        <h2 className={cn(styles.sectionTitle)}>Highlights</h2>
        {filtered.map((h) => (
          <article key={h.id} className={cn(styles.highlight)}>
            <p className={cn(styles.highlightText)}>"{h.text}"</p>
            <span className={cn(styles.highlightBook)}>
              <Link to={`/reader/${h.bookId}`} style={{ color: 'inherit' }}>
                {h.bookTitle}
              </Link>
              {' · '}
              {new Date(h.createdAt).toLocaleDateString('pt-PT')}
            </span>
            {h.note !== undefined && h.note.trim().length > 0 && (
              <div
                className={cn(styles.highlightNote)}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(h.note) }}
              />
            )}
          </article>
        ))}
        {filtered.length === 0 && (
          <div className={cn(styles.empty)}>Nenhum resultado para a busca.</div>
        )}
      </div>
    </section>
  );
};

const Concepts = () => {
  const [params] = useSearchParams();
  const tag = params.get('tag');

  if (tag !== null && tag.length > 0) {
    return <ConceptDetailView tag={tag} />;
  }
  return <ConceptListView />;
};

export default Concepts;
