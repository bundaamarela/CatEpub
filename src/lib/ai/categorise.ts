import { generateText, isAiEnabled } from './client';

export const BOOK_CATEGORIES = [
  'Romance',
  'Ficção Científica',
  'Não-Ficção',
  'Filosofia',
  'História',
  'Direito',
  'Ciência',
  'Arte',
  'Poesia',
  'Outro',
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export interface CategoriseSuggestion {
  category: BookCategory;
  tags: string[];
  language: string;
}

const SYSTEM = 'You are a book categorisation assistant. Respond with valid JSON only.';

const buildPrompt = (title: string, author: string, description: string): string =>
  `Categorise this book. Return JSON only: { "category": string, "tags": string[], "language": string }.
Category must be one of: ${BOOK_CATEGORIES.join(', ')}.
Tags: max 5, lowercase, no accents.

Title: ${title}
Author: ${author}
Description: ${description.slice(0, 200)}`;

export const categoriseBook = async (
  title: string,
  author: string,
  description?: string,
): Promise<CategoriseSuggestion | null> => {
  if (!isAiEnabled()) return null;

  const text = await generateText({
    system: SYSTEM,
    prompt: buildPrompt(title, author, description ?? ''),
    maxTokens: 256,
  });
  if (text === null) return null;

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch === null) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    if (typeof parsed.category !== 'string') return null;

    const category = BOOK_CATEGORIES.includes(parsed.category as BookCategory)
      ? (parsed.category as BookCategory)
      : 'Outro';

    const rawTags = Array.isArray(parsed.tags) ? parsed.tags : [];
    const tags = rawTags
      .filter((t: unknown): t is string => typeof t === 'string')
      .slice(0, 5);

    return {
      category,
      tags,
      language: typeof parsed.language === 'string' ? parsed.language : '',
    };
  } catch {
    return null;
  }
};
