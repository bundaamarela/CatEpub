import { type FC, type ReactNode } from 'react';

import { CloseIcon } from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import styles from './PanelOverlay.module.css';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** When true, removes body padding/overflow — use for panels with their own scroll (e.g. PanelSearch). */
  noPadding?: boolean;
}

export const PanelOverlay: FC<Props> = ({ title, onClose, children, noPadding }) => (
  <aside className={cn(styles.panel)} aria-label={title}>
    <div className={cn(styles.header)}>
      <span className={cn(styles.title)}>{title}</span>
      <button
        type="button"
        className={cn(styles.closeButton)}
        onClick={onClose}
        aria-label="Fechar painel"
      >
        <CloseIcon size={16} />
      </button>
    </div>
    <div className={cn(styles.body, noPadding && styles.bodyFlex)}>{children}</div>
  </aside>
);
