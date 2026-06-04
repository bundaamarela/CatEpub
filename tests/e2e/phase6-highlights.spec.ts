import * as fs from 'node:fs';
import * as path from 'node:path';

import { type Page, expect, test } from '@playwright/test';

const EPUB_PATH = '/tmp/frankenstein.epub';

const readHighlights = (page: Page) =>
  page.evaluate(
    (): Promise<Array<{ id: string; bookId: string; cfiRange: string; text: string; color: string }>> =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('CatEpub');
        req.onerror = () => reject(new Error('Cannot open CatEpub IndexedDB'));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('highlights', 'readonly');
          const store = tx.objectStore('highlights');
          const all = store.getAll();
          all.onsuccess = () =>
            resolve(
              all.result as Array<{
                id: string;
                bookId: string;
                cfiRange: string;
                text: string;
                color: string;
              }>,
            );
          all.onerror = () => reject(new Error('getAll highlights failed'));
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

/**
 * Insere um highlight directamente em IndexedDB (a Selecção dentro do iframe
 * com shadow root fechado é difícil de simular via Playwright; o que importa
 * para esta fase é validar o fluxo de persistência → rendering → painel).
 */
const insertHighlight = (
  page: Page,
  highlight: {
    id: string;
    bookId: string;
    cfiRange: string;
    text: string;
    color: string;
    tags: string[];
    createdAt: string;
    updatedAt: string;
  },
) =>
  page.evaluate(
    (h) =>
      new Promise<void>((resolve, reject) => {
        const req = indexedDB.open('CatEpub');
        req.onerror = () => reject(new Error('open failed'));
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction('highlights', 'readwrite');
          const store = tx.objectStore('highlights');
          const put = store.put(h);
          put.onsuccess = () => resolve();
          put.onerror = () => reject(new Error('put failed'));
        };
      }),
    highlight,
  );

test.describe('Fase 6 — sistema de anotações', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/library', { waitUntil: 'networkidle' });
    await page.evaluate(() => indexedDB.deleteDatabase('CatEpub'));
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('highlight persistido em IndexedDB sobrevive a reload e aparece no painel', async ({
    page,
  }) => {
    expect(fs.existsSync(EPUB_PATH), `EPUB deve existir em ${EPUB_PATH}`).toBe(true);
    const epubBytes = fs.readFileSync(path.resolve(EPUB_PATH));

    // ── 1. Importar EPUB ─────────────────────────────────────────────────
    await page.goto('/library', { waitUntil: 'networkidle' });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'frankenstein.epub',
      mimeType: 'application/epub+zip',
      buffer: Buffer.from(epubBytes),
    });
    await expect(page.locator('[class*="toastSuccess"]').first()).toBeVisible({ timeout: 30_000 });

    const books = await readBooks(page);
    const frankBook = books.find((b) => b.title.toLowerCase().includes('frankenstein'));
    expect(frankBook, 'Frankenstein deve estar na biblioteca').toBeTruthy();
    const bookId = frankBook!.id;

    // ── 2. Abrir reader ──────────────────────────────────────────────────
    await page.goto(`/reader/${bookId}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => {
        const fv = document.querySelector('foliate-view');
        return fv !== null && fv.getBoundingClientRect().height > 50;
      },
      { timeout: 20_000, polling: 300 },
    );
    await expect(page.locator('text=Erro a abrir EPUB')).not.toBeVisible();

    // ── 3. Criar highlight directamente em IndexedDB ─────────────────────
    // (Selecção real dentro de shadow root fechado é simulada — o que importa
    // é o fluxo de persistência da Fase 6.)
    const now = new Date().toISOString();
    const highlightId = `01HXXXXTEST${Date.now().toString(36).toUpperCase()}`.slice(0, 26);
    await insertHighlight(page, {
      id: highlightId,
      bookId,
      cfiRange: 'epubcfi(/6/4!/4/2,/1:0,/1:30)',
      text: 'You will rejoice to hear',
      color: 'yellow',
      tags: ['gótico/inicio'],
      createdAt: now,
      updatedAt: now,
    });

    // ── 4. Voltar e re-entrar para forçar refetch ────────────────────────
    await page.goto('/library', { waitUntil: 'networkidle' });
    await page.goto(`/reader/${bookId}`, { waitUntil: 'networkidle' });

    await page.waitForFunction(
      () => document.querySelector('foliate-view') !== null,
      { timeout: 10_000 },
    );

    // ── 5. Botão de notas mostra contagem correcta ───────────────────────
    const notesButton = page.getByTestId('open-notes-panel');
    await expect(notesButton).toBeVisible({ timeout: 10_000 });
    await expect(notesButton).toHaveAccessibleName(/Anotações \(1\)/);

    // ── 6. Abrir painel revela o highlight ───────────────────────────────
    await notesButton.click();
    await expect(page.getByText('“You will rejoice to hear”')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('aside[aria-label="Anotações"]')).toBeVisible();

    // ── 7. Verifica que ainda existe na DB ───────────────────────────────
    const highlights = await readHighlights(page);
    expect(highlights).toHaveLength(1);
    expect(highlights[0]?.bookId).toBe(bookId);
    expect(highlights[0]?.color).toBe('yellow');

    // ── 8. /notes mostra o highlight agrupado por livro ──────────────────
    await page.goto('/notes', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Frankenstein/i })).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText('“You will rejoice to hear”')).toBeVisible();
    await expect(page.getByText('gótico/inicio')).toBeVisible();
  });

  test('eliminar highlight do painel remove da DB', async ({ page }) => {
    expect(fs.existsSync(EPUB_PATH)).toBe(true);
    const epubBytes = fs.readFileSync(path.resolve(EPUB_PATH));

    await page.goto('/library', { waitUntil: 'networkidle' });
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.setInputFiles({
      name: 'frankenstein.epub',
      mimeType: 'application/epub+zip',
      buffer: Buffer.from(epubBytes),
    });
    await expect(page.locator('[class*="toastSuccess"]').first()).toBeVisible({ timeout: 30_000 });

    const books = await readBooks(page);
    const bookId = books.find((b) => b.title.toLowerCase().includes('frankenstein'))!.id;

    const now = new Date().toISOString();
    await insertHighlight(page, {
      id: `01HXXXDEL${Date.now().toString(36).toUpperCase()}`.slice(0, 26),
      bookId,
      cfiRange: 'epubcfi(/6/4!/4/2,/1:0,/1:20)',
      text: 'I am already far north',
      color: 'green',
      tags: [],
      createdAt: now,
      updatedAt: now,
    });

    await page.goto(`/reader/${bookId}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(
      () => document.querySelector('foliate-view') !== null,
      { timeout: 10_000 },
    );

    await page.getByTestId('open-notes-panel').click();
    await expect(page.getByText('“I am already far north”')).toBeVisible({ timeout: 5_000 });

    // Confirma diálogo nativo seria preciso para uma confirmação dupla; aqui o
    // botão "Eliminar" do painel actua sem confirmação extra (só /library a tem).
    await page.getByRole('button', { name: 'Eliminar' }).first().click();

    await expect.poll(async () => (await readHighlights(page)).length, { timeout: 5_000 }).toBe(0);
    await expect(page.getByText('“I am already far north”')).not.toBeVisible();
  });
});
