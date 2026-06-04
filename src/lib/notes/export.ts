import type { Book } from '@/types/book';
import type { Highlight } from '@/types/highlight';

/**
 * Formata uma data ISO em `YYYY-MM-DD` para legibilidade no export. Devolve a
 * string original se não parsear (defensivo).
 */
const fmtDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
};

/**
 * Gera um documento markdown com todos os highlights de um livro. Inclui o
 * título e autor no cabeçalho, e cada highlight em bloco quote com nota,
 * tags e data.
 */
export const exportBookMarkdown = (book: Book, highlights: ReadonlyArray<Highlight>): string => {
  const sorted = [...highlights].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  const lines: string[] = [];
  lines.push(`# ${book.title}`);
  if (book.author) lines.push(`*${book.author}*`);
  lines.push('');

  if (sorted.length === 0) {
    lines.push('_Sem anotações._');
    lines.push('');
    return lines.join('\n');
  }

  for (const h of sorted) {
    const text = h.text.trim().replace(/\n+/g, '\n> ');
    lines.push(`> ${text}`);
    if (h.note !== undefined && h.note.trim().length > 0) {
      lines.push('');
      lines.push(`**Nota:** ${h.note.trim()}`);
    }
    if (h.tags.length > 0) {
      lines.push(`**Tags:** ${h.tags.join(', ')}`);
    }
    lines.push(`**Cor:** ${h.color}  `);
    lines.push(`**Data:** ${fmtDate(h.createdAt)}`);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  return lines.join('\n');
};

/**
 * Trigger de download de uma string como ficheiro. Usado pelos botões de
 * exportação em `/notes`.
 */
export const downloadAsFile = (filename: string, contents: string, mime = 'text/markdown'): void => {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/**
 * Compõe um `Map<bookId, markdown>` para exportar todos os livros que tenham
 * pelo menos um highlight. Usado pelo botão "Exportar tudo".
 */
export const exportAllBooks = (
  books: ReadonlyArray<Book>,
  highlightsByBook: ReadonlyMap<string, ReadonlyArray<Highlight>>,
): Map<string, string> => {
  const out = new Map<string, string>();
  for (const book of books) {
    const list = highlightsByBook.get(book.id) ?? [];
    if (list.length === 0) continue;
    out.set(book.id, exportBookMarkdown(book, list));
  }
  return out;
};
