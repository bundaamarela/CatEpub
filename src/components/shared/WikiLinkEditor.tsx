import { type FC, type KeyboardEvent, useCallback, useMemo, useRef, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import styles from './WikiLinkEditor.module.css';

export interface WikiCandidate {
  label: string;
  type: 'note' | 'book';
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  candidates: ReadonlyArray<WikiCandidate>;
  className?: string;
  placeholder?: string;
  autoFocus?: boolean;
}

export const WikiLinkEditor: FC<Props> = ({
  value,
  onChange,
  candidates,
  className,
  placeholder,
  autoFocus,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const filtered = useMemo(() => {
    if (!open || query.length === 0) return candidates.slice(0, 20);
    const lower = query.toLowerCase();
    return candidates.filter((c) => c.label.toLowerCase().includes(lower)).slice(0, 20);
  }, [open, query, candidates]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }, []);

  const insertLink = useCallback(
    (label: string): void => {
      const ta = textareaRef.current;
      if (ta === null) return;

      const before = value.slice(0, ta.selectionStart);
      const after = value.slice(ta.selectionEnd);
      const bracketStart = before.lastIndexOf('[[');
      if (bracketStart === -1) return;

      const newValue = `${before.slice(0, bracketStart)}[[${label}]]${after}`;
      onChange(newValue);
      close();

      requestAnimationFrame(() => {
        const pos = bracketStart + label.length + 4;
        ta.setSelectionRange(pos, pos);
        ta.focus();
      });
    },
    [value, onChange, close],
  );

  const handleInput = useCallback((): void => {
    const ta = textareaRef.current;
    if (ta === null) return;
    const before = value.slice(0, ta.selectionStart);
    const bracketStart = before.lastIndexOf('[[');
    if (bracketStart === -1 || before.indexOf(']]', bracketStart) !== -1) {
      close();
      return;
    }
    const partial = before.slice(bracketStart + 2);
    if (partial.includes('\n')) {
      close();
      return;
    }
    setQuery(partial);
    setOpen(true);
    setActiveIndex(0);
  }, [value, close]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>): void => {
      if (!open) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        const item = filtered[activeIndex];
        if (item !== undefined) insertLink(item.label);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    },
    [open, filtered, activeIndex, insertLink, close],
  );

  return (
    <div className={cn(styles.wrapper)}>
      <textarea
        ref={textareaRef}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          requestAnimationFrame(handleInput);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(close, 150);
        }}
        placeholder={placeholder}
        autoFocus={autoFocus}
      />
      {open && filtered.length > 0 && (
        <ul className={cn(styles.dropdown)} role="listbox">
          {filtered.map((c, i) => (
            <li
              key={`${c.type}-${c.label}`}
              role="option"
              aria-selected={i === activeIndex}
              className={cn(styles.dropdownItem, i === activeIndex && styles.dropdownItemActive)}
              onMouseDown={(e) => {
                e.preventDefault();
                insertLink(c.label);
              }}
            >
              <span>{c.label}</span>
              <span className={cn(styles.dropdownType)}>
                {c.type === 'note' ? 'nota' : 'livro'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
