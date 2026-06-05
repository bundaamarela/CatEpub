import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MOBILE_BREAKPOINT, useBreakpoint, useIsSmallScreen } from '@/lib/utils/useBreakpoint';

interface MockMQL {
  matches: boolean;
  media: string;
  onchange: null;
  addEventListener: (type: string, fn: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (type: string, fn: (e: MediaQueryListEvent) => void) => void;
  addListener: () => void;
  removeListener: () => void;
  dispatchEvent: () => boolean;
}

const installMatchMedia = (
  matchers: Record<string, boolean>,
): { setQuery: (q: string, v: boolean) => void; restore: () => void } => {
  const original = window.matchMedia;
  const listeners = new Map<string, (e: MediaQueryListEvent) => void>();
  const state = { ...matchers };

  const factory = vi.fn((q: string) => {
    const mql: MockMQL = {
      matches: state[q] ?? false,
      media: q,
      onchange: null,
      addEventListener: (_type, fn) => {
        listeners.set(q, fn);
      },
      removeEventListener: () => {
        listeners.delete(q);
      },
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => true,
    };
    return mql;
  });

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: factory,
  });

  return {
    setQuery: (q, v) => {
      state[q] = v;
      const fn = listeners.get(q);
      fn?.({ matches: v } as MediaQueryListEvent);
    },
    restore: () => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: original,
      });
    },
  };
};

describe('useBreakpoint — tablet/mobile classification', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('classifica 768px (tablet) como compacto (isMobile=true)', () => {
    const mm = installMatchMedia({
      [`(max-width: ${MOBILE_BREAKPOINT - 1}px)`]: true,
    });
    restore = mm.restore;
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(true);
  });

  it('classifica 1280px (desktop) como amplo (isMobile=false)', () => {
    const mm = installMatchMedia({
      [`(max-width: ${MOBILE_BREAKPOINT - 1}px)`]: false,
    });
    restore = mm.restore;
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(false);
  });

  it('o breakpoint compacto é 1024px (cobre telemóveis e tablets)', () => {
    expect(MOBILE_BREAKPOINT).toBe(1024);
  });
});

describe('useIsSmallScreen — viewport <640px (telemóveis)', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('devolve true em 375px', () => {
    const mm = installMatchMedia({ '(max-width: 639px)': true });
    restore = mm.restore;
    const { result } = renderHook(() => useIsSmallScreen());
    expect(result.current).toBe(true);
  });

  it('devolve false em 768px (tablet) — o grafo deve estar disponível', () => {
    const mm = installMatchMedia({ '(max-width: 639px)': false });
    restore = mm.restore;
    const { result } = renderHook(() => useIsSmallScreen());
    expect(result.current).toBe(false);
  });

  it('reage a mudanças de viewport', () => {
    const mm = installMatchMedia({ '(max-width: 639px)': false });
    restore = mm.restore;
    const { result } = renderHook(() => useIsSmallScreen());
    expect(result.current).toBe(false);
    act(() => mm.setQuery('(max-width: 639px)', true));
    expect(result.current).toBe(true);
  });
});
