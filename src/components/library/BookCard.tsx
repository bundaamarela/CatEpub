import { type FC, useState } from 'react';
import { Link } from 'react-router-dom';

import { MoreIcon, TrashIcon } from '@/components/icons';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { formatSeriesLabel } from '@/lib/library/format';
import { cn } from '@/lib/utils/cn';
import type { BookWithProgress } from '@/lib/store/library';
import { BookCover } from './BookCover';
import { MetadataEditor } from './MetadataEditor';
import styles from './Library.module.css';

interface Props {
  book: BookWithProgress;
  onDelete: (book: BookWithProgress) => void;
}

export const BookCard: FC<Props> = ({ book, onDelete }) => {
  const embStatus = book.embeddingsStatus;
  const embProgress = book.embeddingsProgress ?? 0;
  const showEmb = embStatus === 'running' || embStatus === 'pending';
  const seriesLabel = formatSeriesLabel(book);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <article className={cn(styles.gridItem)}>
        <Link to={`/reader/${book.id}`} className={cn(styles.gridLink)} aria-label={`Abrir ${book.title}`}>
          <BookCover book={book} width="100%" height={170} logoSize={32} />
          <div className={cn(styles.gridMeta)}>
            <h3 className={cn(styles.gridTitle)}>{book.title}</h3>
            <p className={cn(styles.gridAuthor)}>{book.author}</p>
            {seriesLabel !== null && (
              <p className={cn(styles.gridSeries)}>{seriesLabel}</p>
            )}
            {book.progress > 0 && (
              <div className={cn(styles.gridProgress)}>
                <ProgressBar value={book.progress} label={`${book.progress}% lido`} />
              </div>
            )}
            {showEmb && (
              <div className={cn(styles.gridEmbeddings)}>
                <span className={cn(styles.gridEmbeddingsLabel)}>
                  {embStatus === 'pending' ? 'A preparar IA…' : `IA: ${embProgress}%`}
                </span>
                <ProgressBar value={embProgress} label="Geração de embeddings" />
              </div>
            )}
          </div>
        </Link>
        <button
          type="button"
          className={cn(styles.gridEdit)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setEditing(true);
          }}
          aria-label={`Editar metadados de ${book.title}`}
        >
          <MoreIcon size={14} />
        </button>
        <button
          type="button"
          className={cn(styles.gridDelete)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(book);
          }}
          aria-label={`Eliminar ${book.title}`}
        >
          <TrashIcon size={14} />
        </button>
      </article>
      {editing && <MetadataEditor book={book} onClose={() => setEditing(false)} />}
    </>
  );
};
