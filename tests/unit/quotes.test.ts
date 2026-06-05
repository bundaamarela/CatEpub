import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getCurrentPeriod,
  getQuoteForPeriod,
  loadQuotes,
  requestNotificationPermission,
  scheduleQuoteNotification,
  type Quote,
} from '@/lib/quotes/quotes';

const PERIOD = 8 * 60 * 60 * 1000;

const sample: Quote[] = [
  { text: 'A', author: 'AuthorA' },
  { text: 'B', author: 'AuthorB', source: 'Book' },
  { text: 'C', author: 'AuthorC' },
];

describe('getQuoteForPeriod', () => {
  it('returns the same quote within the same 8-hour period', () => {
    const t1 = 100 * PERIOD + 1000;
    const t2 = 100 * PERIOD + PERIOD - 1;
    expect(getQuoteForPeriod(sample, t1)).toEqual(getQuoteForPeriod(sample, t2));
  });

  it('returns a different quote in the next 8-hour period', () => {
    const a = getQuoteForPeriod(sample, 100 * PERIOD);
    const b = getQuoteForPeriod(sample, 101 * PERIOD);
    expect(a).not.toEqual(b);
  });

  it('selection is deterministic for a fixed period', () => {
    const t = 12345 * PERIOD + 17;
    expect(getQuoteForPeriod(sample, t)).toBe(getQuoteForPeriod(sample, t));
  });

  it('uses fallback when the provided array is empty', () => {
    const q = getQuoteForPeriod([], 0);
    expect(q.text.length).toBeGreaterThan(0);
    expect(q.author.length).toBeGreaterThan(0);
  });

  it('cycles through all quotes across successive periods', () => {
    const seen = new Set<string>();
    for (let i = 0; i < sample.length; i += 1) {
      seen.add(getQuoteForPeriod(sample, i * PERIOD).text);
    }
    expect(seen.size).toBe(sample.length);
  });
});

describe('getCurrentPeriod', () => {
  it('increments after 8 hours', () => {
    expect(getCurrentPeriod(0)).toBe(0);
    expect(getCurrentPeriod(PERIOD - 1)).toBe(0);
    expect(getCurrentPeriod(PERIOD)).toBe(1);
  });
});

describe('loadQuotes', () => {
  const originalFetch = globalThis.fetch;
  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('returns parsed array when fetch succeeds', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => sample,
    } as Response);
    const out = await loadQuotes();
    expect(out).toEqual(sample);
  });

  it('returns fallback when fetch fails', async () => {
    vi.mocked(globalThis.fetch).mockRejectedValueOnce(new Error('network'));
    const out = await loadQuotes();
    expect(out.length).toBeGreaterThan(0);
    expect(out[0]!.author.length).toBeGreaterThan(0);
  });

  it('returns fallback when response is not ok', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => [],
    } as Response);
    const out = await loadQuotes();
    expect(out.length).toBeGreaterThan(0);
  });

  it('returns fallback when array is empty', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    } as Response);
    const out = await loadQuotes();
    expect(out.length).toBeGreaterThan(0);
  });

  it('filters out invalid entries', async () => {
    vi.mocked(globalThis.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => [
        { text: 'ok', author: 'A' },
        { text: 123, author: 'B' },
        { author: 'no text' },
        null,
        'not an object',
      ],
    } as Response);
    const out = await loadQuotes();
    expect(out).toHaveLength(1);
    expect(out[0]!.text).toBe('ok');
  });
});

interface MockNotification {
  title: string;
  options: NotificationOptions | undefined;
}

interface NotificationCtor {
  (this: unknown, title: string, options?: NotificationOptions): void;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
}

const installNotificationMock = (
  permission: NotificationPermission,
  requestImpl?: () => Promise<NotificationPermission>,
): { calls: MockNotification[]; restore: () => void; setPermission: (p: NotificationPermission) => void } => {
  const calls: MockNotification[] = [];
  const original = (globalThis as { Notification?: unknown }).Notification;

  const ctor = function (this: unknown, title: string, options?: NotificationOptions): void {
    calls.push({ title, options });
  } as unknown as NotificationCtor;
  ctor.permission = permission;
  ctor.requestPermission = requestImpl ?? (async () => 'denied' as NotificationPermission);

  Object.defineProperty(globalThis, 'Notification', {
    configurable: true,
    writable: true,
    value: ctor,
  });

  return {
    calls,
    setPermission: (p) => {
      ctor.permission = p;
    },
    restore: () => {
      if (original === undefined) {
        delete (globalThis as { Notification?: unknown }).Notification;
      } else {
        Object.defineProperty(globalThis, 'Notification', {
          configurable: true,
          writable: true,
          value: original,
        });
      }
    },
  };
};

const quote = (overrides: Partial<Quote> = {}): Quote => ({
  text: 'Texto da frase',
  author: 'Autor',
  ...overrides,
});

describe('requestNotificationPermission', () => {
  let restore: (() => void) | undefined;
  afterEach(() => {
    restore?.();
    restore = undefined;
  });

  it('returns true when permission is already granted (no prompt)', async () => {
    const ask = vi.fn(async () => 'denied' as NotificationPermission);
    const mock = installNotificationMock('granted', ask);
    restore = mock.restore;

    expect(await requestNotificationPermission()).toBe(true);
    expect(ask).not.toHaveBeenCalled();
  });

  it('returns false immediately when permission is denied', async () => {
    const ask = vi.fn(async () => 'granted' as NotificationPermission);
    const mock = installNotificationMock('denied', ask);
    restore = mock.restore;

    expect(await requestNotificationPermission()).toBe(false);
    expect(ask).not.toHaveBeenCalled();
  });

  it('asks the user when permission is default and reflects the answer', async () => {
    const ask = vi.fn(async () => 'granted' as NotificationPermission);
    const mock = installNotificationMock('default', ask);
    restore = mock.restore;

    expect(await requestNotificationPermission()).toBe(true);
    expect(ask).toHaveBeenCalledOnce();
  });

  it('returns false when Notification API is missing', async () => {
    const original = (globalThis as { Notification?: unknown }).Notification;
    delete (globalThis as { Notification?: unknown }).Notification;
    restore = () => {
      if (original !== undefined) {
        Object.defineProperty(globalThis, 'Notification', {
          configurable: true,
          writable: true,
          value: original,
        });
      }
    };

    expect(await requestNotificationPermission()).toBe(false);
  });
});

describe('scheduleQuoteNotification', () => {
  let restore: (() => void) | undefined;
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    restore?.();
    restore = undefined;
    localStorage.clear();
  });

  it('fires a notification with author as title and quote text as body', () => {
    const mock = installNotificationMock('granted');
    restore = mock.restore;
    const q = quote({ author: 'Séneca', text: 'Brevis ipsa vita est sed malis fit longior.' });

    scheduleQuoteNotification(q, 1_000);
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]!.title).toBe('Séneca');
    expect(mock.calls[0]!.options?.body).toBe('Brevis ipsa vita est sed malis fit longior.');
    expect(mock.calls[0]!.options?.icon).toBe('/favicon.ico');
  });

  it('truncates body to 120 chars with an ellipsis when longer', () => {
    const mock = installNotificationMock('granted');
    restore = mock.restore;
    const long = 'a'.repeat(200);
    scheduleQuoteNotification(quote({ text: long }), 1_000);

    const body = mock.calls[0]!.options?.body ?? '';
    expect(body.length).toBe(121); // 120 chars + ellipsis
    expect(body.endsWith('…')).toBe(true);
    expect(body.startsWith('a'.repeat(120))).toBe(true);
  });

  it('does not truncate body when it is exactly 120 chars', () => {
    const mock = installNotificationMock('granted');
    restore = mock.restore;
    const exact = 'b'.repeat(120);
    scheduleQuoteNotification(quote({ text: exact }), 1_000);

    expect(mock.calls[0]!.options?.body).toBe(exact);
  });

  it('only fires once per 8-hour period even if called repeatedly', () => {
    const mock = installNotificationMock('granted');
    restore = mock.restore;
    const insidePeriod = 5_000;
    const stillInsidePeriod = 7_999_999;

    scheduleQuoteNotification(quote({ text: 'first' }), insidePeriod);
    scheduleQuoteNotification(quote({ text: 'second' }), stillInsidePeriod);
    expect(mock.calls).toHaveLength(1);
  });

  it('fires again in the next 8-hour period', () => {
    const mock = installNotificationMock('granted');
    restore = mock.restore;
    const PERIOD_LEN = 8 * 60 * 60 * 1000;

    scheduleQuoteNotification(quote({ text: 'window-A' }), 1_000);
    scheduleQuoteNotification(quote({ text: 'window-B' }), PERIOD_LEN + 1_000);
    expect(mock.calls).toHaveLength(2);
  });

  it('is a no-op when permission is not granted', () => {
    const mock = installNotificationMock('default');
    restore = mock.restore;
    scheduleQuoteNotification(quote(), 1_000);
    expect(mock.calls).toHaveLength(0);
  });

  it('is a no-op when the Notification API is missing', () => {
    const original = (globalThis as { Notification?: unknown }).Notification;
    delete (globalThis as { Notification?: unknown }).Notification;
    restore = () => {
      if (original !== undefined) {
        Object.defineProperty(globalThis, 'Notification', {
          configurable: true,
          writable: true,
          value: original,
        });
      }
    };
    // Should not throw.
    expect(() => scheduleQuoteNotification(quote(), 1_000)).not.toThrow();
  });
});
