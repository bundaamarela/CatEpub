import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import { CatEmpty } from '@/components/icons';
import { buildTrailGraph, getTodayTrail } from '@/lib/knowledge/trails';
import { useAllHighlights } from '@/lib/store/highlights';
import { useBooks } from '@/lib/store/library';
import { cn } from '@/lib/utils/cn';
import type { TrailSource, TrailStep } from '@/types/trail';
import styles from './Trails.module.css';

const SOURCE_LABEL: Record<TrailSource, string> = {
  backlink: 'backlink',
  'related-idea': 'ideia relacionada',
  'synthesis-citation': 'síntese',
  'graph-click': 'grafo',
};

const Trails = () => {
  const booksQuery = useBooks();
  const highlightsQuery = useAllHighlights();
  const todayQuery = useQuery({
    queryKey: ['trails', 'today'],
    queryFn: () => getTodayTrail(),
    staleTime: 30_000,
  });
  const graphQuery = useQuery({
    queryKey: ['trails', 'graph'],
    queryFn: () => buildTrailGraph(),
    staleTime: 60_000,
  });

  const bookMap = useMemo(
    () => new Map((booksQuery.data ?? []).map((b) => [b.id, b])),
    [booksQuery.data],
  );

  const highlightMap = useMemo(
    () => new Map((highlightsQuery.data ?? []).map((h) => [h.id, h])),
    [highlightsQuery.data],
  );

  const today: ReadonlyArray<TrailStep> = todayQuery.data ?? [];
  const trailGraph = graphQuery.data ?? { edges: [], totalSteps: 0 };
  const hasAnyData = today.length > 0 || trailGraph.totalSteps > 0;

  const renderTarget = (s: TrailStep): React.ReactNode => {
    if (s.toType === 'book' && s.toBookId !== undefined) {
      const book = bookMap.get(s.toBookId);
      return (
        <Link to={`/reader/${s.toBookId}`} className={cn(styles.bookLink)}>
          {book?.title ?? s.toBookId.slice(0, 8)}
        </Link>
      );
    }
    if (s.toType === 'highlight') {
      const hl = highlightMap.get(s.toId);
      if (hl !== undefined) {
        const book = bookMap.get(hl.bookId);
        return (
          <>
            <Link to={`/reader/${hl.bookId}`} className={cn(styles.bookLink)}>
              {book?.title ?? '—'}
            </Link>{' '}
            — "{hl.text.slice(0, 60)}"
          </>
        );
      }
    }
    return <span>{s.toId.slice(0, 12)}</span>;
  };

  const renderSource = (s: TrailStep): React.ReactNode => {
    if (s.fromType === 'book' && s.fromBookId !== undefined) {
      return bookMap.get(s.fromBookId)?.title ?? '—';
    }
    if (s.fromType === 'highlight') {
      const hl = highlightMap.get(s.fromId);
      if (hl !== undefined) {
        return `"${hl.text.slice(0, 40)}…"`;
      }
    }
    if (s.fromType === 'synthesis') return 'Síntese';
    if (s.fromType === 'note') return 'Nota';
    return s.fromId.slice(0, 8);
  };

  return (
    <section className={cn(styles.page)}>
      <div className={cn(styles.header)}>
        <h1 className={cn(styles.title)}>Trilhos</h1>
        <p className={cn(styles.subtitle)}>
          Como navegas pelo teu conhecimento — ligações seguidas, livros que conduzem a livros.
        </p>
      </div>

      {!hasAnyData ? (
        <div className={cn(styles.empty)}>
          <CatEmpty size={48} />
          <p>
            Os teus trilhos de leitura aparecerão aqui à medida que navegas entre
            ideias. Segue uma citação na síntese, clica num nó do grafo ou abre
            um backlink para registar o primeiro passo.
          </p>
          <Link to="/library" className={cn(styles.bookLink)}>
            Ir para a biblioteca
          </Link>
        </div>
      ) : (
        <>
          <div className={cn(styles.summary)}>
            <span>
              <span className={cn(styles.summaryNum)}>{today.length}</span> passos hoje
            </span>
            <span>
              <span className={cn(styles.summaryNum)}>{trailGraph.totalSteps}</span> total acumulado
            </span>
            <span>
              <span className={cn(styles.summaryNum)}>{trailGraph.edges.length}</span> ligações entre
              livros
            </span>
          </div>

          <div className={cn(styles.section)}>
            <h2 className={cn(styles.sectionTitle)}>Trilho de hoje</h2>
            {today.length === 0 ? (
              <div className={cn(styles.empty)}>
                <CatEmpty size={48} />
                <p>Sem passos registados hoje. Segue uma ligação no grafo, backlink ou citação.</p>
              </div>
            ) : (
              <div className={cn(styles.timeline)}>
                {today.map((s) => (
                  <div key={s.id} className={cn(styles.step)}>
                    <div className={cn(styles.stepTime)}>
                      {new Date(s.timestamp).toLocaleTimeString('pt-PT', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    <div className={cn(styles.stepDetail)}>
                      {renderSource(s)}
                      <span className={cn(styles.arrow)}>→</span>
                      {renderTarget(s)}
                      <span className={cn(styles.stepSource)}>{SOURCE_LABEL[s.source]}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={cn(styles.section)}>
            <h2 className={cn(styles.sectionTitle)}>Mapa de influências</h2>
            {trailGraph.edges.length === 0 ? (
              <div className={cn(styles.empty)}>
                <p>
                  Ainda sem ligações entre livros. À medida que segues ligações, o mapa cresce.
                </p>
              </div>
            ) : (
              <div className={cn(styles.influences)}>
                {trailGraph.edges.slice(0, 20).map((edge) => {
                  const fromBook = bookMap.get(edge.fromBookId);
                  const toBook = bookMap.get(edge.toBookId);
                  return (
                    <div key={`${edge.fromBookId}::${edge.toBookId}`} className={cn(styles.influence)}>
                      <Link to={`/reader/${edge.fromBookId}`} className={cn(styles.bookLink)}>
                        {fromBook?.title ?? edge.fromBookId.slice(0, 8)}
                      </Link>
                      <span className={cn(styles.arrow)}>→</span>
                      <Link to={`/reader/${edge.toBookId}`} className={cn(styles.bookLink)}>
                        {toBook?.title ?? edge.toBookId.slice(0, 8)}
                      </Link>
                      <span className={cn(styles.influenceCount)}>
                        {edge.count} passo{edge.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};

export default Trails;
