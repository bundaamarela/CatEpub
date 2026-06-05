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
