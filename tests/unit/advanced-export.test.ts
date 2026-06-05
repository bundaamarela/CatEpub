import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/db/books', () => ({ getAll: vi.fn() }));
vi.mock('@/lib/db/notes', () => ({ getAll: vi.fn() }));
vi.mock('@/lib/db/highlights', () => ({ getAll: vi.fn() }));
vi.mock('@/lib/db/flashcards', () => ({ getAll: vi.fn() }));
vi.mock('@/lib/db/backlinks', () => ({ getAll: vi.fn() }));
vi.mock('@/lib/knowledge/graph', () => ({ buildSemanticEdges: vi.fn() }));

import * as booksDb from '@/lib/db/books';
import * as flashcardsDb from '@/lib/db/flashcards';
import * as highlightsDb from '@/lib/db/highlights';
import * as notesDb from '@/lib/db/notes';
import * as backlinksDb from '@/lib/db/backlinks';
import { buildSemanticEdges } from '@/lib/knowledge/graph';
import {
  CSV_BOM,
  CSV_HEADER,
  exportHighlightsCsv,
  exportToAnki,
  exportToObsidian,
} from '@/lib/knowledge/export';
import type { Book } from '@/types/book';
import type { Flashcard } from '@/types/flashcard';
import type { Highlight } from '@/types/highlight';
import type { Note } from '@/types/note';

const book = (overrides: Partial<Book> = {}): Book => ({
  id: 'b-1',
  title: 'A Sibila',
  author: 'Agustina Bessa-Luís',
  fileBlob: new Blob(['epub']),
  fileSize: 4,
  fileHash: 'h',
  coverHue: 200,
  spineLength: 1,
  tags: [],
  addedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const highlight = (overrides: Partial<Highlight> = {}): Highlight => ({
  id: 'h-1',
  bookId: 'b-1',
  cfiRange: 'cfi-x',
  text: 'Texto destacado',
  color: 'yellow',
  tags: [],
  createdAt: '2026-01-02T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
  ...overrides,
});

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'n-1',
  bookId: 'b-1',
  highlightId: 'h-1',
  body: 'Reflexão livre.',
  tags: ['estética'],
  createdAt: '2026-01-03T00:00:00.000Z',
  updatedAt: '2026-01-03T00:00:00.000Z',
  ...overrides,
});

const flashcard = (overrides: Partial<Flashcard> = {}): Flashcard => ({
  id: 'fc-1',
  bookId: 'b-1',
  highlightId: 'h-1',
  front: 'Pergunta?',
  back: 'Resposta.',
  state: 'new',
  due: '2026-01-04T00:00:00.000Z',
  stability: 0,
  difficulty: 0,
  elapsed_days: 0,
  scheduled_days: 0,
  reps: 0,
  lapses: 0,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(buildSemanticEdges).mockResolvedValue([]);
  vi.mocked(backlinksDb.getAll).mockResolvedValue([]);
});

describe('exportToObsidian', () => {
  it('produces a ZIP with notes/{slug}/{id}.md and _index.md per book', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(notesDb.getAll).mockResolvedValue([note()]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([highlight()]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([]);

    const blob = await exportToObsidian();
    const zip = await JSZip.loadAsync(blob);

    expect(zip.file('notes/A-Sibila/n-1.md')).not.toBeNull();
    expect(zip.file('notes/A-Sibila/_index.md')).not.toBeNull();
    expect(zip.file('graph-data.json')).not.toBeNull();
    expect(zip.file('manifest.json')).not.toBeNull();
  });

  it('writes Obsidian-style YAML frontmatter (--- delimiters)', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(notesDb.getAll).mockResolvedValue([note()]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([highlight()]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([]);

    const blob = await exportToObsidian();
    const zip = await JSZip.loadAsync(blob);
    const md = (await zip.file('notes/A-Sibila/n-1.md')?.async('string')) ?? '';

    expect(md).toMatch(/^---\n/);
    expect(md).toContain('id: n-1');
    expect(md).toContain('book: A Sibila');
    expect(md).toContain('tags: [estética]');
    expect(md.split('---').length).toBeGreaterThanOrEqual(3);
  });

  it('rewrites [[X]] tokens — known notes become [[note title]], books become [[slug/_index]]', async () => {
    const n1 = note({ id: 'n-1', title: 'Conceito A', body: 'Ver [[Conceito B]] e [[A Sibila]] e [[Desconhecido]].' });
    const n2 = note({ id: 'n-2', title: 'Conceito B', body: 'outra nota' });
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(notesDb.getAll).mockResolvedValue([n1, n2]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([highlight()]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([]);

    const blob = await exportToObsidian();
    const zip = await JSZip.loadAsync(blob);
    const md = (await zip.file('notes/A-Sibila/n-1.md')?.async('string')) ?? '';

    expect(md).toContain('[[Conceito B]]');
    expect(md).toContain('[[A-Sibila/_index]]');
    expect(md).toContain('[[Desconhecido]]');
  });

  it('embeds graph-data.json with edges from buildSemanticEdges', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book(), book({ id: 'b-2', title: 'Outro' })]);
    vi.mocked(notesDb.getAll).mockResolvedValue([]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([
      highlight({ id: 'h-1', bookId: 'b-1' }),
      highlight({ id: 'h-2', bookId: 'b-2' }),
    ]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([]);
    vi.mocked(buildSemanticEdges).mockResolvedValue([
      {
        sourceId: 'h-1',
        targetId: 'h-2',
        similarity: 0.83,
        sourceBookId: 'b-1',
        targetBookId: 'b-2',
      },
    ]);

    const blob = await exportToObsidian();
    const zip = await JSZip.loadAsync(blob);
    const raw = (await zip.file('graph-data.json')?.async('string')) ?? '';
    const data = JSON.parse(raw) as { nodes: unknown[]; edges: unknown[] };

    expect(data.edges).toHaveLength(1);
    expect(data.nodes).toHaveLength(2);
  });

  it('renders backlinks section "Referenciado por" when present', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(notesDb.getAll).mockResolvedValue([
      note({ id: 'n-1', title: 'Alvo' }),
      note({ id: 'n-2', title: 'Fonte' }),
    ]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([highlight()]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([]);
    vi.mocked(backlinksDb.getAll).mockResolvedValue([
      {
        id: 'bl-1',
        sourceId: 'n-2',
        targetId: 'n-1',
        targetType: 'note',
        createdAt: '2026-01-04T00:00:00.000Z',
      },
    ]);

    const blob = await exportToObsidian();
    const zip = await JSZip.loadAsync(blob);
    const md = (await zip.file('notes/A-Sibila/n-1.md')?.async('string')) ?? '';

    expect(md).toContain('## Referenciado por');
    expect(md).toContain('[[Fonte]]');
  });
});

describe('exportToAnki', () => {
  it('produces TSV with front\\tback\\ttags per card', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([highlight({ semanticTag: 'argue' })]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([flashcard()]);

    const blob = await exportToAnki('Filosofia');
    const text = await blob.text();

    const lines = text.split('\n').filter((l) => !l.startsWith('#') && l.length > 0);
    expect(lines).toHaveLength(1);
    const cols = lines[0]!.split('\t');
    expect(cols).toHaveLength(3);
    expect(cols[0]).toBe('Pergunta?');
    expect(cols[1]).toBe('Resposta.');
  });

  it('tags follow cat-epub::deck / book / semantic / tag::X format', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([
      highlight({ semanticTag: 'argue', tags: ['estoicismo'] }),
    ]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([flashcard()]);

    const blob = await exportToAnki('Filosofia Antiga');
    const text = await blob.text();
    const dataLine = text.split('\n').find((l) => !l.startsWith('#') && l.includes('\t'));
    const tags = dataLine?.split('\t')[2] ?? '';

    expect(tags).toContain('cat-epub::Filosofia-Antiga');
    expect(tags).toContain('cat-epub::book::A-Sibila');
    expect(tags).toContain('cat-epub::semantic::argue');
    expect(tags).toContain('cat-epub::tag::estoicismo');
  });

  it('includes header comments explaining the import format', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([]);

    const blob = await exportToAnki('Test');
    const text = await blob.text();

    expect(text).toMatch(/^# Cat Epub → Anki/);
    expect(text).toContain('Tab-separated');
    expect(text).toContain('Allow HTML in fields');
  });

  it('escapes embedded tabs and newlines so the TSV stays well-formed', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([highlight()]);
    vi.mocked(flashcardsDb.getAll).mockResolvedValue([
      flashcard({ front: 'multi\nlinha\tcom\ttab', back: 'resposta\nnova' }),
    ]);

    const blob = await exportToAnki('T');
    const text = await blob.text();
    const dataLine = text.split('\n').find((l) => !l.startsWith('#') && l.includes('\t'));

    expect(dataLine?.split('\t')).toHaveLength(3);
    expect(dataLine).toContain('multi<br>linha');
    expect(dataLine).not.toContain('multi\nlinha');
  });
});

describe('exportHighlightsCsv', () => {
  it('starts with a UTF-8 BOM (Excel compatibility)', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([highlight()]);

    const blob = await exportHighlightsCsv();
    // Blob.text() consumes the BOM via TextDecoder defaults — read raw bytes
    // instead so we can assert the EF BB BF prefix that Excel needs.
    const bytes = new Uint8Array(await blob.arrayBuffer());

    expect(bytes[0]).toBe(0xef);
    expect(bytes[1]).toBe(0xbb);
    expect(bytes[2]).toBe(0xbf);
    expect(CSV_BOM.charCodeAt(0)).toBe(0xfeff);
  });

  it('has exactly 8 columns matching CSV_HEADER', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([highlight()]);

    const blob = await exportHighlightsCsv();
    const text = await blob.text();
    // Blob.text() already strips the leading U+FEFF BOM, so no need to slice.
    const lines = text.split('\r\n').filter((l) => l.length > 0);

    expect(lines[0]).toBe(CSV_HEADER.join(','));
    expect(CSV_HEADER).toHaveLength(8);

    // Data line should split into exactly 8 fields.
    const fields = lines[1]!.split(',');
    expect(fields).toHaveLength(8);
  });

  it('escapes quotes, commas and newlines per CSV rules', async () => {
    vi.mocked(booksDb.getAll).mockResolvedValue([book()]);
    vi.mocked(highlightsDb.getAll).mockResolvedValue([
      highlight({ text: 'tem "aspas", vírgulas e\nnova linha' }),
    ]);

    const blob = await exportHighlightsCsv();
    const text = await blob.text();

    expect(text).toContain('"tem ""aspas"", vírgulas e\nnova linha"');
  });
});
