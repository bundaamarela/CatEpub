import { type FC } from 'react';
import type { FoliateTOCItem } from 'foliate-js/view.js';

import { cn } from '@/lib/utils/cn';
import styles from './PanelTOC.module.css';

interface Props {
  toc: ReadonlyArray<FoliateTOCItem>;
  /** Href do TOC item visível actualmente (relocate.tocItem.href). */
  currentHref?: string;
  onJumpTo: (href: string) => void;
}

/**
 * Compara hrefs ignorando o fragmento (`#anchor`). Foliate normaliza os
 * hrefs do TOC para coincidirem com `relocate.tocItem.href`, mas hrefs
 * podem ter ou não fragmentos consoante o EPUB.
 */
const sameHref = (a: string | undefined, b: string | undefined): boolean => {
  if (a === undefined || b === undefined) return false;
  if (a === b) return true;
  return a.split('#')[0] === b.split('#')[0];
};

const TocItem: FC<{
  item: FoliateTOCItem;
  level: number;
  currentHref?: string;
  onJumpTo: (href: string) => void;
}> = ({ item, level, currentHref, onJumpTo }) => {
  const isActive = sameHref(item.href, currentHref);
  return (
    <>
      <li
        className={cn(styles.item, isActive && styles.itemActive)}
        style={{ paddingLeft: `${0.875 + level * 1}rem` }}
      >
        <button
          type="button"
          className={cn(styles.link)}
          onClick={() => onJumpTo(item.href)}
          aria-current={isActive ? 'location' : undefined}
        >
          {item.label.trim().length > 0 ? item.label.trim() : 'Sem título'}
        </button>
      </li>
      {item.subitems?.map((sub, i) => (
        <TocItem
          key={`${sub.href}-${i}`}
          item={sub}
          level={level + 1}
          {...(currentHref !== undefined ? { currentHref } : {})}
          onJumpTo={onJumpTo}
        />
      ))}
    </>
  );
};

export const PanelTOC: FC<Props> = ({ toc, currentHref, onJumpTo }) => {
  if (toc.length === 0) {
    return <p className={cn(styles.empty)}>Este EPUB não tem índice navegável.</p>;
  }
  return (
    <ul className={cn(styles.list)} role="tree" aria-label="Índice">
      {toc.map((item, i) => (
        <TocItem
          key={`${item.href}-${i}`}
          item={item}
          level={0}
          {...(currentHref !== undefined ? { currentHref } : {})}
          onJumpTo={onJumpTo}
        />
      ))}
    </ul>
  );
};
