import { type FC, type KeyboardEvent, useMemo, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import styles from './TagInput.module.css';

interface Props {
  value: ReadonlyArray<string>;
  onChange: (next: string[]) => void;
  /** Lista de tags conhecidas para autocompletar. */
  suggestions?: ReadonlyArray<string>;
  placeholder?: string;
}

const normalize = (s: string): string => s.trim().replace(/\s+/g, '-').toLowerCase();

export const TagInput: FC<Props> = ({ value, onChange, suggestions = [], placeholder }) => {
  const [draft, setDraft] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredSuggestions = useMemo(() => {
    const draftN = normalize(draft);
    if (draftN.length === 0) return [];
    const set = new Set(value);
    return suggestions
      .filter((s) => !set.has(s) && s.toLowerCase().includes(draftN))
      .slice(0, 6);
  }, [draft, suggestions, value]);

  const addTag = (raw: string): void => {
    const tag = normalize(raw);
    if (tag.length === 0 || value.includes(tag)) {
      setDraft('');
      return;
    }
    onChange([...value, tag]);
    setDraft('');
  };

  const removeTag = (tag: string): void => {
    onChange(value.filter((t) => t !== tag));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(draft);
    } else if (e.key === 'Backspace' && draft.length === 0 && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className={cn(styles.wrapper)}>
      {value.length > 0 && (
        <div className={cn(styles.tags)}>
          {value.map((t) => (
            <span key={t} className={cn(styles.tag)}>
              {t}
              <button
                type="button"
                className={cn(styles.removeTag)}
                onClick={() => removeTag(t)}
                aria-label={`Remover tag ${t}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className={cn(styles.inputRow)}>
        <input
          type="text"
          className={cn(styles.input)}
          placeholder={placeholder ?? 'Adicionar tag…'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className={cn(styles.suggestions)}>
            {filteredSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                className={cn(styles.suggestion)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  addTag(s);
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
