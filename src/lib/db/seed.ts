import { ulid } from 'ulid';

import type { Book } from '@/types/book';
import { sha256 } from '@/lib/utils/hash';
import * as books from './books';

interface Seed {
  title: string;
  author: string;
  language: string;
  category: string;
  tags: string[];
  description: string;
  spineLength: number;
  estimatedMinutes: number;
  coverHue: number;
}

const SEEDS: readonly Seed[] = [
  {
    title: 'Os Maias',
    author: 'Eça de Queirós',
    language: 'pt',
    category: 'Romance',
    tags: ['clássico', 'século-xix', 'portugal'],
    description: 'Episódio da vida romântica de Carlos da Maia em Lisboa.',
    spineLength: 18,
    estimatedMinutes: 720,
    coverHue: 28,
  },
  {
    title: 'Mensagem',
    author: 'Fernando Pessoa',
    language: 'pt',
    category: 'Poesia',
    tags: ['poesia', 'portugal'],
    description: 'Único livro publicado em vida pelo poeta.',
    spineLength: 8,
    estimatedMinutes: 90,
    coverHue: 200,
  },
  {
    title: 'A Sibila',
    author: 'Agustina Bessa-Luís',
    language: 'pt',
    category: 'Romance',
    tags: ['clássico', 'século-xx', 'portugal'],
    description: 'Crónica familiar entre o real e o sobrenatural.',
    spineLength: 22,
    estimatedMinutes: 480,
    coverHue: 320,
  },
];

/**
 * Popula a base com livros de exemplo. Apenas chama em DEV — o caller decide.
 *
 * Idempotente: se já existirem livros, não faz nada.
 * Cada `fileBlob` é um placeholder de texto único por título (não é um EPUB
 * real); a Fase 4 substitui-os ao importar ficheiros reais.
 */
export const seedBooks = async (): Promise<void> => {
  if ((await books.count()) > 0) return;

  const now = new Date();

  await Promise.all(
    SEEDS.map(async (s, idx) => {
      const placeholder = `SEED:${s.title}`;
      const fileBlob = new Blob([placeholder], { type: 'text/plain' });
      const fileHash = await sha256(placeholder);
      const addedAt = new Date(now.getTime() - idx * 60_000).toISOString();
      const book: Book = {
        id: ulid(),
        title: s.title,
        author: s.author,
        language: s.language,
        fileBlob,
        fileSize: placeholder.length,
        fileHash,
        coverHue: s.coverHue,
        spineLength: s.spineLength,
        category: s.category,
        tags: [...s.tags],
        description: s.description,
        estimatedMinutes: s.estimatedMinutes,
        addedAt,
      };
      await books.add(book);
    }),
  );
};
