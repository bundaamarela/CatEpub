import { type FC } from 'react';
import { Link } from 'react-router-dom';

import { ArrowRightIcon } from '@/components/icons';
import { BookCover } from '@/components/library/BookCover';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { cn } from '@/lib/utils/cn';
import type { BookWithProgress } from '@/lib/store/library';
import styles from './Home.module.css';

interface Props {
  books: ReadonlyArray<BookWithProgress>;
  /** Número máximo de livros a mostrar. Default 3. */
  limit?: number;
}

export const ContinueReading: FC<Props> = ({ books, limit = 3 }) => {
  const reading = books
    .filter((b) => b.progress > 0 && b.progress < 100)
    .sort((a, b) => {
      const aT = a.positionUpdatedAt ?? a.lastReadAt ?? '';
      const bT = b.positionUpdatedAt ?? b.lastReadAt ?? '';
      return aT < bT ? 1 : -1;
    })
    .slice(0, limit);

  if (reading.length === 0) return null;

  return (
    <section className={cn(styles.section)} aria-labelledby="continue-heading">
      <h2 id="continue-heading" className={cn(styles.sectionTitle)}>
        Continuar a ler
      </h2>
      <div className={cn(styles.continueList)}>
        {reading.map((book) => (
          <Link key={book.id} to={`/reader/${book.id}`} className={cn(styles.continueItem)}>
            <BookCover book={book} width={56} height={78} logoSize={18} />
            <div className={cn(styles.continueBody)}>
              <h3 className={cn(styles.continueTitle)}>{book.title}</h3>
              <p className={cn(styles.continueAuthor)}>{book.author}</p>
              <ProgressBar value={book.progress} label={`${book.progress}% lido`} />
              <div className={cn(styles.continueMeta)}>
                <span>
                  Cap. {Math.max(1, Math.round((book.progress / 100) * book.spineLength))} de{' '}
                  {book.spineLength}
                </span>
                <span>{book.progress}%</span>
              </div>
            </div>
            <ArrowRightIcon size={16} className={cn(styles.continueArrow)} />
          </Link>
        ))}
      </div>
    </section>
  );
};
