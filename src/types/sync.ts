export type SyncTable =
  | 'highlights'
  | 'notes'
  | 'bookmarks'
  | 'flashcards'
  | 'positions'
  | 'prefs'
  | 'books_meta';

export type SyncOperation = 'upsert' | 'delete';

export interface SyncQueueItem {
  id: string; // ulid
  table: SyncTable;
  recordId: string;
  operation: SyncOperation;
  /** JSON-serialised row payload (for upsert). For delete, only `recordId` matters. */
  payload: unknown;
  createdAt: string; // ISO
}

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'syncing' }
  | { kind: 'ok'; lastSyncAt: string }
  | { kind: 'error'; message: string };

/** Resultado de uma operação de sync. */
export interface SyncResult {
  pushed: number;
  pulled: number;
  errors: string[];
}
