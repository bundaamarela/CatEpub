import { type FC } from 'react';
import { Link } from 'react-router-dom';

import { CatLogo } from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import { markWelcomeDismissed } from './welcome-state';
import styles from './Welcome.module.css';

interface ShortcutEntry {
  keys: string[];
  description: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ['←', '→'], description: 'Navegar páginas' },
  { keys: ['Espaço'], description: 'Esconder/mostrar UI' },
  { keys: ['H'], description: 'Highlight amarelo' },
  { keys: ['B'], description: 'Bookmark' },
  { keys: ['N'], description: 'Adicionar nota' },
  { keys: ['Cmd', 'K'], description: 'Pesquisa global' },
];

interface Props {
  onDismiss: () => void;
}

export const Welcome: FC<Props> = ({ onDismiss }) => {
  const handleDismiss = (): void => {
    markWelcomeDismissed();
    onDismiss();
  };

  return (
    <div className={cn(styles.panel)}>
      <div className={cn(styles.logo)}>
        <CatLogo size={48} />
      </div>
      <h2 className={cn(styles.title)}>Bem-vindo ao Cat Epub</h2>
      <p className={cn(styles.lead)}>
        Importa um EPUB para começares a ler. Arrasta o ficheiro para a janela ou clica em
        &ldquo;Importar livro&rdquo; na biblioteca.
      </p>

      <div className={cn(styles.shortcuts)}>
        <h3 className={cn(styles.shortcutsTitle)}>Atalhos do leitor</h3>
        <ul className={cn(styles.shortcutList)}>
          {SHORTCUTS.map(({ keys, description }) => (
            <li key={description} className={cn(styles.shortcutItem)}>
              <span className={cn(styles.shortcutKeys)}>
                {keys.map((k) => (
                  <kbd key={k} className={cn(styles.shortcutKey)}>
                    {k}
                  </kbd>
                ))}
              </span>
              <span>{description}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={cn(styles.actions)}>
        <button type="button" className={cn(styles.button)} onClick={handleDismiss}>
          Começar
        </button>
        <Link to="/library" className={cn(styles.linkButton)} onClick={handleDismiss}>
          Importar livro
        </Link>
      </div>
    </div>
  );
};
