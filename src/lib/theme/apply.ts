import { THEME_CLASS, type Theme } from './tokens';

/**
 * Aplica um tema ao elemento raiz (`<html>`).
 *
 * Remove qualquer classe `theme-*` previamente aplicada e adiciona a do tema
 * pedido (excepto para `light`, que é o default e não tem classe).
 */
export const applyTheme = (theme: Theme, root: HTMLElement = document.documentElement): void => {
  for (const cls of Array.from(root.classList)) {
    if (cls.startsWith('theme-')) root.classList.remove(cls);
  }
  const cls = THEME_CLASS[theme];
  if (cls) root.classList.add(cls);
  root.dataset['theme'] = theme;
};

/**
 * Resolve um tema 'auto' para light/dark com base na preferência do SO.
 * Para temas explícitos (não-auto) devolve o próprio tema.
 */
export const resolveTheme = (theme: Theme | 'auto'): Theme => {
  if (theme !== 'auto') return theme;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light';
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};
