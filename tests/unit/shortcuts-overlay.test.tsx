import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShortcutsOverlay } from '@/components/shared/ShortcutsOverlay';

describe('ShortcutsOverlay', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders nothing when closed', () => {
    const { container } = render(<ShortcutsOverlay open={false} onClose={() => undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all four groups when open', () => {
    render(<ShortcutsOverlay open onClose={() => undefined} />);
    expect(screen.getByText('Global')).toBeTruthy();
    expect(screen.getByText('Leitor')).toBeTruthy();
    expect(screen.getByText('Conhecimento')).toBeTruthy();
    expect(screen.getByText('Ficheiros')).toBeTruthy();
  });

  it('includes the new Cmd+G (graph) and Cmd+Shift+S (synthesis) bindings', () => {
    render(<ShortcutsOverlay open onClose={() => undefined} />);
    expect(screen.getByText('Grafo de ideias')).toBeTruthy();
    expect(screen.getByText('Síntese cross-library')).toBeTruthy();
  });

  it('lists the file-management gestures', () => {
    render(<ShortcutsOverlay open onClose={() => undefined} />);
    expect(screen.getByText('Importar para a biblioteca')).toBeTruthy();
    expect(screen.getByText('Editar metadados')).toBeTruthy();
    expect(screen.getByText('Definir capa no editor de metadados')).toBeTruthy();
  });

  it('clicking the backdrop closes via onClose', () => {
    const onClose = vi.fn();
    render(<ShortcutsOverlay open onClose={onClose} />);
    const dialog = screen.getByRole('dialog');
    fireEvent.click(dialog);
    expect(onClose).toHaveBeenCalled();
  });

  it('locks body scroll while open and restores on close', () => {
    document.body.style.overflow = '';
    const { rerender } = render(<ShortcutsOverlay open onClose={() => undefined} />);
    expect(document.body.style.overflow).toBe('hidden');
    rerender(<ShortcutsOverlay open={false} onClose={() => undefined} />);
    expect(document.body.style.overflow).toBe('');
  });
});
