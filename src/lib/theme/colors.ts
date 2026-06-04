import type { ColorToken } from './tokens';

/**
 * Lê o valor computado de uma variável CSS aplicada ao `<html>`. Devolve uma
 * cor literal (`#fff`, `rgb(...)`, etc.) — útil para passar ao iframe do
 * renderer, que não tem acesso às variáveis do documento exterior.
 */
export const readColorToken = (token: ColorToken): string => {
  if (typeof document === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
};
