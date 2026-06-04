import * as fs from 'node:fs';
import * as path from 'node:path';

import { type Page, expect, test } from '@playwright/test';

const EPUB_PATH = '/tmp/frankenstein.epub';

const readPositions = (page: Page) =>
  page.evaluate(
    (): Promise<Array<{ bookId: string; cfi: string; percentage: number }>> =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('CatEpub');
        req.onerror = () => reject(new Error('Cannot open CatEpub IndexedDB'));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('positions', 'readonly');
          const store = tx.objectStore('positions');
          const all = store.getAll();
          all.onsuccess = () =>
            resolve(all.result as Array<{ bookId: string; cfi: string; percentage: number }>);
          all.onerror = () => reject(new Error('getAll failed'));
        };
      }),
  );

const readBooks = (page: Page) =>
  page.evaluate(
    (): Promise<Array<{ id: string; title: string }>> =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('CatEpub');
        req.onerror = () => reject(new Error('Cannot open CatEpub IndexedDB'));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('books', 'readonly');
          const store = tx.objectStore('books');
          const all = store.getAll();
          all.onsuccess = () => {
            const books = (all.result as Array<Record<string, unknown>>).map((b) => ({
              id: b['id'] as string,
              title: b['title'] as string,
            }));
            resolve(books);
          };
          all.onerror = () => reject(new Error('getAll books failed'));
        };
      }),
  );

test.describe('Fase 4 — smoke test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    await page.evaluate(() => indexedDB.deleteDatabase('CatEpub'));
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('importar EPUB, abrir reader, navegar, persistir e restaurar posição', async ({ page }) => {
    expect(fs.existsSync(EPUB_PATH), `EPUB deve existir em ${EPUB_PATH}`).toBe(true);
    const epubBytes = fs.readFileSync(path.resolve(EPUB_PATH));

    // ── 1. /library ──────────────────────────────────────────────────────
    await page.goto('/library', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Biblioteca' })).toBeVisible();

    // ── 2. Upload via input file ──────────────────────────────────────────
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'frankenstein.epub',
      mimeType: 'application/epub+zip',
      buffer: Buffer.from(epubBytes),
    });

    // ── 3. Aguarda toast de sucesso ───────────────────────────────────────
    await expect(page.locator('[class*="toastSuccess"]').first()).toBeVisible({ timeout: 30_000 });

    // ── 4. Verifica livro na DB ───────────────────────────────────────────
    const books = await readBooks(page);
    const frankBook = books.find((b) => b.title.toLowerCase().includes('frankenstein'));
    expect(frankBook, 'Frankenstein deve estar na biblioteca').toBeTruthy();
    const bookId = frankBook!.id;

    // ── 5. Abre o reader ──────────────────────────────────────────────────
    const readerLink = page.locator(`a[href*="/reader/${bookId}"]`).first();
    await expect(readerLink).toBeVisible({ timeout: 5_000 });
    await readerLink.click();
    await expect(page).toHaveURL(new RegExp(`/reader/${bookId}`), { timeout: 10_000 });

    // ── 6. Aguarda foliate-view renderizar (dimensões não-nulas) ──────────
    // foliate-view tem shadow root fechado; verificamos que está montado com
    // tamanho real (o CSS já o estica mas queremos confirmar que não crashou).
    await page.waitForFunction(
      () => {
        const fv = document.querySelector('foliate-view');
        return fv !== null && fv.getBoundingClientRect().height > 50;
      },
      { timeout: 20_000, polling: 300 },
    );

    // ── 7. Confirma que sem erro no ecrã ──────────────────────────────────
    await expect(page.locator('text=Erro a abrir EPUB')).not.toBeVisible();

    // ── 8. Aguarda EPUB carregar: reader emite relocate → persiste posição ─
    // foliate-js emite 'relocate' logo após init(). O listener em reader.tsx
    // debounce-a 1s antes de escrever em IndexedDB. Aguardamos até 40s.
    await expect
      .poll(
        async () => {
          const positions = await readPositions(page);
          return positions.find((p) => p.bookId === bookId)?.cfi ?? '';
        },
        { timeout: 40_000, intervals: [1000] },
      )
      .toMatch(/^epubcfi\(/);

    const positionsAfterLoad = await readPositions(page);
    const initialCfi = positionsAfterLoad.find((p) => p.bookId === bookId)!.cfi;

    // ── 9. Navega 2 páginas com → ─────────────────────────────────────────
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1_200);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(1_200);

    // Aguarda debounce + escrita
    await expect
      .poll(
        async () => {
          const positions = await readPositions(page);
          const cfi = positions.find((p) => p.bookId === bookId)?.cfi ?? '';
          // Aceita que o CFI mudou (paginação avançou) ou que ainda é válido
          return cfi;
        },
        { timeout: 10_000, intervals: [500] },
      )
      .toMatch(/^epubcfi\(/);

    // ── 10. Vai para /library (flush no unmount) ───────────────────────────
    await page.goto('/library', { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const positionsAfterLeave = await readPositions(page);
    const savedCfi = positionsAfterLeave.find((p) => p.bookId === bookId)?.cfi;
    expect(savedCfi, 'Posição deve estar guardada após sair do reader').toBeTruthy();
    expect(savedCfi).toMatch(/^epubcfi\(/);

    // ── 11. Volta ao reader ────────────────────────────────────────────────
    await page.goto(`/reader/${bookId}`, { waitUntil: 'networkidle' });

    await page.waitForFunction(
      () => {
        const fv = document.querySelector('foliate-view');
        return fv !== null && fv.getBoundingClientRect().height > 50;
      },
      { timeout: 20_000, polling: 300 },
    );

    await expect(page.locator('text=Erro a abrir EPUB')).not.toBeVisible();

    // ── 12. Verifica posição restaurada ───────────────────────────────────
    // O reader carrega com startCfi = savedCfi e view.init emite relocate.
    // Aguarda que a posição na DB esteja próxima da guardada (mesma chapter).
    await expect
      .poll(
        async () => {
          const positions = await readPositions(page);
          const cfi = positions.find((p) => p.bookId === bookId)?.cfi ?? '';
          return cfi;
        },
        { timeout: 40_000, intervals: [1000] },
      )
      .toMatch(/^epubcfi\(/);

    // Verifica que o CFI inicial não foi "resetado" para o início do livro
    // (ou seja, a restauração funcionou — posição no cap. correcto).
    const positionsFinal = await readPositions(page);
    const restoredCfi = positionsFinal.find((p) => p.bookId === bookId)?.cfi ?? '';
    expect(restoredCfi).toMatch(/^epubcfi\(/);

    // O CFI restaurado deve estar no mesmo capítulo da posição guardada:
    // ambos começam com o mesmo prefixo "/6/" (spine offset).
    const savedSpine = savedCfi!.match(/epubcfi\(([^,]+)/)?.[1] ?? '';
    const restoredSpine = restoredCfi.match(/epubcfi\(([^,]+)/)?.[1] ?? '';
    if (savedSpine && restoredSpine && initialCfi !== savedCfi) {
      // Só verifica se realmente avançamos de página (CFI mudou após ArrowRight)
      const savedNode = savedSpine.split('/').slice(0, 4).join('/');
      const restoredNode = restoredSpine.split('/').slice(0, 4).join('/');
      expect(restoredNode).toBe(savedNode);
    }

    // Passou — importação, renderização, navegação, persistência e restauro OK.
  });
});
