import { type FC, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import styles from './FocusCheckinDialog.module.css';

interface Props {
  intervalMinutes: number;
  /** Called with the user's reflection text — caller persists it as a note. */
  onSubmit: (text: string) => void;
  /** Called when the user dismisses without submitting. */
  onDismiss: () => void;
}

export const FocusCheckinDialog: FC<Props> = ({ intervalMinutes, onSubmit, onDismiss }) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (): void => {
    if (text.trim().length > 0) onSubmit(text.trim());
    else onDismiss();
  };

  const handleKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') onDismiss();
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
  };

  return (
    <div className={cn(styles.backdrop)} onClick={onDismiss}>
      <dialog
        open
        className={cn(styles.dialog)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKey}
        aria-labelledby="checkin-title"
      >
        <p id="checkin-title" className={cn(styles.prompt)}>
          O que reteve nos últimos {intervalMinutes} minutos?
        </p>
        <textarea
          ref={textareaRef}
          className={cn(styles.textarea)}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escreve livremente…"
          rows={4}
          autoFocus
        />
        <div className={cn(styles.actions)}>
          <button type="button" className={cn(styles.btnSecondary)} onClick={onDismiss}>
            Ignorar
          </button>
          <button type="button" className={cn(styles.btnPrimary)} onClick={handleSubmit}>
            Guardar nota
          </button>
        </div>
      </dialog>
    </div>
  );
};
