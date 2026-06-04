import { type FC, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  ChatIcon,
  ChevronLeftIcon,
  HeadphonesIcon,
  MoreIcon,
  NotesIcon,
  PauseIcon,
  SearchIcon,
  SettingsIcon,
  TocIcon,
} from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import styles from './ReaderTopBar.module.css';

interface Props {
  title: string;
  author?: string;
  visible: boolean;
  /** Quantidade de highlights/notas — exibida como badge no botão. */
  notesCount?: number;
  onToggleToc?: () => void;
  onToggleSearch?: () => void;
  onToggleChat?: () => void;
  /** Apenas adiciona o botão de chat se a IA estiver disponível. */
  chatAvailable?: boolean;
  onToggleNotes?: () => void;
  onToggleSettings?: () => void;
  onToggleTts?: () => void;
  ttsActive?: boolean;
  onEditMetadata?: () => void;
}

// Prevents focus from moving to the button on click — keeps focus on the reader
// container so global keyboard shortcuts (←/→/Space/H/…) remain responsive.
const noFocus = (e: MouseEvent<HTMLButtonElement>): void => e.preventDefault();

export const ReaderTopBar: FC<Props> = ({
  title,
  author,
  visible,
  notesCount = 0,
  onToggleToc,
  onToggleSearch,
  onToggleChat,
  chatAvailable = false,
  onToggleNotes,
  onToggleSettings,
  onToggleTts,
  ttsActive = false,
  onEditMetadata,
}) => {
  const navigate = useNavigate();

  return (
    <header className={cn(styles.bar, !visible && styles.barHidden)}>
      <button
        type="button"
        className={cn(styles.iconButton)}
        onMouseDown={noFocus}
        onClick={() => navigate('/library')}
        aria-label="Voltar à biblioteca"
      >
        <ChevronLeftIcon size={20} />
      </button>
      <div className={cn(styles.center)}>
        <span className={cn(styles.title)}>{title}</span>
        {author && <span className={cn(styles.subtitle)}>{author}</span>}
      </div>
      <div className={cn(styles.rightButtons)}>
        {onToggleToc && (
          <button
            type="button"
            className={cn(styles.iconButton)}
            onMouseDown={noFocus}
            onClick={onToggleToc}
            aria-label="Índice do livro"
            data-testid="open-toc-panel"
          >
            <TocIcon size={20} />
          </button>
        )}
        {onToggleSearch && (
          <button
            type="button"
            className={cn(styles.iconButton)}
            onMouseDown={noFocus}
            onClick={onToggleSearch}
            aria-label="Procurar no livro"
            data-testid="open-search-panel"
          >
            <SearchIcon size={20} />
          </button>
        )}
        {onToggleChat && chatAvailable && (
          <button
            type="button"
            className={cn(styles.iconButton)}
            onMouseDown={noFocus}
            onClick={onToggleChat}
            aria-label="Conversar com o livro"
            data-testid="open-chat-panel"
          >
            <ChatIcon size={20} />
          </button>
        )}
        {onToggleNotes && (
          <button
            type="button"
            className={cn(styles.iconButton, styles.notesButton)}
            onMouseDown={noFocus}
            onClick={onToggleNotes}
            aria-label={`Anotações${notesCount > 0 ? ` (${notesCount})` : ''}`}
            data-testid="open-notes-panel"
          >
            <NotesIcon size={20} />
            {notesCount > 0 && <span className={cn(styles.badge)}>{notesCount}</span>}
          </button>
        )}
        {onToggleTts && (
          <button
            type="button"
            className={cn(styles.iconButton, ttsActive && styles.iconButtonActive)}
            onMouseDown={noFocus}
            onClick={onToggleTts}
            aria-label={ttsActive ? 'Parar leitura em voz alta' : 'Ler em voz alta'}
            data-testid="toggle-tts"
          >
            {ttsActive ? <PauseIcon size={20} /> : <HeadphonesIcon size={20} />}
          </button>
        )}
        {onEditMetadata && (
          <button
            type="button"
            className={cn(styles.iconButton)}
            onMouseDown={noFocus}
            onClick={onEditMetadata}
            aria-label="Editar metadados"
            data-testid="edit-metadata"
          >
            <MoreIcon size={20} />
          </button>
        )}
        {onToggleSettings && (
          <button
            type="button"
            className={cn(styles.iconButton)}
            onMouseDown={noFocus}
            onClick={onToggleSettings}
            aria-label="Configurações de leitura"
            data-testid="open-settings-panel"
          >
            <SettingsIcon size={20} />
          </button>
        )}
      </div>
    </header>
  );
};
