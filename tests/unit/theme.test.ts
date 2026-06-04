import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyTheme, resolveTheme } from '@/lib/theme/apply';

describe('applyTheme', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('html');
  });

  it('aplica light removendo classes theme-* e sem adicionar nenhuma', () => {
    root.classList.add('theme-dark');
    applyTheme('light', root);
    expect(root.classList.contains('theme-dark')).toBe(false);
    expect(root.classList.contains('theme-sepia')).toBe(false);
    expect(root.classList.contains('theme-black')).toBe(false);
    expect(root.dataset['theme']).toBe('light');
  });

  it('aplica sépia adicionando theme-sepia', () => {
    applyTheme('sepia', root);
    expect(root.classList.contains('theme-sepia')).toBe(true);
    expect(root.dataset['theme']).toBe('sepia');
  });

  it('aplica dark adicionando theme-dark', () => {
    applyTheme('dark', root);
    expect(root.classList.contains('theme-dark')).toBe(true);
    expect(root.dataset['theme']).toBe('dark');
  });

  it('aplica black adicionando theme-black', () => {
    applyTheme('black', root);
    expect(root.classList.contains('theme-black')).toBe(true);
    expect(root.dataset['theme']).toBe('black');
  });

  it('alterna entre temas, removendo o anterior', () => {
    applyTheme('sepia', root);
    expect(root.classList.contains('theme-sepia')).toBe(true);

    applyTheme('dark', root);
    expect(root.classList.contains('theme-sepia')).toBe(false);
    expect(root.classList.contains('theme-dark')).toBe(true);

    applyTheme('black', root);
    expect(root.classList.contains('theme-dark')).toBe(false);
    expect(root.classList.contains('theme-black')).toBe(true);

    applyTheme('light', root);
    expect(root.classList.contains('theme-black')).toBe(false);
    expect(root.dataset['theme']).toBe('light');
  });

  it('preserva classes não-temáticas pré-existentes', () => {
    root.classList.add('app-shell');
    root.classList.add('theme-sepia');
    applyTheme('dark', root);
    expect(root.classList.contains('app-shell')).toBe(true);
    expect(root.classList.contains('theme-sepia')).toBe(false);
    expect(root.classList.contains('theme-dark')).toBe(true);
  });
});

describe('resolveTheme', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('devolve o tema explícito sem alterações', () => {
    expect(resolveTheme('light')).toBe('light');
    expect(resolveTheme('sepia')).toBe('sepia');
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('black')).toBe('black');
  });

  it('em auto resolve para dark se o SO prefere dark', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof matchMedia;
    expect(resolveTheme('auto')).toBe('dark');
  });

  it('em auto resolve para light se o SO prefere light', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof matchMedia;
    expect(resolveTheme('auto')).toBe('light');
  });
});
