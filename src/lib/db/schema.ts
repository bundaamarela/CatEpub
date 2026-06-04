import Dexie, { type Table } from 'dexie';

import type { Backlink } from '@/types/backlink';
import type { Book, ReadingPosition } from '@/types/book';
import type { Bookmark, Note } from '@/types/note';
import type { Embedding } from '@/types/embedding';
import type { Flashcard, ReadingSession } from '@/types/flashcard';
import type { Highlight } from '@/types/highlight';
import type { Preferences } from '@/types/prefs';
import type { SyncQueueItem } from '@/types/sync';

/**
 * Linha persistida no `prefs`: as preferências canónicas + metadados internos
 * usados pelo middleware persist do Zustand.
 *
 * Os campos `_persistVersion` / `_persistEnvelopeKey` ficam fora do tipo
 * `Preferences` para não vazarem para o resto da app.
 */
export interface PreferencesRow extends Preferences {
  _persistVersion?: number;
  _persistEnvelopeKey?: string;
}

export class CatEpubDB extends Dexie {
  books!: Table<Book, string>;
  positions!: Table<ReadingPosition, string>;
  highlights!: Table<Highlight, string>;
  notes!: Table<Note, string>;
  bookmarks!: Table<Bookmark, string>;
  flashcards!: Table<Flashcard, string>;
  sessions!: Table<ReadingSession, string>;
  prefs!: Table<PreferencesRow, 'singleton'>;
  embeddings!: Table<Embedding, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  backlinks!: Table<Backlink, string>;

  constructor(name = 'CatEpub') {
    super(name);
    this.version(1).stores({
      books: 'id, title, author, addedAt, lastReadAt, fileHash',
      positions: 'bookId, updatedAt',
      highlights: 'id, bookId, color, createdAt, *tags',
      notes: 'id, bookId, highlightId, createdAt, *tags',
      bookmarks: 'id, bookId, createdAt',
      flashcards: 'id, bookId, due, state, highlightId',
      sessions: 'id, bookId, startedAt',
      prefs: 'id',
    });
    this.version(2).stores({
      // Adds embeddings table (chunked vectors per book) for RAG.
      embeddings: 'id, bookId',
    });
    this.version(3).stores({
      // Offline sync queue: drained when connectivity returns.
      syncQueue: 'id, table, createdAt',
    });
    this.version(4).stores({
      backlinks: 'id, sourceId, targetId',
    });
  }
}

export const db = new CatEpubDB();
