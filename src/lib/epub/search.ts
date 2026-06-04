import type { FoliateBook } from 'foliate-js/view.js';

export interface SearchHit {
  /** CFI da `Range` exacta da ocorrência. */
  cfi: string;
  /** Index da section dentro de `book.sections`. */
  sectionIndex: number;
  /** Excerto: texto + ~30 chars antes/depois. */
  excerpt: string;
  /** Posição do match dentro de `excerpt`. */
  matchStart: number;
  matchEnd: number;
}

const CONTEXT = 30;

const collectTextNodes = (root: Node): Text[] => {
  const out: Text[] = [];
  const walker = root.ownerDocument!.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => {
      const parent = (n as Text).parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      const tag = parent.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let n = walker.nextNode();
  while (n) {
    out.push(n as Text);
    n = walker.nextNode();
  }
  return out;
};

interface SearchOptions {
  query: string;
  signal?: AbortSignal;
  /** Cap to avoid runaway results. */
  maxHits?: number;
  cfiFor: (sectionIndex: number, range: Range) => string | null;
}

/**
 * Busca full-text dentro de um livro foliate-js, secção a secção. Cancelável
 * via `signal`: o loop verifica `signal.aborted` entre secções e a meio de
 * loops longos. Devolve uma lista vazia se cancelada antes de produzir hits.
 *
 * Não normaliza diacríticos por defeito — o caller pode pré-processar a
 * query se quiser pesquisa accent-insensitive (Phase 8 minimal: case-insensitive).
 */
export const searchInBook = async (
  book: FoliateBook,
  { query, signal, maxHits = 200, cfiFor }: SearchOptions,
): Promise<SearchHit[]> => {
  const needle = query.trim();
  if (needle.length === 0) return [];
  const lowerNeedle = needle.toLowerCase();
  const hits: SearchHit[] = [];

  for (let i = 0; i < book.sections.length; i++) {
    if (signal?.aborted) return hits;
    const section = book.sections[i];
    if (!section) continue;
    let doc: Document | null;
    try {
      if (typeof section.createDocument === 'function') {
        doc = await section.createDocument();
      } else {
        const html = await section.load();
        const xhtml = new DOMParser().parseFromString(html, 'application/xhtml+xml');
        doc = xhtml.querySelector('parsererror')
          ? new DOMParser().parseFromString(html, 'text/html')
          : xhtml;
      }
    } catch {
      continue;
    }
    if (!doc?.body) continue;

    const textNodes = collectTextNodes(doc.body);
    for (const tn of textNodes) {
      if (signal?.aborted) return hits;
      const data = tn.data;
      const haystack = data.toLowerCase();
      let from = 0;
      while (true) {
        const idx = haystack.indexOf(lowerNeedle, from);
        if (idx === -1) break;
        const range = doc.createRange();
        range.setStart(tn, idx);
        range.setEnd(tn, idx + needle.length);
        const cfi = cfiFor(i, range);
        if (cfi !== null) {
          const before = data.slice(Math.max(0, idx - CONTEXT), idx).replace(/\s+/g, ' ');
          const match = data.slice(idx, idx + needle.length);
          const after = data
            .slice(idx + needle.length, idx + needle.length + CONTEXT)
            .replace(/\s+/g, ' ');
          const excerpt = `${before}${match}${after}`.trim();
          hits.push({
            cfi,
            sectionIndex: i,
            excerpt,
            matchStart: before.trimStart().length,
            matchEnd: before.trimStart().length + match.length,
          });
          if (hits.length >= maxHits) return hits;
        }
        from = idx + needle.length;
      }
    }

    // Cleanup: foliate-js section may keep the rendered doc cached otherwise.
    try {
      section.unload?.();
    } catch {
      /* ignore */
    }

    // Yield to event loop so the UI stays responsive on long searches.
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  return hits;
};
