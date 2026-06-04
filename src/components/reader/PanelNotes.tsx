import { type FC, useMemo, useState } from 'react';

import { TagInput } from '@/components/shared/TagInput';
import { type WikiCandidate, WikiLinkEditor } from '@/components/shared/WikiLinkEditor';
import { cn } from '@/lib/utils/cn';
import { renderMarkdown } from '@/lib/utils/markdown';
import type { Highlight, HighlightColor } from '@/types/highlight';
import styles from './PanelNotes.module.css';

interface Props {
  highlights: ReadonlyArray<Highlight>;
  onJumpTo: (cfiRange: string) => void;
  onUpdate: (id: string, patch: Partial<Highlight>) => void;
  onRemove: (id: string) => void;
  wikiCandidates?: ReadonlyArray<WikiCandidate>;
}

const COLOR_VARS: Record<HighlightColor, string> = {
  yellow: 'var(--highlight-yellow)',
  green: 'var(--highlight-green)',
  blue: 'var(--highlight-blue)',
  pink: 'var(--highlight-pink)',
  purple: 'var(--highlight-purple)',
};

const COLORS: ReadonlyArray<HighlightColor> = ['yellow', 'green', 'blue', 'pink', 'purple'];

export const PanelNotes: FC<Props> = ({ highlights, onJumpTo, onUpdate, onRemove, wikiCandidates }) => {
  const [colorFilter, setColorFilter] = useState<HighlightColor | null>(null);
  const [tagFilter, setTagFilter] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState('');

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const h of highlights) for (const t of h.tags) set.add(t);
    return [...set].sort();
  }, [highlights]);

  const filtered = useMemo(() => {
    let items = [...highlights];
    if (colorFilter !== null) items = items.filter((h) => h.color === colorFilter);
    if (tagFilter.trim().length > 0) {
      const prefix = tagFilter.trim().toLowerCase();
      items = items.filter((h) =>
        h.tags.some((t) => t === prefix || t.startsWith(`${prefix}/`)),
      );
    }
    return items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [highlights, colorFilter, tagFilter]);

  if (highlights.length === 0) {
    return <div className={cn(styles.empty)}>Sem anotações neste livro.</div>;
  }

  const startEditing = (h: Highlight): void => {
    setEditing(h.id);
    setDraftNote(h.note ?? '');
  };

  const saveEditing = (id: string): void => {
    onUpdate(id, { note: draftNote, updatedAt: new Date().toISOString() });
    setEditing(null);
    setDraftNote('');
  };

  return (
    <>
      <div className={cn(styles.filters)}>
        <div className={cn(styles.colorRow)}>
          <button
            type="button"
            className={cn(styles.allChip)}
            data-active={colorFilter === null}
            onClick={() => setColorFilter(null)}
          >
            Todas
          </button>
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={cn(styles.colorChip)}
              data-active={colorFilter === c}
              onClick={() => setColorFilter(colorFilter === c ? null : c)}
              style={{ background: COLOR_VARS[c] }}
              aria-label={`Filtrar por ${c}`}
            />
          ))}
        </div>
        <input
          type="text"
          className={cn(styles.tagFilter)}
          placeholder={
            allTags.length > 0
              ? `Filtrar por tag (ex.: ${allTags[0] ?? 'estratégia'})`
              : 'Filtrar por tag…'
          }
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        />
      </div>

      <div className={cn(styles.list)}>
        {filtered.map((h) => {
          const isEditing = editing === h.id;
          return (
            <div
              key={h.id}
              className={cn(styles.item)}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('button, textarea, input')) return;
                onJumpTo(h.cfiRange);
              }}
            >
              <div className={cn(styles.colorBar)} style={{ background: COLOR_VARS[h.color] }} />
              <p className={cn(styles.text)}>“{h.text}”</p>
              {!isEditing && h.note !== undefined && h.note.trim().length > 0 && (
                <div
                  className={cn(styles.note)}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(h.note) }}
                />
              )}
              {isEditing && (
                <WikiLinkEditor
                  className={cn(styles.noteEditor)}
                  value={draftNote}
                  onChange={setDraftNote}
                  candidates={wikiCandidates ?? []}
                  placeholder="Nota em markdown… (usa [[ para ligar)"
                  autoFocus
                />
              )}
              <TagInput
                value={h.tags}
                onChange={(tags) =>
                  onUpdate(h.id, { tags, updatedAt: new Date().toISOString() })
                }
                suggestions={allTags}
                placeholder="Tags (ex.: estratégia/jogos)"
              />
              <div className={cn(styles.actions)}>
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      className={cn(styles.actionButton, styles.primary)}
                      onClick={() => saveEditing(h.id)}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      className={cn(styles.actionButton)}
                      onClick={() => {
                        setEditing(null);
                        setDraftNote('');
                      }}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className={cn(styles.actionButton)}
                    onClick={() => startEditing(h)}
                  >
                    {h.note !== undefined && h.note.trim().length > 0
                      ? 'Editar nota'
                      : 'Adicionar nota'}
                  </button>
                )}
                <button
                  type="button"
                  className={cn(styles.actionButton, styles.danger)}
                  onClick={() => onRemove(h.id)}
                >
                  Eliminar
                </button>
                <span className={cn(styles.meta)} style={{ marginLeft: 'auto' }}>
                  {new Date(h.createdAt).toLocaleDateString('pt-PT')}
                </span>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className={cn(styles.empty)}>
            Sem anotações para os filtros activos.
          </div>
        )}
      </div>
    </>
  );
};
