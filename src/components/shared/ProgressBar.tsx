import { type FC } from 'react';

import { cn } from '@/lib/utils/cn';
import styles from './ProgressBar.module.css';

interface Props {
  /** 0–100. Valores fora do intervalo são truncados. */
  value: number;
  /** Altura em px. Default 3. */
  height?: number;
  /** Texto para `aria-label`. Default genérico. */
  label?: string;
  className?: string;
}

export const ProgressBar: FC<Props> = ({ value, height = 3, label, className }) => {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% lido`}
      className={cn(styles.root, className)}
      style={{ height: `${height}px` }}
    >
      <div className={cn(styles.fill)} style={{ width: `${clamped}%` }} />
    </div>
  );
};
