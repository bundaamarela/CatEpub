export interface Quote {
  text: string;
  author: string;
  source?: string;
}

const PERIOD_MS = 8 * 60 * 60 * 1000;

const FALLBACK_QUOTES: Quote[] = [
  {
    text: 'Quem teme sofrer já sofre o que teme.',
    author: 'Michel de Montaigne',
    source: 'Ensaios',
  },
  {
    text: 'Não é porque as coisas são difíceis que não ousamos; é porque não ousamos que são difíceis.',
    author: 'Séneca',
    source: 'Cartas a Lucílio',
  },
  {
    text: 'A leitura faz o homem completo; a conversação fá-lo expedito; a escrita exacto.',
    author: 'John Locke',
    source: 'Of the Conduct of the Understanding',
  },
  {
    text: 'Tudo o que ouvimos é uma opinião, não um facto. Tudo o que vemos é uma perspectiva, não a verdade.',
    author: 'Marco Aurélio',
    source: 'Meditações',
  },
  {
    text: 'A história, na sua essência, é informação sobre a organização social humana.',
    author: 'Ibn Khaldun',
    source: 'Muqaddimah',
  },
];

export const getQuoteForPeriod = (quotes: Quote[] = FALLBACK_QUOTES, now: number = Date.now()): Quote => {
  const pool = quotes.length > 0 ? quotes : FALLBACK_QUOTES;
  const period = Math.floor(now / PERIOD_MS);
  const index = ((period % pool.length) + pool.length) % pool.length;
  return pool[index]!;
};

export const getCurrentPeriod = (now: number = Date.now()): number => Math.floor(now / PERIOD_MS);

export const loadQuotes = async (): Promise<Quote[]> => {
  try {
    const res = await fetch('/quotes.json', { cache: 'no-store' });
    if (!res.ok) return FALLBACK_QUOTES;
    const data: unknown = await res.json();
    if (!Array.isArray(data) || data.length === 0) return FALLBACK_QUOTES;
    const valid = data.filter(
      (q): q is Quote =>
        typeof q === 'object' &&
        q !== null &&
        typeof (q as Quote).text === 'string' &&
        typeof (q as Quote).author === 'string',
    );
    return valid.length > 0 ? valid : FALLBACK_QUOTES;
  } catch {
    return FALLBACK_QUOTES;
  }
};

export const PERIOD_MS_EXPORT = PERIOD_MS;

// ─── Web Notifications ────────────────────────────────────────────────────

const LAST_NOTIFIED_KEY = 'catepub_last_notified_period';
const NOTIFICATION_BODY_MAX = 120;

/**
 * Browsers without the Notification API (older Safari, locked-down PWA
 * shells) — we just no-op in that case.
 */
const notificationsSupported = (): boolean =>
  typeof window !== 'undefined' && 'Notification' in window;

/**
 * Asks the browser for permission to display Web Notifications. Resolves
 * `true` when the user grants, `false` for denied/default/unsupported.
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
};

/**
 * Fires a Web Notification for the given quote if (a) permission is
 * granted and (b) we haven't already notified in the current 8-hour
 * period. Once-per-period is enforced via localStorage so even if the
 * Home tab is open across multiple period boundaries, the user gets a
 * single ping per window.
 *
 * No-op outside the browser, when permission isn't granted, or when the
 * Notifications API is missing.
 */
export const scheduleQuoteNotification = (
  quote: Quote,
  now: number = Date.now(),
): void => {
  if (!notificationsSupported()) return;
  if (Notification.permission !== 'granted') return;

  const period = getCurrentPeriod(now);
  let lastNotified: number | null = null;
  try {
    const raw = localStorage.getItem(LAST_NOTIFIED_KEY);
    if (raw !== null) {
      const parsed = Number(raw);
      if (Number.isFinite(parsed)) lastNotified = parsed;
    }
  } catch {
    // localStorage unavailable (private mode) — treat as never notified.
  }
  if (lastNotified === period) return;

  const body =
    quote.text.length > NOTIFICATION_BODY_MAX
      ? `${quote.text.slice(0, NOTIFICATION_BODY_MAX).trimEnd()}…`
      : quote.text;

  try {
    new Notification(quote.author, { body, icon: '/favicon.ico' });
  } catch {
    return;
  }
  try {
    localStorage.setItem(LAST_NOTIFIED_KEY, String(period));
  } catch {
    // localStorage write failed — accept the duplicate-notification risk.
  }
};

export const LAST_NOTIFIED_KEY_EXPORT = LAST_NOTIFIED_KEY;
