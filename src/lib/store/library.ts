import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as books from '@/lib/db/books';
import * as positions from '@/lib/db/positions';
import type { Book } from '@/types/book';

export const BOOK_QUERY_KEYS = {
  all: ['books'] as const,
  list: (params?: books.BookQuery): readonly unknown[] =>
    [...BOOK_QUERY_KEYS.all, 'list', params ?? {}] as const,
  byId: (id: string): readonly unknown[] => [...BOOK_QUERY_KEYS.all, 'byId', id] as const,
  withProgress: (params?: books.BookQuery): readonly unknown[] =>
    [...BOOK_QUERY_KEYS.all, 'withProgress', params ?? {}] as const,
};

/** Livro enriquecido com a percentagem actual derivada de `positions`. */
export interface BookWithProgress extends Book {
  /** 0–100. 0 quando ainda não há posição registada. */
  progress: number;
  /** ISO da última actualização da posição, se existir. */
  positionUpdatedAt?: string;
}

/** Lista reactiva de livros (com filtros/ordenação). */
export const useBooks = (params?: books.BookQuery) =>
  useQuery({
    queryKey: BOOK_QUERY_KEYS.list(params),
    queryFn: () => books.query(params),
  });

/** Lista reactiva enriquecida com `progress` derivado de `positions`. */
export const useBooksWithProgress = (params?: books.BookQuery) =>
  useQuery({
    queryKey: BOOK_QUERY_KEYS.withProgress(params),
    queryFn: async (): Promise<BookWithProgress[]> => {
      const [bookList, positionList] = await Promise.all([books.query(params), positions.getAll()]);
      const byBook = new Map(positionList.map((p) => [p.bookId, p] as const));
      return bookList.map((b) => {
        const pos = byBook.get(b.id);
        const enriched: BookWithProgress = {
          ...b,
          progress: pos?.percentage ?? 0,
        };
        if (pos?.updatedAt !== undefined) enriched.positionUpdatedAt = pos.updatedAt;
        return enriched;
      });
    },
  });

export const useBook = (id: string | undefined) =>
  useQuery({
    queryKey: id ? BOOK_QUERY_KEYS.byId(id) : ['books', 'byId', 'noop'],
    queryFn: () => (id ? books.getById(id) : Promise.resolve(undefined)),
    enabled: id !== undefined,
  });

export const useAddBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (book: Book) => books.add(book),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOK_QUERY_KEYS.all }),
  });
};

export const useUpdateBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Book> }) => books.update(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOK_QUERY_KEYS.all }),
  });
};

export const useRemoveBook = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => books.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: BOOK_QUERY_KEYS.all }),
  });
};
