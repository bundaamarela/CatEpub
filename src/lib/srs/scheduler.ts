import { ulid } from 'ulid';
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade,
} from 'ts-fsrs';

import * as flashcards from '@/lib/db/flashcards';
import * as highlightsDb from '@/lib/db/highlights';
import * as booksDb from '@/lib/db/books';
import { getRelatedIdeas } from '@/lib/knowledge/graph';
import type { Flashcard, FlashcardState } from '@/types/flashcard';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

const RATING_MAP: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

const STATE_TO_STR: Record<State, FlashcardState> = {
  [State.New]: 'new',
  [State.Learning]: 'learning',
  [State.Review]: 'review',
  [State.Relearning]: 'relearning',
};

const STR_TO_STATE: Record<FlashcardState, State> = {
  new: State.New,
  learning: State.Learning,
  review: State.Review,
  relearning: State.Relearning,
};

/** Default FSRS parameters (FSRS-4.5+). */
const params = generatorParameters();
const scheduler = fsrs(params);

interface CreateCardOptions {
  bookId: string;
  front: string;
  back: string;
  highlightId?: string;
  /** Override the "now" date (used in tests). */
  now?: Date;
}

/** Cria um Flashcard inicial pronto a persistir. */
export const createCard = ({
  bookId,
  front,
  back,
  highlightId,
  now,
}: CreateCardOptions): Flashcard => {
  const empty: Card = createEmptyCard(now);
  const card: Flashcard = {
    id: ulid(),
    bookId,
    front,
    back,
    due: empty.due.toISOString(),
    stability: empty.stability,
    difficulty: empty.difficulty,
    elapsed_days: empty.elapsed_days,
    scheduled_days: empty.scheduled_days,
    reps: empty.reps,
    lapses: empty.lapses,
    state: STATE_TO_STR[empty.state],
  };
  if (highlightId !== undefined) card.highlightId = highlightId;
  return card;
};

const flashcardToCard = (card: Flashcard): Card => ({
  due: new Date(card.due),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsed_days: card.elapsed_days,
  scheduled_days: card.scheduled_days,
  learning_steps: 0,
  reps: card.reps,
  lapses: card.lapses,
  state: STR_TO_STATE[card.state],
  ...(card.last_review !== undefined ? { last_review: new Date(card.last_review) } : {}),
});

/**
 * Aplica um rating de revisão ao card e devolve o novo estado FSRS.
 * Função pura — não escreve na DB. O chamador é responsável por persistir.
 */
export const scheduleCard = (
  card: Flashcard,
  rating: ReviewRating,
  now: Date = new Date(),
): Flashcard => {
  const result = scheduler.next(flashcardToCard(card), now, RATING_MAP[rating]);
  const next = result.card;
  const updated: Flashcard = {
    ...card,
    due: next.due.toISOString(),
    stability: next.stability,
    difficulty: next.difficulty,
    elapsed_days: next.elapsed_days,
    scheduled_days: next.scheduled_days,
    reps: next.reps,
    lapses: next.lapses,
    state: STATE_TO_STR[next.state],
    last_review: (next.last_review ?? now).toISOString(),
  };
  return updated;
};

/** Cards 'due' antes de `now` (default: agora), opcionalmente filtrados por livro. */
export const getDueCards = async (
  bookId?: string,
  now: Date = new Date(),
): Promise<Flashcard[]> => {
  const due = await flashcards.getDue(now);
  if (bookId === undefined) return due;
  return due.filter((c) => c.bookId === bookId);
};

/** Contagem total de cards 'due' (em todos os livros). */
export const getDueCount = async (now: Date = new Date()): Promise<number> =>
  flashcards.countDue(now);

/**
 * Returns the main flashcard for a highlight plus up to 3 flashcards from
 * semantically-related highlights in other books (uses graph.ts under the hood).
 * The main card is always at index 0; related cards follow. Limited to 4 total.
 */
export const getDueCluster = async (highlightId: string): Promise<Flashcard[]> => {
  const mainCards = await flashcards.getByHighlight(highlightId);
  if (mainCards.length === 0) return [];
  const mainCard = mainCards[0];
  if (mainCard === undefined) return [];

  const allHighlights = await highlightsDb.getAll();
  const allBooks = await booksDb.getAll();
  const related = await getRelatedIdeas(highlightId, allHighlights, allBooks, 3);

  const cluster: Flashcard[] = [mainCard];
  for (const r of related) {
    const cards = await flashcards.getByHighlight(r.highlight.id);
    if (cards.length === 0) continue;
    const card = cards[0];
    if (card !== undefined) cluster.push(card);
    if (cluster.length >= 4) break;
  }

  return cluster;
};
