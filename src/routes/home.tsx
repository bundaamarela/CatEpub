import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import { ContinueReading } from '@/components/home/ContinueReading';
import { Greeting } from '@/components/home/Greeting';
import styles from '@/components/home/Home.module.css';
import { QuoteBlock } from '@/components/home/QuoteBlock';
import { RecentlyRead } from '@/components/home/RecentlyRead';
import { StatsBlock } from '@/components/home/StatsBlock';
import { Welcome } from '@/components/home/Welcome';
import { isWelcomeDismissed } from '@/components/home/welcome-state';
import { CatEmpty } from '@/components/icons';
import {
  requestNotificationPermission,
  scheduleQuoteNotification,
  type Quote,
} from '@/lib/quotes/quotes';
import { cn } from '@/lib/utils/cn';
import { usePrefs } from '@/lib/store/prefs';
import { useBooksWithProgress } from '@/lib/store/library';

const FIRST_VISIT_KEY = 'catepub_notification_asked';

const Home = () => {
  const { data, isLoading } = useBooksWithProgress();
  const books = data ?? [];
  const showQuote = usePrefs((s) => s.showQuote);
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => isWelcomeDismissed());
  const showWelcome = !isLoading && books.length === 0 && !welcomeDismissed;

  const handleQuoteChange = useCallback((quote: Quote) => {
    void (async () => {
      const alreadyAsked = ((): boolean => {
        try {
          return localStorage.getItem(FIRST_VISIT_KEY) !== null;
        } catch {
          // Private mode — pretend we already asked to avoid retrying.
          return true;
        }
      })();
      if (!alreadyAsked) {
        try {
          localStorage.setItem(FIRST_VISIT_KEY, '1');
        } catch {
          // Private mode — request anyway; failure is silent.
        }
        await requestNotificationPermission();
      }
      scheduleQuoteNotification(quote);
    })();
  }, []);

  return (
    <div className={cn(styles.scroll)}>
      <div className={cn(styles.container)}>
        <Greeting />

        {isLoading && <p className={cn(styles.skeleton)}>A carregar a biblioteca…</p>}

        {showWelcome && <Welcome onDismiss={() => setWelcomeDismissed(true)} />}

        {!isLoading && !showWelcome && (
          <>
            <StatsBlock books={books} />
            {showQuote && <QuoteBlock onQuoteChange={handleQuoteChange} />}
            <ContinueReading books={books} />
            <RecentlyRead books={books} />

            {books.length === 0 && (
              <div className={cn(styles.empty)}>
                <CatEmpty size={100} />
                <div className={cn(styles.emptyTitle)}>Biblioteca vazia</div>
                <div className={cn(styles.emptySub)}>Adicione o seu primeiro EPUB</div>
                <Link to="/library" className={cn(styles.emptyAction)}>
                  Ir para a biblioteca
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Home;
