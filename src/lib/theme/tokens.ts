/**
 * Cat Epub — tokens de design tipados
 *
 * Reflectem 1:1 as variáveis CSS de `src/styles/themes.css` e `globals.css`.
 * Use estes símbolos em vez de strings literais para evitar drift.
 */

export const THEMES = ['light', 'sepia', 'dark', 'black'] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_CLASS = {
  light: '',
  sepia: 'theme-sepia',
  dark: 'theme-dark',
  black: 'theme-black',
} as const satisfies Record<Theme, string>;

export const FONT_FAMILIES = ['serif', 'sans', 'dyslexic'] as const;
export type FontFamily = (typeof FONT_FAMILIES)[number];

export const FONT_VAR = {
  serif: 'var(--font-serif)',
  sans: 'var(--font-sans)',
  dyslexic: 'var(--font-dyslexic)',
} as const satisfies Record<FontFamily, string>;

/* Tokens de cor canónicos (apenas os nomes — o valor vem do CSS). */
export const COLOR_TOKENS = [
  '--bg',
  '--surface',
  '--surface-2',
  '--border',
  '--border-strong',
  '--text',
  '--text-2',
  '--text-3',
  '--accent',
  '--highlight-yellow',
  '--highlight-green',
  '--highlight-blue',
  '--highlight-pink',
  '--highlight-purple',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export const RADIUS_TOKENS = ['--radius-sm', '--radius', '--radius-lg'] as const;
export type RadiusToken = (typeof RADIUS_TOKENS)[number];

export const SHADOW_TOKENS = ['--shadow-sm', '--shadow-md', '--shadow-lg'] as const;
export type ShadowToken = (typeof SHADOW_TOKENS)[number];
