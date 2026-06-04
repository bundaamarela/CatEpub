import { type FC, useEffect, useState } from 'react';

import { cn } from '@/lib/utils/cn';
import { getCurrentPeriod, getQuoteForPeriod, loadQuotes, type Quote } from '@/lib/quotes/quotes';
import styles from './QuoteBlock.module.css';

export const QuoteBlock: FC = () => {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [period, setPeriod] = useState<number>(() => getCurrentPeriod());

  useEffect(() => {
    let cancelled = false;
    void loadQuotes().then((q) => {
      if (!cancelled) setQuotes(q);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = getCurrentPeriod();
      setPeriod((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (quotes === null) return null;

  const quote = getQuoteForPeriod(quotes, period * 8 * 60 * 60 * 1000);

  return (
    <figure className={cn(styles.block)}>
      <blockquote className={cn(styles.text)}>{quote.text}</blockquote>
      <figcaption className={cn(styles.caption)}>
        <span className={cn(styles.author)}>{quote.author}</span>
        {quote.source !== undefined && quote.source.length > 0 && (
          <>
            <span className={cn(styles.separator)}> — </span>
            <cite className={cn(styles.source)}>{quote.source}</cite>
          </>
        )}
      </figcaption>
    </figure>
  );
};
