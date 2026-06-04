import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useBreakpoint } from '@/lib/utils/useBreakpoint';

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

const installMatchMedia = (initial: boolean): {
  trigger: (matches: boolean) => void;
  restore: () => void;
} => {
  const original = window.matchMedia;
  let listener: ((e: MediaQueryListEvent) => void) | null = null;
  const mql: MockMQL = {
    matches: initial,
    media: '',
    onchange: null,
    addEventListener: (_type, fn) => {
      listener = fn;
    },
    removeEventListener: () => {
      listener = null;
    },
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => true,
  };
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockReturnValue(mql),
  });
  return {
    trigger: (matches) => {
      mql.matches = matches;
      listener?.({ matches } as MediaQueryListEvent);
    },
    restore: () => {
      Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: original });
    },
  };
};

describe('useBreakpoint', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('inicia em isMobile=false quando o viewport é largo', () => {
    const mm = installMatchMedia(false);
    restore = mm.restore;
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(false);
  });

  it('inicia em isMobile=true quando o viewport é estreito', () => {
    const mm = installMatchMedia(true);
    restore = mm.restore;
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(true);
  });

  it('reage à mudança do media query', () => {
    const mm = installMatchMedia(false);
    restore = mm.restore;
    const { result } = renderHook(() => useBreakpoint());
    expect(result.current.isMobile).toBe(false);
    act(() => mm.trigger(true));
    expect(result.current.isMobile).toBe(true);
    act(() => mm.trigger(false));
    expect(result.current.isMobile).toBe(false);
  });
});
