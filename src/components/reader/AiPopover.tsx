import { type FC, useEffect } from 'react';

import { CloseIcon } from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import styles from './AiPopover.module.css';

export interface PopoverPosition {
  top: number;
  left: number;
}

interface Props {
  title: string;
  loading: boolean;
  result: string | null;
  error?: string | null;
  position: PopoverPosition;
  onClose: () => void;
}

/**
 * Floating popover usado para definição contextual e tradução. Auto-fecha em
 * Escape; clique-fora é gerido pelo parent (que possui a árvore de estado).
 */
export const AiPopover: FC<Props> = ({ title, loading, result, error, position, onClose }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className={cn(styles.popover)}
      style={{ top: position.top, left: position.left }}
      role="dialog"
      aria-label={title}
      data-testid="ai-popover"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className={cn(styles.header)}>
        <span className={cn(styles.title)}>{title}</span>
        <button
          type="button"
          className={cn(styles.closeButton)}
          onClick={onClose}
          aria-label="Fechar"
        >
          <CloseIcon size={14} />
        </button>
      </div>
      <div className={cn(styles.body)}>
        {loading && (
          <div className={cn(styles.loading)}>
            <span className={cn(styles.spinner)} aria-hidden />
            <span>A pensar…</span>
          </div>
        )}
        {!loading && error && <div className={cn(styles.error)}>{error}</div>}
        {!loading && !error && result && <div>{result}</div>}
      </div>
    </div>
  );
};
