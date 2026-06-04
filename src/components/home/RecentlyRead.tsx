import { type FC } from 'react';
import { Link } from 'react-router-dom';

import { BookCover } from '@/components/library/BookCover';
import { cn } from '@/lib/utils/cn';
import type { BookWithProgress } from '@/lib/store/library';
import styles from './Home.module.css';

interface Props {
  books: ReadonlyArray<BookWithProgress>;
  /** Número máximo de livros a mostrar. Default 4. */
  limit?: number;
}

export const RecentlyRead: FC<Props> = ({ books, limit = 4 }) => {
  const recent = books
    .filter((b) => b.lastReadAt !== undefined)
    .sort((a, b) => {
      const aT = a.lastReadAt ?? '';
      const bT = b.lastReadAt ?? '';
      return aT < bT ? 1 : -1;
    })
    .slice(0, limit);

  if (recent.length === 0) return null;

  return (
    <section className={cn(styles.section)} aria-labelledby="recent-heading">
      <h2 id="recent-heading" className={cn(styles.sectionTitle)}>
        Lidos recentemente
      </h2>
      <div className={cn(styles.recentGrid)}>
        {recent.map((book) => (
          <Link key={book.id} to={`/reader/${book.id}`} className={cn(styles.recentItem)}>
            <BookCover book={book} width="100%" height={150} logoSize={26} />
            <div className={cn(styles.recentTitle)}>{book.title}</div>
            <div className={cn(styles.recentAuthor)}>{book.author}</div>
          </Link>
        ))}
      </div>
    </section>
  );
};
