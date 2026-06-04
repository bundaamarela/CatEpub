import { type ChangeEvent, type FC, type FormEvent, useEffect, useMemo, useState } from 'react';

import { CloseIcon } from '@/components/icons';
import { TagInput } from '@/components/shared/TagInput';
import {
  formatCoverError,
  validateCover,
  type CoverValidationError,
} from '@/lib/library/cover-validation';
import { useUpdateBook } from '@/lib/store/library';
import { cn } from '@/lib/utils/cn';
import type { Book } from '@/types/book';
import styles from './MetadataEditor.module.css';

interface Props {
  book: Book;
  onClose: () => void;
}

interface FormState {
  title: string;
  author: string;
  description: string;
  series: string;
  volume: string;
  tags: string[];
  rating: number;
}

const toForm = (book: Book): FormState => ({
  title: book.title,
  author: book.author,
  description: book.description ?? '',
  series: book.series ?? '',
  volume: book.volume !== undefined ? String(book.volume) : '',
  tags: book.tags,
  rating: book.rating ?? 0,
});

export const MetadataEditor: FC<Props> = ({ book, onClose }) => {
  const [form, setForm] = useState<FormState>(() => toForm(book));
  const [coverBlob, setCoverBlob] = useState<Blob | undefined>(book.coverBlob);
  const [coverError, setCoverError] = useState<CoverValidationError | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [volumeError, setVolumeError] = useState<string | null>(null);
  const updateMut = useUpdateBook();

  const coverPreview = useMemo<string | undefined>(
    () => (coverBlob !== undefined ? URL.createObjectURL(coverBlob) : undefined),
    [coverBlob],
  );

  useEffect(() => {
    if (coverPreview === undefined) return;
    return () => URL.revokeObjectURL(coverPreview);
  }, [coverPreview]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [onClose]);

  const handleCoverChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const err = validateCover(file);
    if (err) {
      setCoverError(err);
      return;
    }
    setCoverError(null);
    setCoverBlob(file);
  };

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setTitleError(null);
    setVolumeError(null);

    const title = form.title.trim();
    if (title.length === 0) {
      setTitleError('O título é obrigatório.');
      return;
    }

    let volume: number | undefined;
    if (form.volume.trim().length > 0) {
      const n = Number(form.volume);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
        setVolumeError('O volume deve ser um número inteiro positivo.');
        return;
      }
      volume = n;
    }

    const rating = Math.max(0, Math.min(5, Math.round(form.rating)));
    const description = form.description.trim();
    const series = form.series.trim();
    const patch: Partial<Book> = {
      title,
      author: form.author.trim(),
      tags: form.tags,
      ...(description.length > 0 ? { description } : {}),
      ...(series.length > 0 ? { series } : {}),
      ...(volume !== undefined ? { volume } : {}),
      ...(rating > 0 ? { rating } : {}),
    };
    if (coverBlob !== book.coverBlob && coverBlob !== undefined) {
      patch.coverBlob = coverBlob;
    }

    await updateMut.mutateAsync({ id: book.id, patch });
    onClose();
  };

  return (
    <div
      className={cn(styles.overlay)}
      role="dialog"
      aria-modal="true"
      aria-label="Editar metadados"
      onClick={onClose}
    >
      <div className={cn(styles.modal)} onClick={(e) => e.stopPropagation()}>
        <header className={cn(styles.header)}>
          <h2 className={cn(styles.heading)}>Editar metadados</h2>
          <button
            type="button"
            className={cn(styles.closeBtn)}
            onClick={onClose}
            aria-label="Fechar"
          >
            <CloseIcon size={18} />
          </button>
        </header>

        <form className={cn(styles.form)} onSubmit={(e) => void handleSubmit(e)}>
          <div className={cn(styles.coverRow)}>
            <div className={cn(styles.coverPreview)}>
              {coverPreview !== undefined ? (
                <img src={coverPreview} alt="Capa" />
              ) : (
                <div className={cn(styles.coverEmpty)}>Sem capa</div>
              )}
            </div>
            <div className={cn(styles.coverActions)}>
              <label className={cn(styles.coverBtn)}>
                Carregar capa
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleCoverChange}
                  hidden
                />
              </label>
              {coverBlob !== undefined && (
                <button
                  type="button"
                  className={cn(styles.coverBtnSecondary)}
                  onClick={() => {
                    setCoverBlob(undefined);
                    setCoverError(null);
                  }}
                >
                  Remover
                </button>
              )}
              {coverError !== null && (
                <p className={cn(styles.errorText)}>{formatCoverError(coverError)}</p>
              )}
              <p className={cn(styles.hint)}>JPEG, PNG ou WebP, máx. 2 MB.</p>
            </div>
          </div>

          <label className={cn(styles.field)}>
            <span className={cn(styles.label)}>Título *</span>
            <input
              type="text"
              className={cn(styles.input)}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            {titleError !== null && <span className={cn(styles.errorText)}>{titleError}</span>}
          </label>

          <label className={cn(styles.field)}>
            <span className={cn(styles.label)}>Autor</span>
            <input
              type="text"
              className={cn(styles.input)}
              value={form.author}
              onChange={(e) => setForm({ ...form, author: e.target.value })}
            />
          </label>

          <label className={cn(styles.field)}>
            <span className={cn(styles.label)}>Descrição</span>
            <textarea
              className={cn(styles.textarea)}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
            />
          </label>

          <div className={cn(styles.fieldRow)}>
            <label className={cn(styles.field)}>
              <span className={cn(styles.label)}>Série</span>
              <input
                type="text"
                className={cn(styles.input)}
                value={form.series}
                onChange={(e) => setForm({ ...form, series: e.target.value })}
              />
            </label>
            <label className={cn(styles.fieldVolume)}>
              <span className={cn(styles.label)}>Volume</span>
              <input
                type="number"
                min={0}
                step={1}
                className={cn(styles.input)}
                value={form.volume}
                onChange={(e) => setForm({ ...form, volume: e.target.value })}
              />
              {volumeError !== null && <span className={cn(styles.errorText)}>{volumeError}</span>}
            </label>
          </div>

          <div className={cn(styles.field)}>
            <span className={cn(styles.label)}>Tags</span>
            <TagInput
              value={form.tags}
              onChange={(tags) => setForm({ ...form, tags })}
              placeholder="Adicionar tag…"
            />
          </div>

          <div className={cn(styles.field)}>
            <span className={cn(styles.label)}>Avaliação</span>
            <div className={cn(styles.ratingRow)}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  className={cn(styles.star, form.rating >= n && styles.starActive)}
                  onClick={() => setForm({ ...form, rating: form.rating === n ? 0 : n })}
                  aria-label={`${n} estrela${n === 1 ? '' : 's'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <footer className={cn(styles.footer)}>
            <button type="button" className={cn(styles.btnSecondary)} onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className={cn(styles.btnPrimary)}
              disabled={updateMut.isPending}
            >
              {updateMut.isPending ? 'A guardar…' : 'Guardar'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
};
