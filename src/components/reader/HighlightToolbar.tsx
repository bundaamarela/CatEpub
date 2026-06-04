import { type FC, useMemo } from 'react';

import { BookIcon, CardsIcon, SparklesIcon, TrashIcon } from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import type { HighlightColor } from '@/types/highlight';
import styles from './HighlightToolbar.module.css';

export interface HighlightSelection {
  text: string;
  cfiRange: string;
  /** Range vivo dentro do iframe — usado para posicionar a toolbar. */
  range: Range;
  doc: Document;
}

interface Props {
  /** Selecção activa do iframe (texto seleccionado pelo utilizador). */
  selection: HighlightSelection | null;
  /** Highlight existente sob a selecção (para edição/remoção). */
  existingHighlight?: { id: string; color: HighlightColor } | null;
  /** Quando `true`, os botões Definir/Traduzir ficam clicáveis. */
  aiAvailable?: boolean;
  onApplyColor: (color: HighlightColor) => void;
  onRemove: () => void;
  onAddNote: () => void;
  onCopy: () => void;
  onDefine?: () => void;
  onTranslate?: () => void;
  /** Cria flashcard a partir da selecção. */
  onCreateFlashcard?: () => void;
  /** Cria flashcard com IA (variante secundária); aparece só se `aiAvailable`. */
  onCreateFlashcardAi?: () => void;
}

const COLORS: ReadonlyArray<{ id: HighlightColor; cssVar: string; label: string }> = [
  { id: 'yellow', cssVar: 'var(--highlight-yellow)', label: 'Amarelo' },
  { id: 'green', cssVar: 'var(--highlight-green)', label: 'Verde' },
  { id: 'blue', cssVar: 'var(--highlight-blue)', label: 'Azul' },
  { id: 'pink', cssVar: 'var(--highlight-pink)', label: 'Rosa' },
  { id: 'purple', cssVar: 'var(--highlight-purple)', label: 'Roxo' },
];

interface ToolbarPosition {
  top: number;
  left: number;
}

const computePosition = (selection: HighlightSelection): ToolbarPosition | null => {
  const iframe = selection.doc.defaultView?.frameElement;
  if (!iframe) return null;
  const iframeRect = iframe.getBoundingClientRect();
  const rangeRect = selection.range.getBoundingClientRect();
  if (rangeRect.width === 0 && rangeRect.height === 0) return null;
  return {
    top: iframeRect.top + rangeRect.top,
    left: iframeRect.left + rangeRect.left + rangeRect.width / 2,
  };
};

export const HighlightToolbar: FC<Props> = ({
  selection,
  existingHighlight,
  aiAvailable = false,
  onApplyColor,
  onRemove,
  onAddNote,
  onCopy,
  onDefine,
  onTranslate,
  onCreateFlashcard,
  onCreateFlashcardAi,
}) => {
  const position = useMemo<ToolbarPosition | null>(
    () => (selection ? computePosition(selection) : null),
    [selection],
  );

  if (!selection || !position) return null;

  return (
    <div
      className={cn(styles.toolbar)}
      style={{ top: position.top, left: position.left }}
      role="toolbar"
      aria-label="Anotar selecção"
      data-testid="highlight-toolbar"
      onMouseDown={(e) => e.preventDefault()}
    >
      {COLORS.map((c) => {
        const active = existingHighlight?.color === c.id;
        return (
          <button
            key={c.id}
            type="button"
            className={cn(styles.colorButton)}
            style={{
              background: c.cssVar,
              borderColor: active ? 'var(--text)' : 'transparent',
            }}
            onClick={() => onApplyColor(c.id)}
            aria-label={`Destacar a ${c.label.toLowerCase()}`}
            data-testid={`color-${c.id}`}
          />
        );
      })}
      <span className={cn(styles.divider)} />
      <button type="button" className={cn(styles.actionButton)} onClick={onAddNote}>
        Nota
      </button>
      <button type="button" className={cn(styles.actionButton)} onClick={onCopy}>
        Copiar
      </button>
      {onDefine && (
        <button
          type="button"
          className={cn(styles.actionButton)}
          onClick={onDefine}
          disabled={!aiAvailable}
          title={aiAvailable ? 'Definir' : 'IA não configurada'}
          data-testid="define-button"
        >
          <BookIcon size={14} />
        </button>
      )}
      {onTranslate && (
        <button
          type="button"
          className={cn(styles.actionButton)}
          onClick={onTranslate}
          disabled={!aiAvailable}
          title={aiAvailable ? 'Traduzir para PT-PT' : 'IA não configurada'}
          data-testid="translate-button"
        >
          PT
        </button>
      )}
      {onCreateFlashcard && (
        <button
          type="button"
          className={cn(styles.actionButton)}
          onClick={onCreateFlashcard}
          title="Criar flashcard"
          aria-label="Criar flashcard"
          data-testid="flashcard-button"
        >
          <CardsIcon size={14} />
        </button>
      )}
      {onCreateFlashcardAi && aiAvailable && (
        <button
          type="button"
          className={cn(styles.actionButton)}
          onClick={onCreateFlashcardAi}
          title="Gerar flashcard com IA"
          aria-label="Gerar flashcard com IA"
          data-testid="flashcard-ai-button"
        >
          <SparklesIcon size={14} />
        </button>
      )}
      {existingHighlight && (
        <button
          type="button"
          className={cn(styles.actionButton, styles.danger)}
          onClick={onRemove}
          aria-label="Remover highlight"
        >
          <TrashIcon size={14} />
        </button>
      )}
    </div>
  );
};
