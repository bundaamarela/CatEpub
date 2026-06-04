import { useMemo, useState } from 'react';

import { CatEmpty, GridIcon, ListIcon } from '@/components/icons';
import { BookCard } from '@/components/library/BookCard';
import { BookListItem } from '@/components/library/BookListItem';
import { ALL_CATEGORIES, FilterBar, type CategoryFilter } from '@/components/library/FilterBar';
import { ImportDropzone } from '@/components/library/ImportDropzone';
import styles from '@/components/library/Library.module.css';
import { cn } from '@/lib/utils/cn';
import { useBooksWithProgress, useRemoveBook, type BookWithProgress } from '@/lib/store/library';
import { usePrefs } from '@/lib/store/prefs';

type SortKey = 'lastReadAt' | 'addedAt' | 'title' | 'author' | 'progress';

const SORT_LABEL: Record<SortKey, string> = {
  lastReadAt: 'Recentes',
  addedAt: 'Adicionados',
  title: 'Título',
  author: 'Autor',
  progress: 'Progresso',
};

const sortBooks = (list: ReadonlyArray<BookWithProgress>, sort: SortKey): BookWithProgress[] => {
  const arr = [...list];
  switch (sort) {
    case 'title':
      return arr.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
    case 'author':
      return arr.sort((a, b) => a.author.localeCompare(b.author, 'pt'));
    case 'progress':
      return arr.sort((a, b) => b.progress - a.progress);
    case 'addedAt':
      return arr.sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1));
    case 'lastReadAt':
    default:
      return arr.sort((a, b) => {
        const aT = a.lastReadAt ?? '';
        const bT = b.lastReadAt ?? '';
        if (aT === bT) return a.addedAt < b.addedAt ? 1 : -1;
        return aT < bT ? 1 : -1;
      });
  }
};

const Library = () => {
  const { data, isLoading } = useBooksWithProgress();
  const removeMut = useRemoveBook();
  const view = usePrefs((s) => s.libraryView);
  const setView = usePrefs((s) => s.setLibraryView);

  const [sort, setSort] = useState<SortKey>('lastReadAt');
  const [filter, setFilter] = useState<CategoryFilter>(ALL_CATEGORIES);

  const list = useMemo<ReadonlyArray<BookWithProgress>>(() => data ?? [], [data]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const b of list) {
      if (b.category !== undefined && b.category.length > 0) set.add(b.category);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt'));
  }, [list]);

  const filtered = useMemo(() => {
    const byCategory =
      filter === ALL_CATEGORIES ? list : list.filter((b) => b.category === filter);
    return sortBooks(byCategory, sort);
  }, [list, filter, sort]);

  const handleDelete = async (book: BookWithProgress): Promise<void> => {
    const ok = window.confirm(
      `Eliminar “${book.title}”?\n\nEsta ação remove o livro e todos os dados associados (notas, marcadores, posição). Não pode ser desfeita.`,
    );
    if (!ok) return;
    const reallyOk = window.confirm('Confirma definitivamente?');
    if (!reallyOk) return;
    await removeMut.mutateAsync(book.id);
  };

  return (
    <div className={cn(styles.scroll)}>
      <div className={cn(styles.container)}>
        <header className={cn(styles.header)}>
          <h1 className={cn(styles.title)}>Biblioteca</h1>
          <div className={cn(styles.controls)}>
            <button
              type="button"
              className={cn(styles.iconBtn)}
              onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
              aria-label={view === 'grid' ? 'Mudar para lista' : 'Mudar para grelha'}
              title={view === 'grid' ? 'Vista em lista' : 'Vista em grelha'}
            >
              {view === 'grid' ? <ListIcon size={16} /> : <GridIcon size={16} />}
            </button>
            <select
              className={cn(styles.select)}
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Ordenar por"
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => (
                <option key={k} value={k}>
                  {SORT_LABEL[k]}
                </option>
              ))}
            </select>
          </div>
        </header>

        <ImportDropzone />

        {categories.length > 0 && (
          <FilterBar categories={categories} active={filter} onChange={setFilter} />
        )}

        {isLoading && <p className={cn(styles.subtle)}>A carregar…</p>}

        {!isLoading && filtered.length === 0 && (
          <div className={cn(styles.empty)}>
            <CatEmpty size={80} />
            <div className={cn(styles.emptyTitle)}>
              {list.length === 0 ? 'Biblioteca vazia' : 'Nenhum livro nesta categoria'}
            </div>
          </div>
        )}

        {!isLoading && filtered.length > 0 && view === 'grid' && (
          <div className={cn(styles.grid)}>
            {filtered.map((book) => (
              <BookCard key={book.id} book={book} onDelete={(b) => void handleDelete(b)} />
            ))}
          </div>
        )}

        {!isLoading && filtered.length > 0 && view === 'list' && (
          <div className={cn(styles.list)}>
            {filtered.map((book) => (
              <BookListItem key={book.id} book={book} onDelete={(b) => void handleDelete(b)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library;
