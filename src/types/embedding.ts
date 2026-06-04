export type EmbeddingStatus = 'pending' | 'running' | 'done' | 'error';

export interface Embedding {
  /** `${bookId}-${chunkIndex}` — unique per book chunk. */
  id: string;
  bookId: string;
  chunkIndex: number;
  /** Original text of the chunk — stored to avoid re-extraction at query time. */
  chunkText: string;
  /** Stored as plain `number[]` so Dexie/IDB can serialize it cleanly. */
  vector: number[];
}
