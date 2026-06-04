import { type CSSProperties, type FC, useEffect, useMemo } from 'react';

import { CatLogo } from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import type { Book } from '@/types/book';
import styles from './BookCover.module.css';

type Size = number | string;

interface Props {
  book: Pick<Book, 'title' | 'author' | 'coverBlob' | 'coverHue'>;
  width?: Size;
  height?: Size;
  /** Tamanho do logo no fallback procedural (px). Default 28. */
  logoSize?: number;
  className?: string;
}

const toCss = (v: Size): string => (typeof v === 'number' ? `${v}px` : v);

export const BookCover: FC<Props> = ({
  book,
  width = '100%',
  height = 150,
  logoSize = 28,
  className,
}) => {
  const objectUrl = useMemo(
    () => (book.coverBlob ? URL.createObjectURL(book.coverBlob) : undefined),
    [book.coverBlob],
  );
  useEffect(() => {
    if (!objectUrl) return;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const hue = book.coverHue;
  const rootStyle: CSSProperties = {
    width: toCss(width),
    height: toCss(height),
    containerType: 'inline-size',
    background: objectUrl
      ? `hsl(${hue}, 12%, 88%)`
      : `linear-gradient(135deg, hsl(${hue}, 8%, 95%) 0%, hsl(${hue}, 12%, 78%) 100%)`,
  };

  return (
    <div className={cn(styles.root, className)} style={rootStyle} aria-hidden="false">
      {objectUrl ? (
        <img
          src={objectUrl}
          alt={`Capa de ${book.title}`}
          className={cn(styles.image)}
          loading="lazy"
        />
      ) : (
        <div className={cn(styles.proceduralLayer)}>
          <div
            className={cn(styles.proceduralTitle)}
            style={{ color: `hsl(${hue}, 20%, 25%)` }}
          >
            {book.title}
          </div>
          <div
            className={cn(styles.proceduralAuthor)}
            style={{ color: `hsl(${hue}, 15%, 40%)` }}
          >
            {book.author}
          </div>
          <div className={cn(styles.proceduralLogo)} style={{ color: `hsl(${hue}, 25%, 25%)` }}>
            <CatLogo size={logoSize} />
          </div>
        </div>
      )}
    </div>
  );
};
