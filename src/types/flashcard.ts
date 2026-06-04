export type FlashcardState = 'new' | 'learning' | 'review' | 'relearning';

export interface Flashcard {
  id: string;
  bookId: string;
  highlightId?: string;
  front: string;
  back: string;
  // Estado FSRS
  due: string; // ISO
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  reps: number;
  lapses: number;
  state: FlashcardState;
  last_review?: string;
}

export interface ReadingSession {
  id: string;
  bookId: string;
  startCfi: string;
  endCfi?: string;
  startedAt: string;
  endedAt?: string;
  pagesRead: number;
  wordsRead?: number;
  fixationCount?: number;
}
