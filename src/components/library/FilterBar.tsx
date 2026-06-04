import { type FC } from 'react';

import { cn } from '@/lib/utils/cn';
import styles from './Library.module.css';

export const ALL_CATEGORIES = '__all__' as const;
export type CategoryFilter = string;

interface Props {
  categories: ReadonlyArray<string>;
  active: CategoryFilter;
  onChange: (category: CategoryFilter) => void;
}

export const FilterBar: FC<Props> = ({ categories, active, onChange }) => {
  const list: ReadonlyArray<string> = [ALL_CATEGORIES, ...categories];
  return (
    <div className={cn(styles.tabs)} role="tablist" aria-label="Filtrar por categoria">
      {list.map((cat) => {
        const label = cat === ALL_CATEGORIES ? 'Todos' : cat;
        const isActive = cat === active;
        return (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={cn(styles.tab, isActive && styles.tabActive)}
            onClick={() => onChange(cat)}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};
