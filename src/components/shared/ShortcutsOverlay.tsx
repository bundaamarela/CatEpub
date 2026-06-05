import { type FC, useEffect } from 'react';

import { cn } from '@/lib/utils/cn';
import styles from './ShortcutsOverlay.module.css';

interface Shortcut {
  keys: string[];
  description: string;
}

interface Group {
  title: string;
  items: Shortcut[];
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? 'Cmd' : 'Ctrl';

const GROUPS: Group[] = [
  {
    title: 'Global',
    items: [
      { keys: [MOD, 'K'], description: 'Pesquisa global' },
      { keys: [MOD, ','], description: 'Definições' },
      { keys: [MOD, 'B'], description: 'Mostrar / recolher barra lateral' },
      { keys: [MOD, 'G'], description: 'Grafo de ideias' },
      { keys: [MOD, 'Shift', 'S'], description: 'Síntese cross-library' },
      { keys: ['?'], description: 'Abrir / fechar este painel' },
      { keys: ['Esc'], description: 'Fechar painéis / cancelar selecção' },
    ],
  },
  {
    title: 'Leitor',
    items: [
      { keys: ['←', '→'], description: 'Página anterior / seguinte' },
      { keys: ['Espaço'], description: 'Mostrar / ocultar interface' },
      { keys: ['H'], description: 'Destacar selecção a amarelo' },
      { keys: ['N'], description: 'Painel de notas' },
      { keys: ['B'], description: 'Adicionar marcador' },
      { keys: ['F'], description: 'Activar / desactivar modo foco' },
      { keys: ['T'], description: 'Activar / parar leitura em voz alta' },
    ],
  },
  {
    title: 'Conhecimento',
    items: [
      { keys: ['Duplo clique no nó'], description: 'Abrir no leitor (a partir do grafo)' },
      { keys: [MOD, 'Clique numa citação'], description: 'Navegar para a fonte (síntese)' },
      { keys: ['[[ Texto ]]'], description: 'Criar wiki-link nas notas' },
    ],
  },
  {
    title: 'Ficheiros',
    items: [
      { keys: ['Arrastar .epub'], description: 'Importar para a biblioteca' },
      { keys: ['··· no cartão do livro'], description: 'Editar metadados' },
      { keys: ['Arrastar imagem'], description: 'Definir capa no editor de metadados' },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export const ShortcutsOverlay: FC<Props> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className={cn(styles.overlay)}
      role="dialog"
      aria-modal="true"
      aria-label="Atalhos de teclado"
      onClick={onClose}
    >
      <div
        className={cn(styles.panel)}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={cn(styles.header)}>
          <h2 className={cn(styles.title)}>Atalhos de teclado</h2>
          <button
            type="button"
            className={cn(styles.closeBtn)}
            onClick={onClose}
            aria-label="Fechar"
          >
            ×
          </button>
        </header>
        <div className={cn(styles.body)}>
          {GROUPS.map((group) => (
            <section key={group.title} className={cn(styles.group)}>
              <h3 className={cn(styles.groupTitle)}>{group.title}</h3>
              <ul className={cn(styles.list)}>
                {group.items.map((item) => (
                  <li key={item.description} className={cn(styles.item)}>
                    <span className={cn(styles.keys)}>
                      {item.keys.map((k, i) => (
                        <span key={`${item.description}-${i}`}>
                          <kbd className={cn(styles.kbd)}>{k}</kbd>
                          {i < item.keys.length - 1 && (
                            <span className={cn(styles.plus)}>+</span>
                          )}
                        </span>
                      ))}
                    </span>
                    <span className={cn(styles.description)}>{item.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <footer className={cn(styles.footer)}>
          <span>
            Pressiona <kbd className={cn(styles.kbd)}>?</kbd> ou{' '}
            <kbd className={cn(styles.kbd)}>Esc</kbd> para fechar.
          </span>
        </footer>
      </div>
    </div>
  );
};
