import { useEffect, useState } from 'react';

import { getDueCount } from './scheduler';

/** Polling interval (ms) for the due-count badge. */
const POLL_INTERVAL_MS = 5 * 60_000;

/**
 * Sondagem reactiva da contagem de cards `due`.
 * Faz fetch ao montar e a cada 5 minutos. Devolve `null` enquanto
 * a primeira leitura ainda não chegou.
 */
export const useDueCount = (): number | null => {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = async (): Promise<void> => {
      try {
        const n = await getDueCount();
        if (!cancelled) setCount(n);
      } catch {
        /* ignore — keep last known value */
      }
    };
    void refresh();
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return count;
};
