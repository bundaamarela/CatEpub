import { useCallback, useEffect, useRef } from 'react';

import { endSession, startSession } from './sessions';

const INACTIVITY_MS = 60_000;
const WORDS_PER_PAGE = 250;

interface UseReadingSessionResult {
  /** Chamar ao mudar de página (CFI novo). Reinicia o timer de inactividade. */
  notifyPageChange: (cfi: string) => void;
}

/**
 * Inicia uma sessão de leitura ao montar, termina ao desmontar.
 * Auto-pausa após `INACTIVITY_MS` ms sem mudança de página.
 */
export const useReadingSession = (
  bookId: string,
  getRendererCfi: () => string | undefined,
): UseReadingSessionResult => {
  const sessionIdRef = useRef<string | null>(null);
  const pagesReadRef = useRef(0);
  const inactivityRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearInactivity = (): void => {
    if (inactivityRef.current !== null) {
      clearTimeout(inactivityRef.current);
      inactivityRef.current = null;
    }
  };

  const scheduleInactivity = useCallback((): void => {
    clearInactivity();
    inactivityRef.current = setTimeout(() => {
      const id = sessionIdRef.current;
      if (!id) return;
      sessionIdRef.current = null;
      void endSession(id, getRendererCfi(), pagesReadRef.current);
    }, INACTIVITY_MS);
  }, [getRendererCfi]);

  useEffect(() => {
    const cfi = getRendererCfi() ?? '';
    void startSession(bookId, cfi).then((id) => {
      sessionIdRef.current = id;
      scheduleInactivity();
    });

    return () => {
      clearInactivity();
      const id = sessionIdRef.current;
      if (!id) return;
      sessionIdRef.current = null;
      void endSession(id, getRendererCfi(), pagesReadRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const notifyPageChange = useCallback(
    (cfi: string): void => {
      pagesReadRef.current += 1;
      const wordsEstimate = pagesReadRef.current * WORDS_PER_PAGE;
      // Restart session if it was paused by inactivity.
      if (sessionIdRef.current === null) {
        void startSession(bookId, cfi).then((id) => {
          sessionIdRef.current = id;
          scheduleInactivity();
        });
      } else {
        // Keep the live session's wordsRead estimate up to date.
        void import('./sessions').then(({ update }) =>
          sessionIdRef.current
            ? update(sessionIdRef.current, { wordsRead: wordsEstimate })
            : Promise.resolve(0),
        );
        scheduleInactivity();
      }
    },
    [bookId, scheduleInactivity],
  );

  return { notifyPageChange };
};
