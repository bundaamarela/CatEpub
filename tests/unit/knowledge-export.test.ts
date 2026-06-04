import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { toSlug } from '@/lib/knowledge/export';

vi.mock('@/lib/db/books', () => ({
  getAll: vi.fn(),
}));
vi.mock('@/lib/db/notes', () => ({
  getAll: vi.fn(),
}));
vi.mock('@/lib/db/highlights', () => ({
  getAll: vi.fn(),
}));
vi.mock('@/lib/db/flashcards', () => ({
  getAll: vi.fn(),
}));

import * as booksDb from '@/lib/db/books';
import * as flashcardsDb from '@/lib/db/flashcards';
import * as highlightsDb from '@/lib/db/highlights';
import * as notesDb from '@/lib/db/notes';
import { exportArsenal, type ExportManifest } from '@/lib/knowledge/export';
import type { Book } from '@/types/book';
import type { Flashcard } from '@/types/flashcard';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';

const makeBook = (overrides: Partial<Book> = {}): Book => ({
  id: 'b-1',
  title: 'O Livro',
  author: 'A. Autor',
  fileBlob: new Blob(['fake-epub-content']),
  fileSize: 17,
  fileHash: 'abc123',
  coverHue: 200,
  spineLength: 10,
  tags: ['ficção'],
  addedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeHighlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  id: 'h-1',
  bookId: 'b-1',
  cfiRange: 'epubcfi(/6/4!/4/2)',
  text: 'texto destacado',
  color: 'yellow',
  tags: [],
  createdAt: '2026-01-01T10:00:00.000Z',
  updatedAt: '2026-01-01T10:00:00.000Z',
  ...overrides,
});

const makeNote = (overrides: Partial<Note> = {}): Note => ({
  id: 'n-1',
  bookId: 'b-1',
  highlightId: 'h-1',
  body: 'Nota de teste.',
  tags: ['tag-a'],
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-01T12:00:00.000Z',
  ...overrides,
});

const makeFlashcard = (overrides: Partial<Flashcard> = {}): Flashcard => ({
  id: 'fc-1',
  bookId: 'b-1',
  highlightId: 'h-1',
  front: 'Pergunta?',
  back: 'Resposta.',
  state: 0 as Flashcard['state'],
  due: '2026-01-02T00:00:00.000Z',
  stability: 0,
  difficulty: 0,
  elapsedDays: 0,
  scheduledDays: 0,
  reps: 0,
  lapses: 0,
  lastReview: null,
  ...overrides,
});

const setupMocks = (
  books: Book[],
  notes: Note[],
  highlights: Highlight[],
  flashcards: Flashcard[],
): void => {
  vi.mocked(booksDb.getAll).mockResolvedValue(books);
  vi.mocked(notesDb.getAll).mockResolvedValue(notes);
  vi.mocked(highlightsDb.getAll).mockResolvedValue(highlights);
  vi.mocked(flashcardsDb.getAll).mockResolvedValue(flashcards);
};

describe('toSlug', () => {
  it('strips illegal filesystem characters', () => {
    expect(toSlug('A/B\\C:D*E?F"G<H>I|J')).toBe('ABCDEFGHIJ');
  });

  it('collapses whitespace into hyphens', () => {
    expect(toSlug('The  Great   Book')).toBe('The-Great-Book');
  });

  it('truncates at 80 chars', () => {
    const long = 'A'.repeat(100);
    expect(toSlug(long).length).toBe(80);
  });

  it('returns "untitled" for empty/illegal-only input', () => {
    expect(toSlug('???')).toBe('untitled');
    expect(toSlug('')).toBe('untitled');
  });
});

describe('exportArsenal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates ZIP with correct folder structure', async () => {
    const book = makeBook();
    const highlight = makeHighlight();
    const note = makeNote();
    const flashcard = makeFlashcard();
    setupMocks([book], [note], [highlight], [flashcard]);

    const blob = await exportArsenal({ includeEpubs: false });
    const zip = await JSZip.loadAsync(blob);

    expect(zip.file('manifest.json')).not.toBeNull();
    expect(zip.file('books.json')).not.toBeNull();
    expect(zip.file('highlights.json')).not.toBeNull();
    expect(zip.file('flashcards.json')).not.toBeNull();
    expect(zip.file('notes/O-Livro/n-1.md')).not.toBeNull();
  });

  it('includes EPUB files when includeEpubs is true', async () => {
    setupMocks([makeBook()], [], [makeHighlight()], []);

    const blob = await exportArsenal({ includeEpubs: true });
    const zip = await JSZip.loadAsync(blob);

    expect(zip.file('epubs/O-Livro.epub')).not.toBeNull();
  });

  it('omits EPUB files when includeEpubs is false', async () => {
    setupMocks([makeBook()], [], [], []);

    const blob = await exportArsenal({ includeEpubs: false });
    const zip = await JSZip.loadAsync(blob);

    expect(zip.folder('epubs')?.file(/./)?.length ?? 0).toBe(0);
  });

  it('manifest has schemaVersion, exportedAt, and counts', async () => {
    setupMocks([makeBook()], [makeNote()], [makeHighlight()], [makeFlashcard()]);

    const blob = await exportArsenal({ includeEpubs: false });
    const zip = await JSZip.loadAsync(blob);
    const raw = await zip.file('manifest.json')?.async('string');
    expect(raw).toBeDefined();
    const manifest = JSON.parse(raw as string) as ExportManifest;

    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.exportedAt).toBeTruthy();
    expect(new Date(manifest.exportedAt).getTime()).not.toBeNaN();
    expect(manifest.counts).toEqual({
      books: 1,
      notes: 1,
      highlights: 1,
      flashcards: 1,
    });
  });

  it('books.json does not contain fileBlob or coverBlob', async () => {
    setupMocks([makeBook({ coverBlob: new Blob(['cover']) })], [], [], []);

    const blob = await exportArsenal({ includeEpubs: false });
    const zip = await JSZip.loadAsync(blob);
    const raw = await zip.file('books.json')?.async('string');
    expect(raw).toBeDefined();

    expect(raw).not.toContain('fileBlob');
    expect(raw).not.toContain('coverBlob');
  });

  it('notes are valid markdown with frontmatter', async () => {
    setupMocks([makeBook()], [makeNote()], [makeHighlight()], []);

    const blob = await exportArsenal({ includeEpubs: false });
    const zip = await JSZip.loadAsync(blob);
    const md = await zip.file('notes/O-Livro/n-1.md')?.async('string');
    expect(md).toBeDefined();
    expect(md).toMatch(/^---\n/);
    expect(md).toContain('id: n-1');
    expect(md).toContain('Nota de teste.');
  });

  it('deduplicates slugs for books with the same title', async () => {
    const book1 = makeBook({ id: 'b-1', title: 'Duplicado' });
    const book2 = makeBook({ id: 'b-2', title: 'Duplicado' });
    const note1 = makeNote({ id: 'n-1', bookId: 'b-1' });
    const note2 = makeNote({ id: 'n-2', bookId: 'b-2' });
    setupMocks([book1, book2], [note1, note2], [makeHighlight()], []);

    const blob = await exportArsenal({ includeEpubs: false });
    const zip = await JSZip.loadAsync(blob);

    expect(zip.file('notes/Duplicado/n-1.md')).not.toBeNull();
    expect(zip.file('notes/Duplicado-1/n-2.md')).not.toBeNull();
  });

  it('calls onProgress callback', async () => {
    setupMocks([makeBook()], [], [], []);
    const progress: number[] = [];

    await exportArsenal({ includeEpubs: false, onProgress: (p) => progress.push(p) });

    expect(progress.length).toBeGreaterThan(0);
    expect(progress[progress.length - 1]).toBe(100);
  });

  it('highlights.json and flashcards.json are parseable', async () => {
    setupMocks([makeBook()], [], [makeHighlight()], [makeFlashcard()]);

    const blob = await exportArsenal({ includeEpubs: false });
    const zip = await JSZip.loadAsync(blob);

    const hRaw = await zip.file('highlights.json')?.async('string');
    const highlights = JSON.parse(hRaw as string) as Highlight[];
    expect(highlights).toHaveLength(1);
    expect(highlights[0]?.id).toBe('h-1');

    const fRaw = await zip.file('flashcards.json')?.async('string');
    const flashcards = JSON.parse(fRaw as string) as Flashcard[];
    expect(flashcards).toHaveLength(1);
    expect(flashcards[0]?.id).toBe('fc-1');
  });
});
