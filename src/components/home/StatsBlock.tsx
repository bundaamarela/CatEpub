import { useQuery } from '@tanstack/react-query';
import { subDays, startOfDay, format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { type FC } from 'react';

import { BookIcon, ClockIcon, StarIcon } from '@/components/icons';
import * as sessionsDb from '@/lib/db/sessions';
import { cn } from '@/lib/utils/cn';
import type { BookWithProgress } from '@/lib/store/library';
import type { ReadingSession } from '@/types/flashcard';
import styles from './Home.module.css';
import statsStyles from './StatsBlock.module.css';

interface Props {
  books: ReadonlyArray<BookWithProgress>;
}

const minutesBetween = (start: string, end: string): number =>
  (new Date(end).getTime() - new Date(start).getTime()) / 60_000;

interface WeekStats {
  avgSessionMin: number;
  avgWpm: number;
  topBookTitle: string | null;
  pagesPerDay: Array<{ label: string; pages: number }>;
}

const computeStats = (
  sessions: ReadingSession[],
  books: ReadonlyArray<BookWithProgress>,
): WeekStats => {
  const completed = sessions.filter((s) => s.endedAt !== undefined);

  const avgSessionMin =
    completed.length === 0
      ? 0
      : completed.reduce((acc, s) => acc + minutesBetween(s.startedAt, s.endedAt!), 0) /
        completed.length;

  const totalWords = sessions.reduce((acc, s) => acc + (s.wordsRead ?? 0), 0);
  const totalMin = completed.reduce(
    (acc, s) => acc + minutesBetween(s.startedAt, s.endedAt!),
    0,
  );
  const avgWpm = totalMin > 0 ? Math.round(totalWords / totalMin) : 0;

  // Book with most pagesRead this week.
  const pagesByBook = new Map<string, number>();
  for (const s of sessions) {
    pagesByBook.set(s.bookId, (pagesByBook.get(s.bookId) ?? 0) + s.pagesRead);
  }
  let topBookId: string | null = null;
  let topPages = 0;
  for (const [id, pages] of pagesByBook) {
    if (pages > topPages) {
      topPages = pages;
      topBookId = id;
    }
  }
  const topBookTitle =
    topBookId !== null
      ? (books.find((b) => b.id === topBookId)?.title ?? null)
      : null;

  // Pages per day for last 7 days.
  const today = startOfDay(new Date());
  const pagesPerDay = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(today, 6 - i);
    const dayIso = day.toISOString().slice(0, 10);
    const pages = sessions
      .filter((s) => s.startedAt.slice(0, 10) === dayIso)
      .reduce((acc, s) => acc + s.pagesRead, 0);
    return {
      label: format(day, 'EEE', { locale: pt }),
      pages,
    };
  });

  return { avgSessionMin, avgWpm, topBookTitle, pagesPerDay };
};

const formatDuration = (minutes: number): string => {
  if (minutes < 1) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
};

/** SVG bar chart (7 days, purely declarative). */
const WeekChart: FC<{ data: Array<{ label: string; pages: number }> }> = ({ data }) => {
  const max = Math.max(...data.map((d) => d.pages), 1);
  const W = 280;
  const H = 56;
  const barW = 24;
  const gap = (W - barW * 7) / 6;

  return (
    <svg
      viewBox={`0 0 ${W} ${H + 16}`}
      width="100%"
      className={cn(statsStyles.chart)}
      aria-label="Páginas lidas por dia esta semana"
      role="img"
    >
      {data.map((d, i) => {
        const barH = max > 0 ? Math.max(2, Math.round((d.pages / max) * H)) : 2;
        const x = i * (barW + gap);
        return (
          <g key={d.label}>
            <rect
              x={x}
              y={H - barH}
              width={barW}
              height={barH}
              rx={3}
              className={cn(statsStyles.bar)}
            />
            <text
              x={x + barW / 2}
              y={H + 13}
              textAnchor="middle"
              className={cn(statsStyles.barLabel)}
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

export const StatsBlock: FC<Props> = ({ books }) => {
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions', 'week'],
    queryFn: () => sessionsDb.query({ from: sevenDaysAgo }),
  });

  const { avgSessionMin, avgWpm, topBookTitle, pagesPerDay } = computeStats(sessions, books);

  const total = books.length;
  const completed = books.filter((b) => b.finishedAt !== undefined).length;
  const inProgress = books.filter((b) => b.progress > 0 && b.progress < 100).length;

  const topItems: Array<{ label: string; value: string; Icon: typeof BookIcon }> = [
    { label: 'Livros', value: total.toLocaleString('pt-PT'), Icon: BookIcon },
    { label: 'Concluídos', value: completed.toLocaleString('pt-PT'), Icon: StarIcon },
    { label: 'Em progresso', value: inProgress.toLocaleString('pt-PT'), Icon: ClockIcon },
  ];

  return (
    <div className={cn(statsStyles.root)}>
      <div className={cn(styles.stats)}>
        {topItems.map(({ label, value, Icon }) => (
          <div key={label} className={cn(styles.statCard)}>
            <div className={cn(styles.statHeader)}>
              <Icon size={15} />
              <span className={cn(styles.statLabel)}>{label}</span>
            </div>
            <div className={cn(styles.statValue)}>{value}</div>
          </div>
        ))}
      </div>

      {sessions.length > 0 && (
        <div className={cn(statsStyles.sessionRow)}>
          <div className={cn(statsStyles.sessionStat)}>
            <span className={cn(statsStyles.sessionLabel)}>Sessão média</span>
            <span className={cn(statsStyles.sessionValue)}>{formatDuration(avgSessionMin)}</span>
          </div>
          <div className={cn(statsStyles.sessionStat)}>
            <span className={cn(statsStyles.sessionLabel)}>Velocidade</span>
            <span className={cn(statsStyles.sessionValue)}>
              {avgWpm > 0 ? `${avgWpm} wpm` : '—'}
            </span>
          </div>
          {topBookTitle !== null && (
            <div className={cn(statsStyles.sessionStat, statsStyles.sessionStatWide)}>
              <span className={cn(statsStyles.sessionLabel)}>Mais lido esta semana</span>
              <span className={cn(statsStyles.sessionValue, statsStyles.sessionBook)}>
                {topBookTitle}
              </span>
            </div>
          )}
        </div>
      )}

      {sessions.length > 0 && (
        <div className={cn(statsStyles.chartWrap)}>
          <span className={cn(statsStyles.chartTitle)}>Páginas por dia (7 dias)</span>
          <WeekChart data={pagesPerDay} />
        </div>
      )}
    </div>
  );
};
