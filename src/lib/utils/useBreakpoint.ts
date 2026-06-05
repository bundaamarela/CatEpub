import { useSyncExternalStore } from 'react';

/**
 * Breakpoint compacto/largo em pixels. Abaixo de 1024 px usamos o layout
 * compacto (hamburger + bottom nav) — abrange telemóveis (375 px) e tablets
 * (768 px). A partir de 1024 px temos espaço para a sidebar fixa.
 */
export const MOBILE_BREAKPOINT = 1024;

const MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const subscribe = (cb: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(MEDIA_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

const getSnapshot = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(MEDIA_QUERY).matches;
};

const getServerSnapshot = (): boolean => false;

/** Devolve `true` enquanto o viewport está abaixo de 1024 px (compacto). */
export const useBreakpoint = (): { isMobile: boolean } => {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isMobile };
};

/** Detecta especificamente smartphones estreitos (<640 px) para componentes
 *  que devem desactivar features visuais pesadas (ex.: D3 graph). */
const SMALL_QUERY = `(max-width: 639px)`;

const subscribeSmall = (cb: () => void): (() => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const mq = window.matchMedia(SMALL_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};

const getSmallSnapshot = (): boolean => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia(SMALL_QUERY).matches;
};

export const useIsSmallScreen = (): boolean =>
  useSyncExternalStore(subscribeSmall, getSmallSnapshot, getServerSnapshot);

