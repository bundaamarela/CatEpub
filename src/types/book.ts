import type { EmbeddingStatus } from './embedding';

export interface Book {
  id: string; // ulid
  title: string;
  author: string;
  language?: string;
  publisher?: string;
  publishedAt?: string;
  isbn?: string;
  fileBlob: Blob;
  fileSize: number;
  fileHash: string; // sha-256 hex
  coverBlob?: Blob;
  coverHue: number; // 0–360, fallback se sem capa
  totalCfi?: string;
  spineLength: number;
  category?: string;
  tags: string[];
  rating?: number; // 0–5
  description?: string;
  series?: string;
  volume?: number;
  addedAt: string; // ISO
  lastReadAt?: string;
  finishedAt?: string;
  estimatedMinutes?: number;
  /** Estado da geração de embeddings (RAG). */
  embeddingsStatus?: EmbeddingStatus;
  /** Progresso 0–100 enquanto `embeddingsStatus === 'running'`. */
  embeddingsProgress?: number;
}

export interface ReadingPosition {
  bookId: string; // PK
  cfi: string;
  chapterIndex: number;
  percentage: number; // 0–100
  updatedAt: string;
}
