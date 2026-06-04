import { type Page, expect, test } from '@playwright/test';

/**
 * Injeta flashcards via IndexedDB e verifica o fluxo de revisão diária.
 * Não requer um EPUB carregado — os cards são criados directamente na DB.
 */

const NOW = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString();

interface FlashcardRow {
  id: string;
  bookId: string;
  highlightId: string;
  front: string;
  back: string;
  state: number;
  due: string;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  lastReview: string | null;
}

const SEED_CARDS: FlashcardRow[] = [
  {
    id: 'card-1',
    bookId: 'book-test',
    highlightId: 'h-1',
    front: 'Pergunta um?',
    back: 'Resposta um.',
    state: 0,
    due: YESTERDAY,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
  },
  {
    id: 'card-2',
    bookId: 'book-test',
    highlightId: 'h-2',
    front: 'Pergunta dois?',
    back: 'Resposta dois.',
    state: 0,
    due: YESTERDAY,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
  },
  {
    id: 'card-3',
    bookId: 'book-test',
    highlightId: 'h-3',
    front: 'Pergunta três?',
    back: 'Resposta três.',
    state: 0,
    due: YESTERDAY,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
  },
];

const injectCards = (page: Page, cards: FlashcardRow[]): Promise<void> =>
  page.evaluate(
    (rows) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('CatEpub');
        req.onerror = () => reject(new Error('Cannot open CatEpub DB'));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('flashcards', 'readwrite');
          const store = tx.objectStore('flashcards');
          for (const row of rows) store.put(row);
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(new Error('tx error'));
        };
      }),
    cards,
  );

const countDueCards = (page: Page): Promise<number> =>
  page.evaluate(
    (now) =>
      new Promise<number>((resolve, reject) => {
        const req = indexedDB.open('CatEpub');
        req.onerror = () => reject(new Error('Cannot open DB'));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('flashcards', 'readonly');
          const store = tx.objectStore('flashcards');
          const all = store.getAll();
          all.onsuccess = () => {
            const rows = all.result as FlashcardRow[];
            const due = rows.filter((r) => new Date(r.due) <= new Date(now));
            resolve(due.length);
          };
          all.onerror = () => reject(new Error('getAll failed'));
        };
      }),
    NOW,
  );

test.describe('Revisão diária (FSRS)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(() => indexedDB.deleteDatabase('CatEpub'));
    await page.reload({ waitUntil: 'networkidle' });
    await injectCards(page, SEED_CARDS);
  });

  test('injeta 3 cards due e navega para /review', async ({ page }) => {
    const due = await countDueCards(page);
    expect(due).toBe(3);

    await page.goto('/review', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /revis/i })).toBeVisible();
  });

  test('review mostra frente do card e permite revelar verso', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'networkidle' });

    // Deve mostrar a frente do primeiro card
    await expect(page.getByText('Pergunta')).toBeVisible({ timeout: 10_000 });

    // Botão para revelar resposta
    const showBtn = page.getByRole('button', { name: /resposta|mostrar|revelar/i }).first();
    await expect(showBtn).toBeVisible({ timeout: 5_000 });
    await showBtn.click();

    // Deve aparecer o verso
    await expect(page.getByText('Resposta')).toBeVisible({ timeout: 5_000 });

    // Deve ter botões de rating (1–4 ou Again/Hard/Good/Easy)
    const ratingBtns = page.locator('button').filter({ hasText: /again|hard|good|easy|repetir|difícil|bom|fácil|\d/i });
    await expect(ratingBtns.first()).toBeVisible({ timeout: 5_000 });
  });

  test('avaliar um card avança para o seguinte', async ({ page }) => {
    await page.goto('/review', { waitUntil: 'networkidle' });

    // Mostra frente
    await expect(page.getByText('Pergunta')).toBeVisible({ timeout: 10_000 });

    // Revela verso
    const showBtn = page.getByRole('button', { name: /resposta|mostrar|revelar/i }).first();
    await showBtn.click();
    await expect(page.getByText('Resposta')).toBeVisible({ timeout: 5_000 });

    // Avalia como "Bom" (rating 3) ou qualquer rating disponível
    const goodBtn = page.getByRole('button', { name: /good|bom|3/i }).first();
    if (await goodBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await goodBtn.click();
    } else {
      // Fallback: clica no segundo botão de rating
      const btns = page.locator('button').filter({ hasText: /again|hard|good|easy|repetir|difícil|bom|fácil/i });
      await btns.nth(1).click();
    }

    // Deve aparecer próximo card ou mensagem de conclusão
    await expect(
      page.getByText(/pergunta|parabéns|concluíd|sessão|fim/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});
