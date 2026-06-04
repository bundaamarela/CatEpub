import { type FC, useEffect } from 'react';

import { cn } from '@/lib/utils/cn';
import styles from './Toast.module.css';

interface Props {
  /** Mensagem a mostrar. */
  message: string;
  /** Tempo (ms) até auto-dismiss. */
  duration?: number;
  onDismiss: () => void;
}

export const Toast: FC<Props> = ({ message, duration = 2200, onDismiss }) => {
  useEffect(() => {
    const id = setTimeout(onDismiss, duration);
    return () => clearTimeout(id);
  }, [duration, onDismiss]);

  return (
    <div className={cn(styles.toast)} role="status" aria-live="polite">
      {message}
    </div>
  );
};
