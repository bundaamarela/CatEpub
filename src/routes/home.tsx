import { useState } from 'react';
import { Link } from 'react-router-dom';

import { ContinueReading } from '@/components/home/ContinueReading';
import { Greeting } from '@/components/home/Greeting';
import styles from '@/components/home/Home.module.css';
import { RecentlyRead } from '@/components/home/RecentlyRead';
import { StatsBlock } from '@/components/home/StatsBlock';
import { Welcome } from '@/components/home/Welcome';
import { isWelcomeDismissed } from '@/components/home/welcome-state';
import { CatEmpty } from '@/components/icons';
import { cn } from '@/lib/utils/cn';
import { useBooksWithProgress } from '@/lib/store/library';

const Home = () => {
  const { data, isLoading } = useBooksWithProgress();
  const books = data ?? [];
  const [welcomeDismissed, setWelcomeDismissed] = useState(() => isWelcomeDismissed());
  const showWelcome = !isLoading && books.length === 0 && !welcomeDismissed;

  return (
    <div className={cn(styles.scroll)}>
      <div className={cn(styles.container)}>
        <Greeting />

        {isLoading && <p className={cn(styles.skeleton)}>A carregar a biblioteca…</p>}

        {showWelcome && <Welcome onDismiss={() => setWelcomeDismissed(true)} />}

        {!isLoading && !showWelcome && (
          <>
            <StatsBlock books={books} />
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
