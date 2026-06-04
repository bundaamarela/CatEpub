import { useEffect, useRef } from 'react';

import type { ThemeAutoSchedule, ThemeChoice } from '@/types/prefs';
import { applyTheme } from './apply';
import type { Theme } from './tokens';

/** Parse "HH:mm" → minutes since midnight. */
const toMinutes = (hhmm: string): number => {
  const sep = hhmm.indexOf(':');
  const h = parseInt(hhmm.slice(0, sep), 10);
  const m = parseInt(hhmm.slice(sep + 1), 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
};

export const resolveAuto = (now: Date, schedule: ThemeAutoSchedule): Theme => {
  const mins = now.getHours() * 60 + now.getMinutes();
  const light = toMinutes(schedule.lightStart);
  const dark = toMinutes(schedule.darkStart);
  if (light < dark) {
    return mins >= light && mins < dark ? 'light' : 'dark';
  }
  // wrap-around: light spans midnight
  return mins >= light || mins < dark ? 'light' : 'dark';
};

const CHECK_INTERVAL_MS = 60_000; // check every minute

/**
 * When theme === 'auto', polls the clock via requestAnimationFrame (never
 * setInterval) and applies the scheduled theme when it changes. The rAF loop
 * accumulates elapsed time so it only executes the check once per minute, and
 * it pauses automatically when the tab is hidden.
 */
export const useAutoTheme = (theme: ThemeChoice, schedule: ThemeAutoSchedule): void => {
  const rafRef = useRef<number | null>(null);
  const lastApplied = useRef<Theme | null>(null);
  const lastCheckAt = useRef<DOMHighResTimeStamp>(0);

  useEffect(() => {
    if (theme !== 'auto') {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const tick = (now: DOMHighResTimeStamp): void => {
      if (now - lastCheckAt.current >= CHECK_INTERVAL_MS) {
        lastCheckAt.current = now;
        const resolved = resolveAuto(new Date(), schedule);
        if (resolved !== lastApplied.current) {
          lastApplied.current = resolved;
          applyTheme(resolved);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    // Immediate first check, then start loop.
    const resolved = resolveAuto(new Date(), schedule);
    lastApplied.current = resolved;
    applyTheme(resolved);
    lastCheckAt.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [theme, schedule]);
};
