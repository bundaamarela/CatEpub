import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RootLayout } from '@/routes/RootLayout';
import { isReaderRoute } from '@/routes/route-utils';

const setMatchMedia = (matches: boolean): void => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

describe('isReaderRoute', () => {
  it('detecta /reader/:id', () => {
    expect(isReaderRoute('/reader/abc')).toBe(true);
    expect(isReaderRoute('/reader/01HXXXX')).toBe(true);
  });

  it('rejeita outras rotas', () => {
    expect(isReaderRoute('/')).toBe(false);
    expect(isReaderRoute('/library')).toBe(false);
    expect(isReaderRoute('/reader')).toBe(false); // sem id
    expect(isReaderRoute('/reader/abc/extra')).toBe(false);
  });
});

describe('RootLayout — visibilidade do chrome', () => {
  const originalMM = window.matchMedia;
  afterEach(() => {
    window.matchMedia = originalMM;
  });

  describe('em desktop', () => {
    beforeEach(() => setMatchMedia(false));

    it('renderiza Sidebar fora do leitor', () => {
      render(
        <MemoryRouter initialEntries={['/library']}>
          <RootLayout />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('complementary', { name: /navegação principal/i })).not.toBeNull();
      expect(screen.queryByRole('navigation', { name: /navegação móvel/i })).toBeNull();
    });

    it('NÃO renderiza Sidebar quando está em /reader/:id', () => {
      render(
        <MemoryRouter initialEntries={['/reader/01HX']}>
          <RootLayout />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('complementary', { name: /navegação principal/i })).toBeNull();
      expect(screen.queryByRole('navigation', { name: /navegação móvel/i })).toBeNull();
    });
  });

  describe('em mobile', () => {
    beforeEach(() => setMatchMedia(true));

    it('renderiza MobileNav e MobileTopBar fora do leitor', () => {
      render(
        <MemoryRouter initialEntries={['/library']}>
          <RootLayout />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('navigation', { name: /navegação móvel/i })).not.toBeNull();
      expect(screen.queryByRole('button', { name: /abrir menu/i })).not.toBeNull();
      expect(screen.queryByRole('complementary', { name: /navegação principal/i })).toBeNull();
    });

    it('NÃO renderiza chrome quando está em /reader/:id', () => {
      render(
        <MemoryRouter initialEntries={['/reader/01HX']}>
          <RootLayout />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('navigation', { name: /navegação móvel/i })).toBeNull();
      expect(screen.queryByRole('button', { name: /abrir menu/i })).toBeNull();
      expect(screen.queryByRole('complementary', { name: /navegação principal/i })).toBeNull();
    });
  });
});
