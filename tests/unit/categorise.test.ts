import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/ai/client', () => ({
  isAiEnabled: vi.fn(),
  generateText: vi.fn(),
}));

import { categoriseBook, BOOK_CATEGORIES } from '@/lib/ai/categorise';
import { isAiEnabled, generateText } from '@/lib/ai/client';

describe('categoriseBook', () => {
  it('returns null when AI is disabled', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(false);
    const result = await categoriseBook('Dune', 'Frank Herbert');
    expect(result).toBeNull();
    expect(generateText).not.toHaveBeenCalled();
  });

  it('parses valid JSON response', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"category":"Ficção Científica","tags":["scifi","space","ecology"],"language":"en"}',
    );
    const result = await categoriseBook('Dune', 'Frank Herbert', 'A desert planet...');
    expect(result).toEqual({
      category: 'Ficção Científica',
      tags: ['scifi', 'space', 'ecology'],
      language: 'en',
    });
  });

  it('extracts JSON from markdown code block', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '```json\n{"category":"Filosofia","tags":["ethics"],"language":"pt"}\n```',
    );
    const result = await categoriseBook('Ética', 'Spinoza');
    expect(result).toEqual({
      category: 'Filosofia',
      tags: ['ethics'],
      language: 'pt',
    });
  });

  it('falls back to "Outro" for unknown categories', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"category":"Culinária","tags":["food"],"language":"pt"}',
    );
    const result = await categoriseBook('Receitas', 'Chef');
    expect(result).not.toBeNull();
    expect(result!.category).toBe('Outro');
  });

  it('limits tags to 5', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"category":"Ciência","tags":["a","b","c","d","e","f","g"],"language":"en"}',
    );
    const result = await categoriseBook('Science', 'Author');
    expect(result!.tags).toHaveLength(5);
  });

  it('returns null when generateText fails', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(null);
    const result = await categoriseBook('Book', 'Author');
    expect(result).toBeNull();
  });

  it('returns null when response is not valid JSON', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue('I cannot categorise this book.');
    const result = await categoriseBook('Book', 'Author');
    expect(result).toBeNull();
  });

  it('handles missing tags gracefully', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"category":"Arte","language":"fr"}',
    );
    const result = await categoriseBook('Art', 'Artist');
    expect(result).toEqual({ category: 'Arte', tags: [], language: 'fr' });
  });

  it('handles missing language gracefully', async () => {
    vi.mocked(isAiEnabled).mockReturnValue(true);
    vi.mocked(generateText).mockResolvedValue(
      '{"category":"Poesia","tags":["verse"]}',
    );
    const result = await categoriseBook('Poems', 'Poet');
    expect(result).toEqual({ category: 'Poesia', tags: ['verse'], language: '' });
  });
});

describe('BOOK_CATEGORIES', () => {
  it('contains exactly 10 categories', () => {
    expect(BOOK_CATEGORIES).toHaveLength(10);
  });

  it('includes the required categories from the spec', () => {
    const required = [
      'Romance', 'Ficção Científica', 'Não-Ficção', 'Filosofia',
      'História', 'Direito', 'Ciência', 'Arte', 'Poesia', 'Outro',
    ];
    for (const cat of required) {
      expect(BOOK_CATEGORIES).toContain(cat);
    }
  });
});
