import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import * as highlights from '@/lib/db/highlights';
import type { Highlight } from '@/types/highlight';

export const HIGHLIGHT_QUERY_KEYS = {
  all: ['highlights'] as const,
  byBook: (bookId: string): readonly unknown[] =>
    ['highlights', 'byBook', bookId] as const,
};

export const useHighlightsByBook = (bookId: string | undefined) =>
  useQuery({
    queryKey: bookId ? HIGHLIGHT_QUERY_KEYS.byBook(bookId) : ['highlights', 'byBook', 'noop'],
    queryFn: () => (bookId ? highlights.getByBook(bookId) : Promise.resolve([] as Highlight[])),
    enabled: bookId !== undefined,
  });

export const useAllHighlights = () =>
  useQuery({
    queryKey: HIGHLIGHT_QUERY_KEYS.all,
    queryFn: () => highlights.getAll(),
  });

export const useAddHighlight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (h: Highlight) => highlights.add(h),
    onSuccess: (_id, h) => {
      void qc.invalidateQueries({ queryKey: HIGHLIGHT_QUERY_KEYS.byBook(h.bookId) });
      void qc.invalidateQueries({ queryKey: HIGHLIGHT_QUERY_KEYS.all });
    },
  });
};

export const useUpdateHighlight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Highlight> }) =>
      highlights.update(id, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HIGHLIGHT_QUERY_KEYS.all });
    },
  });
};

export const useRemoveHighlight = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => highlights.remove(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: HIGHLIGHT_QUERY_KEYS.all });
    },
  });
};
