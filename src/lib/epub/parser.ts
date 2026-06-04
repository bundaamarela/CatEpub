import { makeBook } from 'foliate-js/view.js';
import type { FoliateBook, FoliateMetadata, FoliateTOCItem } from 'foliate-js/view.js';

/**
 * Versão "achatada" e ergonómica dos metadados de um EPUB. Os campos opcionais
 * são `undefined` quando não estão presentes (`exactOptionalPropertyTypes`-friendly).
 */
export interface EpubMetadata {
  title: string;
  author: string;
  language?: string;
  publisher?: string;
  publishedAt?: string;
  description?: string;
  identifier?: string;
  subjects?: string[];
}

export interface EpubTocEntry {
  label: string;
  href: string;
  subitems?: EpubTocEntry[];
}

export interface ParsedEpub {
  metadata: EpubMetadata;
  toc: EpubTocEntry[];
  spineLength: number;
  coverBlob?: Blob;
  /** O book instance da foliate-js — útil para abrir directamente sem reparsing. */
  book: FoliateBook;
}

/**
 * Resolve um valor que pode ser string, objecto multi-língua ou array para
 * uma única string, em que se prefere `pt-PT/pt`, depois `en`, depois o
 * primeiro disponível.
 */
const flatten = (
  value: string | Record<string, string> | undefined | null,
): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string') return value;
  return value['pt-PT'] ?? value['pt'] ?? value['en'] ?? Object.values(value)[0];
};

const flattenAuthor = (raw: FoliateMetadata['author']): string => {
  if (raw === undefined || raw === null) return 'Desconhecido';
  const list = Array.isArray(raw) ? raw : [raw];
  const names = list
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      return flatten(entry?.name);
    })
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
  return names.length > 0 ? names.join(', ') : 'Desconhecido';
};

const flattenSubjects = (raw: FoliateMetadata['subject']): string[] | undefined => {
  if (raw === undefined || raw === null) return undefined;
  const list = Array.isArray(raw) ? raw : [raw];
  const out = list
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      return flatten(entry?.name);
    })
    .filter((s): s is string => typeof s === 'string' && s.length > 0);
  return out.length > 0 ? out : undefined;
};

const flattenLanguage = (raw: FoliateMetadata['language']): string | undefined => {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) return raw[0];
  return raw;
};

const flattenPublisher = (raw: FoliateMetadata['publisher']): string | undefined => {
  if (raw === undefined || raw === null) return undefined;
  if (typeof raw === 'string') return raw;
  return flatten(raw.name);
};

const mapToc = (items: FoliateTOCItem[] | undefined): EpubTocEntry[] => {
  if (!items) return [];
  return items.map((it) => {
    const entry: EpubTocEntry = { label: it.label, href: it.href };
    if (it.subitems && it.subitems.length > 0) entry.subitems = mapToc(it.subitems);
    return entry;
  });
};

/**
 * Parsa um EPUB (ou outro formato suportado pela foliate-js) e devolve metadados
 * resumidos, TOC, capa (se presente) e a referência ao `book` para abrir já no
 * leitor sem reparsing.
 *
 * Erros propagam-se: o caller deve catch-ar (UI mostra mensagem ao utilizador).
 */
export const parseEpub = async (input: Blob | File): Promise<ParsedEpub> => {
  const book = await makeBook(input);
  const meta = book.metadata ?? {};

  const title = flatten(meta.title) ?? (input instanceof File ? input.name : 'Sem título');
  const author = flattenAuthor(meta.author);

  const metadata: EpubMetadata = { title, author };
  const language = flattenLanguage(meta.language);
  if (language !== undefined) metadata.language = language;
  const publisher = flattenPublisher(meta.publisher);
  if (publisher !== undefined) metadata.publisher = publisher;
  if (typeof meta.published === 'string') metadata.publishedAt = meta.published;
  if (typeof meta.description === 'string') metadata.description = meta.description;
  if (typeof meta.identifier === 'string') metadata.identifier = meta.identifier;
  const subjects = flattenSubjects(meta.subject);
  if (subjects !== undefined) metadata.subjects = subjects;

  let coverBlob: Blob | undefined;
  if (typeof book.getCover === 'function') {
    try {
      const cover = await book.getCover();
      if (cover instanceof Blob && cover.size > 0) coverBlob = cover;
    } catch {
      // capa opcional — silencia
    }
  }

  const parsed: ParsedEpub = {
    metadata,
    toc: mapToc(book.toc),
    spineLength: book.sections?.length ?? 0,
    book,
  };
  if (coverBlob !== undefined) parsed.coverBlob = coverBlob;
  return parsed;
};

/**
 * Abre um EPUB persistido (Blob obtido da DB) e devolve o `book` instance
 * pronto para alimentar o renderer. Não extrai capa nem metadata achatada.
 */
export const openEpubBook = async (blob: Blob): Promise<FoliateBook> => makeBook(blob);
