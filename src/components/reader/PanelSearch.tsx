import { type FC, useEffect, useMemo, useRef, useState } from 'react';

import { searchInBook, type SearchHit } from '@/lib/epub/search';
import { cn } from '@/lib/utils/cn';
import type { EpubRenderer } from '@/lib/epub/renderer';
import styles from './PanelSearch.module.css';

interface Props {
  /** Called at search time (inside an effect/handler) — never during render. */
  getRenderer: () => EpubRenderer | null;
  onJumpTo: (cfi: string) => void;
}

type Status = 'idle' | 'searching' | 'done' | 'cancelled' | 'error';

interface State {
  status: Status;
  hits: SearchHit[];
  query: string;
  error?: string;
}

/**
 * Renderiza o excerpt com o trecho coincidente em destaque sem usar
 * `dangerouslySetInnerHTML`: divide em três pedaços e aplica `<mark>` no meio.
 */
const HitExcerpt: FC<{ hit: SearchHit }> = ({ hit }) => {
  const before = hit.excerpt.slice(0, hit.matchStart);
  const match = hit.excerpt.slice(hit.matchStart, hit.matchEnd);
  const after = hit.excerpt.slice(hit.matchEnd);
  return (
    <>
      …{before}
      <mark className={cn(styles.mark)}>{match}</mark>
      {after}…
    </>
  );
};

export const PanelSearch: FC<Props> = ({ getRenderer, onJumpTo }) => {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>({ status: 'idle', hits: [], query: '' });
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-focus input when panel opens.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Cancel any in-flight search when the panel unmounts (or renderer changes).
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const runSearch = useMemo(
    () =>
      async (q: string): Promise<void> => {
        const trimmed = q.trim();
        const renderer = getRenderer();
        if (trimmed.length < 2 || !renderer) {
          setState({ status: 'idle', hits: [], query: trimmed });
          return;
        }
        // Cancel any ongoing search before starting a new one.
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setState({ status: 'searching', hits: [], query: trimmed });
        try {
          const hits = await searchInBook(renderer.getBook(), {
            query: trimmed,
            signal: controller.signal,
            cfiFor: (i, r) => renderer.cfiFor(i, r),
          });
          if (controller.signal.aborted) {
            setState((s) =>
              s.status === 'searching' ? { ...s, status: 'cancelled' } : s,
            );
            return;
          }
          setState({ status: 'done', hits, query: trimmed });
        } catch (err) {
          if (controller.signal.aborted) {
            setState((s) =>
              s.status === 'searching' ? { ...s, status: 'cancelled' } : s,
            );
            return;
          }
          setState({
            status: 'error',
            hits: [],
            query: trimmed,
            error: err instanceof Error ? err.message : 'Erro a procurar',
          });
        }
      },
    [getRenderer],
  );

  const handleSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    void runSearch(query);
  };

  const cancelSearch = (): void => {
    abortRef.current?.abort();
  };

  return (
    <div className={cn(styles.panel)}>
      <form onSubmit={handleSubmit} className={cn(styles.form)}>
        <input
          ref={inputRef}
          type="search"
          className={cn(styles.input)}
          placeholder="Procurar no livro…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Procurar no livro"
          data-testid="panel-search-input"
        />
        {state.status === 'searching' ? (
          <button
            type="button"
            className={cn(styles.button)}
            onClick={cancelSearch}
            data-testid="panel-search-cancel"
          >
            Cancelar
          </button>
        ) : (
          <button
            type="submit"
            className={cn(styles.button)}
            disabled={query.trim().length < 2}
          >
            Procurar
          </button>
        )}
      </form>

      <div className={cn(styles.status)} aria-live="polite">
        {state.status === 'searching' && (
          <span>A procurar “{state.query}”…</span>
        )}
        {state.status === 'done' && (
          <span>
            {state.hits.length === 0
              ? `Sem resultados para “${state.query}”.`
              : `${state.hits.length} resultado${state.hits.length === 1 ? '' : 's'} para “${state.query}”.`}
          </span>
        )}
        {state.status === 'cancelled' && <span>Procura cancelada.</span>}
        {state.status === 'error' && <span>Erro: {state.error}</span>}
      </div>

      <ul className={cn(styles.results)}>
        {state.hits.map((h, i) => (
          <li key={`${h.cfi}-${i}`}>
            <button
              type="button"
              className={cn(styles.hit)}
              onClick={() => onJumpTo(h.cfi)}
            >
              <HitExcerpt hit={h} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
