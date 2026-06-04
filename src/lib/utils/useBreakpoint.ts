import { useSyncExternalStore } from 'react';

/** Breakpoint mobile/desktop em pixels. Abaixo de 768 px → mobile. */
export const MOBILE_BREAKPOINT = 768;

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

/** Devolve `true` enquanto o viewport está abaixo de 768 px (mobile). */
export const useBreakpoint = (): { isMobile: boolean } => {
  const isMobile = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { isMobile };
};
