export const WELCOME_STORAGE_KEY = 'catepub_welcome_v1';

/** Reads the dismissed flag from localStorage; safe in SSR / private mode. */
export const isWelcomeDismissed = (): boolean => {
  try {
    return localStorage.getItem(WELCOME_STORAGE_KEY) === 'dismissed';
  } catch {
    return false;
  }
};

export const markWelcomeDismissed = (): void => {
  try {
    localStorage.setItem(WELCOME_STORAGE_KEY, 'dismissed');
  } catch {
    /* ignore quota / private mode errors */
  }
};
