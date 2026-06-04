import { expect, test } from '@playwright/test';

/**
 * Verifica que ao mudar de tema nas Definições as CSS variables são actualizadas
 * correctamente no document root.
 */
test.describe('Tema — CSS variables', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings', { waitUntil: 'networkidle' });
  });

  const getVar = (page: Parameters<typeof page.evaluate>[1] extends never ? never : Parameters<typeof page.evaluate>[1], varName: string) =>
    page.evaluate(
      (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim(),
      varName,
    );

  test('tema light aplica --bg branco', async ({ page }) => {
    // Clica em "Claro"
    await page.getByRole('button', { name: 'Claro' }).click();
    await page.waitForTimeout(100);
    const bg = await getVar(page, '--bg');
    expect(bg).toBeTruthy();
    // Light theme: bg deve estar próximo de branco (#ffffff)
    expect(bg.toLowerCase()).toMatch(/^#fff|rgb\(255,\s*255,\s*255\)|ffffff/i);
  });

  test('tema dark aplica --bg escuro', async ({ page }) => {
    await page.getByRole('button', { name: 'Escuro' }).click();
    await page.waitForTimeout(100);
    const bg = await getVar(page, '--bg');
    // Dark: #1c1c1e — confirma que não é branco
    expect(bg.toLowerCase()).not.toMatch(/^#fff|rgb\(255,\s*255,\s*255\)/i);
    expect(bg).toBeTruthy();
  });

  test('tema sepia aplica --bg sépia', async ({ page }) => {
    await page.getByRole('button', { name: 'Sépia' }).click();
    await page.waitForTimeout(100);
    const bg = await getVar(page, '--bg');
    // Sepia: #f4efe6 — confirma que está definido e não é branco puro
    expect(bg).toBeTruthy();
    expect(bg.toLowerCase()).not.toMatch(/^#fff(fff)?$|^rgb\(255,\s*255,\s*255\)$/i);
  });

  test('tema black aplica --bg preto', async ({ page }) => {
    await page.getByRole('button', { name: 'Preto' }).click();
    await page.waitForTimeout(100);
    const bg = await getVar(page, '--bg');
    // Black: #000000
    expect(bg).toBeTruthy();
    expect(bg.toLowerCase()).toMatch(/^#000|rgb\(0,\s*0,\s*0\)/i);
  });

  test('mudar de dark para light restaura --bg branco', async ({ page }) => {
    await page.getByRole('button', { name: 'Escuro' }).click();
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: 'Claro' }).click();
    await page.waitForTimeout(100);
    const bg = await getVar(page, '--bg');
    expect(bg.toLowerCase()).toMatch(/^#fff|rgb\(255,\s*255,\s*255\)|ffffff/i);
  });
});
