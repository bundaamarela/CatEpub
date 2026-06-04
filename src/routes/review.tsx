import { type FC, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ulid } from 'ulid';

import { CatEmpty } from '@/components/icons';
import * as books from '@/lib/db/books';
import * as flashcardsDb from '@/lib/db/flashcards';
import * as highlightsDb from '@/lib/db/highlights';
import * as notesDb from '@/lib/db/notes';
import { refreshBacklinksForSource } from '@/lib/knowledge/persist-backlinks';
import { getDueCards, getDueCluster, scheduleCard, type ReviewRating } from '@/lib/srs/scheduler';
import { cn } from '@/lib/utils/cn';
import type { Flashcard } from '@/types/flashcard';
import type { Note } from '@/types/note';
import styles from './Review.module.css';

const RATINGS: ReadonlyArray<{ id: ReviewRating; label: string; hint: string }> = [
  { id: 'again', label: 'Outra vez', hint: 'Esqueci' },
  { id: 'hard', label: 'Difícil', hint: 'Custou' },
  { id: 'good', label: 'Bom', hint: 'Lembrei' },
  { id: 'easy', label: 'Fácil', hint: 'Imediato' },
];

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-PT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const Review: FC = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<Flashcard[] | null>(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [bookTitles, setBookTitles] = useState<Record<string, string>>({});
  const [nextDueAt, setNextDueAt] = useState<string | null>(null);
  const [connectedMode, setConnectedMode] = useState(false);
  const [clusterIds, setClusterIds] = useState<string[] | null>(null);
  const [clusterStart, setClusterStart] = useState<number | null>(null);
  const [showSynthesisPrompt, setShowSynthesisPrompt] = useState(false);
  const [synthesisDraft, setSynthesisDraft] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const due = await getDueCards();
      if (cancelled) return;
      setQueue(due);
      setIndex(0);
      setRevealed(false);

      const ids = Array.from(new Set(due.map((c) => c.bookId)));
      const titles: Record<string, string> = {};
      await Promise.all(
        ids.map(async (id) => {
          const b = await books.getById(id);
          if (b) titles[id] = b.title;
        }),
      );
      if (!cancelled) setBookTitles(titles);

      if (due.length === 0) {
        const all = await flashcardsDb.getAll();
        if (cancelled) return;
        const future = all
          .map((c) => c.due)
          .filter((d) => new Date(d).getTime() > Date.now())
          .sort();
        setNextDueAt(future[0] ?? null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const current = queue && index < queue.length ? (queue[index] ?? null) : null;

  const inCluster = clusterIds !== null && clusterStart !== null;
  const clusterPosition =
    clusterIds !== null && current !== null ? clusterIds.indexOf(current.id) : -1;

  const expandIntoCluster = useCallback(
    async (card: Flashcard): Promise<void> => {
      if (!connectedMode || card.highlightId === undefined) return;
      if (clusterIds !== null && clusterIds.includes(card.id)) return;

      const cluster = await getDueCluster(card.highlightId);
      if (cluster.length <= 1) return;

      const relatedCards = cluster.slice(1);
      setQueue((prev) => {
        if (prev === null) return prev;
        const next = [...prev];
        const insertAt = index + 1;
        const existingIds = new Set(prev.map((c) => c.id));
        const toInsert = relatedCards.filter((c) => !existingIds.has(c.id));
        next.splice(insertAt, 0, ...toInsert);
        return next;
      });
      setClusterIds([card.id, ...relatedCards.map((c) => c.id)]);
      setClusterStart(index);

      const newBookIds = relatedCards.map((c) => c.bookId);
      const missing = newBookIds.filter((id) => !(id in bookTitles));
      if (missing.length > 0) {
        const titles: Record<string, string> = {};
        await Promise.all(
          missing.map(async (id) => {
            const b = await books.getById(id);
            if (b) titles[id] = b.title;
          }),
        );
        setBookTitles((prev) => ({ ...prev, ...titles }));
      }
    },
    [connectedMode, clusterIds, index, bookTitles],
  );

  useEffect(() => {
    if (current === null || !connectedMode) return;
    if (clusterIds !== null) return;
    const cardToExpand = current;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      void expandIntoCluster(cardToExpand);
    });
    return () => {
      cancelled = true;
    };
  }, [current, connectedMode, clusterIds, expandIntoCluster]);

  const submitSynthesisNote = useCallback(async (): Promise<void> => {
    if (synthesisDraft.trim().length === 0 || clusterIds === null) return;

    const reviewedHighlightIds: string[] = [];
    for (const cardId of clusterIds) {
      const card = await flashcardsDb.getById(cardId);
      if (card?.highlightId !== undefined) reviewedHighlightIds.push(card.highlightId);
    }

    const wikiLinks: string[] = [];
    for (const hid of reviewedHighlightIds) {
      const h = await highlightsDb.getById(hid);
      if (h !== undefined) wikiLinks.push(`[[${h.text.slice(0, 60)}]]`);
    }

    const now = new Date().toISOString();
    const body = `${synthesisDraft.trim()}\n\n---\n\nLigações revistas:\n${wikiLinks.join('\n')}`;

    const firstCard = clusterIds[0] !== undefined ? await flashcardsDb.getById(clusterIds[0]) : null;
    const bookId = firstCard?.bookId ?? '';

    const note: Note = {
      id: ulid(),
      bookId,
      title: `Síntese de cluster — ${new Date().toLocaleDateString('pt-PT')}`,
      body,
      tags: ['síntese', 'cluster-review'],
      createdAt: now,
      updatedAt: now,
    };
    await notesDb.add(note);
    await refreshBacklinksForSource(note.id, body);

    setSynthesisDraft('');
    setShowSynthesisPrompt(false);
    setClusterIds(null);
    setClusterStart(null);
    setIndex((i) => i + 1);
  }, [synthesisDraft, clusterIds]);

  const handleRate = useCallback(
    async (rating: ReviewRating): Promise<void> => {
      if (!current) return;
      const updated = scheduleCard(current, rating);
      await flashcardsDb.update(updated.id, updated);
      setRevealed(false);

      const nextIndex = index + 1;
      const nextCard =
        queue !== null && nextIndex < queue.length ? (queue[nextIndex] ?? null) : null;
      const leavingCluster =
        clusterIds !== null &&
        clusterPosition === clusterIds.length - 1 &&
        (nextCard === null || !clusterIds.includes(nextCard.id));

      if (leavingCluster) {
        setShowSynthesisPrompt(true);
      } else {
        setIndex(nextIndex);
      }
    },
    [current, index, queue, clusterIds, clusterPosition],
  );

  const skipSynthesis = useCallback(() => {
    setShowSynthesisPrompt(false);
    setClusterIds(null);
    setClusterStart(null);
    setIndex((i) => i + 1);
  }, []);

  const handleOpenInBook = useCallback(async (): Promise<void> => {
    if (!current?.highlightId) {
      if (current) navigate(`/reader/${current.bookId}`);
      return;
    }
    const h = await highlightsDb.getById(current.highlightId);
    if (!h) {
      navigate(`/reader/${current.bookId}`);
      return;
    }
    navigate(`/reader/${current.bookId}`, { state: { cfi: h.cfiRange } });
  }, [current, navigate]);

  const totalCount = queue?.length ?? 0;
  const progress = useMemo(() => {
    if (!queue || queue.length === 0) return 0;
    return Math.min(100, Math.round((index / queue.length) * 100));
  }, [queue, index]);

  if (queue === null) {
    return (
      <section className={cn(styles.page)}>
        <h1 className={cn(styles.title)}>Revisão</h1>
        <p className={cn(styles.loading)}>A carregar cards…</p>
      </section>
    );
  }

  if (queue.length === 0) {
    return (
      <section className={cn(styles.page)}>
        <h1 className={cn(styles.title)}>Revisão</h1>
        <div className={cn(styles.empty)}>
          <CatEmpty size={120} />
          <h2 className={cn(styles.emptyTitle)}>Nada para hoje</h2>
          <p className={cn(styles.emptySub)}>
            {nextDueAt
              ? `Próxima revisão: ${formatDate(nextDueAt)}.`
              : 'Cria flashcards a partir dos teus highlights para começar.'}
          </p>
          <Link to="/library" className={cn(styles.action)}>
            Ir para a biblioteca
          </Link>
        </div>
      </section>
    );
  }

  if (!current) {
    return (
      <section className={cn(styles.page)}>
        <h1 className={cn(styles.title)}>Revisão</h1>
        <div className={cn(styles.empty)}>
          <CatEmpty size={120} />
          <h2 className={cn(styles.emptyTitle)}>Sessão completa</h2>
          <p className={cn(styles.emptySub)}>
            Reviste {totalCount} {totalCount === 1 ? 'card' : 'cards'}.
          </p>
          <Link to="/" className={cn(styles.action)}>
            Voltar ao início
          </Link>
        </div>
      </section>
    );
  }

  const bookTitle = bookTitles[current.bookId] ?? '—';

  return (
    <section className={cn(styles.page)}>
      <header className={cn(styles.header)}>
        <h1 className={cn(styles.title)}>Revisão</h1>
        <div className={cn(styles.headerRight)}>
          <label className={cn(styles.modeToggle)}>
            <input
              type="checkbox"
              checked={connectedMode}
              onChange={(e) => setConnectedMode(e.target.checked)}
            />
            <span>Modo conectado</span>
          </label>
          <span className={cn(styles.counter)}>
            {index + 1} / {totalCount}
          </span>
        </div>
      </header>

      {inCluster && !showSynthesisPrompt && (
        <div className={cn(styles.clusterBanner)}>
          Cluster: {clusterPosition + 1} de {clusterIds!.length}
        </div>
      )}

      <div className={cn(styles.progressTrack)} aria-hidden>
        <div className={cn(styles.progressFill)} style={{ width: `${progress}%` }} />
      </div>

      <article className={cn(styles.card)}>
        <div className={cn(styles.cardMeta)}>
          <span className={cn(styles.cardBook)}>{bookTitle}</span>
          <button
            type="button"
            className={cn(styles.linkButton)}
            onClick={() => void handleOpenInBook()}
          >
            Ver no livro
          </button>
        </div>

        <div className={cn(styles.cardFront)}>{current.front}</div>

        {revealed ? (
          <div className={cn(styles.cardBack)}>{current.back}</div>
        ) : (
          <button
            type="button"
            className={cn(styles.revealButton)}
            onClick={() => setRevealed(true)}
            data-testid="reveal-button"
          >
            Mostrar resposta
          </button>
        )}
      </article>

      {revealed && !showSynthesisPrompt && (
        <div className={cn(styles.ratings)} data-testid="rating-bar">
          {RATINGS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={cn(styles.ratingButton, styles[`rating-${r.id}` as const])}
              onClick={() => void handleRate(r.id)}
              data-testid={`rating-${r.id}`}
            >
              <span className={cn(styles.ratingLabel)}>{r.label}</span>
              <span className={cn(styles.ratingHint)}>{r.hint}</span>
            </button>
          ))}
        </div>
      )}

      {showSynthesisPrompt && (
        <div className={cn(styles.synthesisPrompt)} data-testid="synthesis-prompt">
          <h3 className={cn(styles.synthesisTitle)}>Como estas ideias se relacionam?</h3>
          <p className={cn(styles.synthesisHint)}>
            Escreve uma frase que ligue os cards que acabaste de rever. Cria uma nota com
            backlinks automáticos.
          </p>
          <textarea
            className={cn(styles.synthesisTextarea)}
            value={synthesisDraft}
            onChange={(e) => setSynthesisDraft(e.target.value)}
            placeholder="A relação entre estas ideias é…"
            autoFocus
          />
          <div className={cn(styles.synthesisActions)}>
            <button
              type="button"
              className={cn(styles.synthesisSubmit)}
              onClick={() => void submitSynthesisNote()}
              disabled={synthesisDraft.trim().length === 0}
            >
              Guardar síntese
            </button>
            <button type="button" className={cn(styles.synthesisSkip)} onClick={skipSynthesis}>
              Saltar
            </button>
          </div>
        </div>
      )}

    </section>
  );
};

export default Review;
