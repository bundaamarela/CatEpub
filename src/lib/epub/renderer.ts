import type {
  DrawAnnotationDetail,
  FoliateBook,
  FoliateTOCItem,
  RelocateDetail,
  ShowAnnotationDetail,
  View,
} from 'foliate-js/view.js';
import { Overlayer } from 'foliate-js/overlayer.js';

import type { FontFamily } from '@/lib/theme/tokens';
import type { HighlightColor } from '@/types/highlight';

let registered = false;
/**
 * Garante que o custom element `<foliate-view>` está registado. O módulo
 * `view.js` regista-o como side-effect no `import` — chamamos uma vez por
 * ciclo de vida do bundle.
 */
const ensureRegistered = async (): Promise<void> => {
  if (registered) return;
  registered = true;
  // Side-effect import: regista `customElements.define('foliate-view', View)`.
  await import('foliate-js/view.js');
};

export interface RendererStyles {
  fontFamily: FontFamily;
  /** px */
  fontSize: number;
  lineHeight: number;
  /** px — coluna máxima */
  pageWidth: number;
  /** Multiplicador, aplicado como `${value}em` no `margin-block-end` dos parágrafos. */
  paragraphSpacing: number;
  /** em (positivo ou negativo). */
  letterSpacing: number;
  /** Cor de fundo derivada do tema activo (hex/rgb/var resolvida). */
  background: string;
  /** Cor de texto derivada do tema activo. */
  text: string;
}

export interface RendererOptions extends RendererStyles {
  paginationMode: 'paginated' | 'scroll';
}

export type RelocateListener = (info: RelocateDetail) => void;
export type SelectionListener = (info: {
  text: string;
  cfiRange: string | null;
  range: Range | null;
  doc: Document | null;
}) => void;
export type AnnotationClickListener = (cfiRange: string) => void;

export interface EpubAnnotation {
  cfiRange: string;
  color: HighlightColor;
}

export interface EpubRenderer {
  /** Substitui completamente o conjunto de estilos aplicados ao iframe. */
  applyStyles(styles: RendererStyles): void;
  setPaginationMode(mode: 'paginated' | 'scroll'): void;
  goToCfi(cfi: string): Promise<void>;
  goToHref(href: string): Promise<void>;
  nextPage(): Promise<void>;
  prevPage(): Promise<void>;
  /** CFI da localização visível actual (ou `undefined` antes do primeiro relocate). */
  getCurrentCfi(): string | undefined;
  /** Href do TOC item visível actual (relocate.tocItem). */
  getCurrentTocHref(): string | undefined;
  /** TOC plano e hierárquico do livro (vazio se não disponível). */
  getToc(): ReadonlyArray<FoliateTOCItem>;
  /** Acesso ao livro foliate-js subjacente — usado pela busca cross-section. */
  getBook(): FoliateBook;
  /** Para uma `index` de section, computa o CFI duma `Range` interna. */
  cfiFor(index: number, range: Range): string | null;
  /** Subscreve mudanças de posição. Devolve unsubscribe. */
  onLocationChange(listener: RelocateListener): () => void;
  /** Subscreve mudanças de selecção dentro do iframe. Devolve unsubscribe. */
  onSelectionChange(listener: SelectionListener): () => void;
  /**
   * Substitui o conjunto inteiro de highlights a desenhar — calcula diff
   * com o estado interno e invoca add/delete por CFI alterado/novo/ausente.
   */
  setHighlights(items: ReadonlyArray<EpubAnnotation>): void;
  /** Adiciona/actualiza um único highlight. */
  addHighlight(item: EpubAnnotation): void;
  /** Remove um único highlight pelo seu CFI range. */
  removeHighlight(cfiRange: string): void;
  /** Subscreve cliques sobre highlights existentes (overlayer hit-test). */
  onAnnotationClick(listener: AnnotationClickListener): () => void;
  /** Liberta recursos e remove o `<foliate-view>` do host. */
  destroy(): void;
  /**
   * Devolve o texto completo do documento activo (para TTS).
   * Devolve cadeia vazia se ainda não houver secção carregada.
   */
  getActiveText(): string;
  /**
   * Marca com `class="tts-active"` o elemento de bloco mais próximo do
   * nó de texto em `charIndex` dentro do documento activo.
   * Se `charIndex < 0`, remove a marcação anterior.
   */
  markTtsPosition(charIndex: number): void;
  /** Remove qualquer marcação tts-active do documento activo. */
  clearTtsHighlight(): void;
}

const FONT_STACK: Record<FontFamily, string> = {
  serif: "'Lora', Georgia, 'Times New Roman', serif",
  sans: "'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif",
  dyslexic: "'Atkinson Hyperlegible', 'OpenDyslexic', sans-serif",
};

/**
 * Gera o CSS a injectar no iframe do renderer. Usa `!important` para vencer
 * estilos inline do EPUB (foliate dá prioridade ao CSS do livro por defeito).
 */
const buildIframeCss = (s: RendererStyles): string => {
  const family = FONT_STACK[s.fontFamily];
  return `
@namespace epub "http://www.idpf.org/2007/ops";
html, body {
  background: ${s.background} !important;
  color: ${s.text} !important;
  font-family: ${family} !important;
  font-size: ${s.fontSize}px !important;
  line-height: ${s.lineHeight} !important;
  letter-spacing: ${s.letterSpacing}em !important;
}
p, li, blockquote {
  font-family: inherit !important;
  font-size: inherit !important;
  line-height: inherit !important;
}
p { margin-block-end: ${s.paragraphSpacing}em !important; }
a { color: ${s.text} !important; text-decoration: underline; text-underline-offset: 2px; }
img, svg, video { max-width: 100% !important; height: auto !important; }
::selection { background: rgba(255, 220, 0, 0.35); }
.tts-active { background: rgba(255, 220, 0, 0.35) !important; border-radius: 2px; }
`;
};

interface MountOpts {
  host: HTMLElement;
  book: FoliateBook;
  options: RendererOptions;
  /** CFI inicial — se ausente, abre na primeira página. */
  startCfi?: string;
}

export const createRenderer = async ({
  host,
  book,
  options,
  startCfi,
}: MountOpts): Promise<EpubRenderer> => {
  await ensureRegistered();

  // Limpa o host antes de inserir.
  host.replaceChildren();
  const view = document.createElement('foliate-view') as View;
  view.style.width = '100%';
  view.style.height = '100%';
  view.style.display = 'block';
  host.appendChild(view);

  await view.open(book);

  const applyAttrs = (mode: 'paginated' | 'scroll', width: number): void => {
    if (!view.renderer) return;
    view.renderer.setAttribute('flow', mode === 'scroll' ? 'scrolled' : 'paginated');
    // O nosso chrome é externo: deixamos margin = 0 dentro do iframe.
    view.renderer.setAttribute('margin', '0px');
    view.renderer.setAttribute('gap', '6%');
    view.renderer.setAttribute('max-inline-size', `${width}px`);
    view.renderer.setAttribute('animated', '');
  };

  applyAttrs(options.paginationMode, options.pageWidth);

  // foliate-js view.init() requer sempre um objecto (destructure interno).
  // Passa `lastLocation` se existir, ou objecto vazio para abrir do início.
  await view.init(startCfi !== undefined ? { lastLocation: startCfi } : ({} as Parameters<View['init']>[0]));

  const applyStyles = (styles: RendererStyles): void => {
    const css = buildIframeCss(styles);
    type Styler = HTMLElement & { setStyles?: (css: string) => void };
    const renderer = view.renderer as Styler | undefined;
    renderer?.setStyles?.(css);
    applyAttrs(currentMode, styles.pageWidth);
  };

  let currentMode: 'paginated' | 'scroll' = options.paginationMode;
  let currentDoc: Document | null = null;
  applyStyles(options);

  let currentCfi: string | undefined;
  let currentTocHref: string | undefined;
  const locationListeners = new Set<RelocateListener>();
  const selectionListeners = new Set<SelectionListener>();
  const annotationClickListeners = new Set<AnnotationClickListener>();
  const highlightState = new Map<string, EpubAnnotation>();

  const COLOR_FALLBACKS: Record<HighlightColor, string> = {
    yellow: '#fff3a8',
    green: '#c8e6b8',
    blue: '#b8d8f0',
    pink: '#f0c8d8',
    purple: '#d8c8f0',
  };

  const resolveColor = (color: HighlightColor): string => {
    const v = getComputedStyle(host).getPropertyValue(`--highlight-${color}`).trim();
    return v.length > 0 ? v : COLOR_FALLBACKS[color];
  };

  const drawHandler = (e: Event): void => {
    const detail = (e as CustomEvent<DrawAnnotationDetail>).detail;
    const anno = detail.annotation as { color?: HighlightColor };
    const color = anno.color !== undefined ? resolveColor(anno.color) : COLOR_FALLBACKS.yellow;
    detail.draw(Overlayer.highlight, { color });
  };
  view.addEventListener('draw-annotation', drawHandler);

  const showAnnotationHandler = (e: Event): void => {
    const detail = (e as CustomEvent<ShowAnnotationDetail>).detail;
    for (const fn of annotationClickListeners) fn(detail.value);
  };
  view.addEventListener('show-annotation', showAnnotationHandler);

  // Foliate cria o overlayer da secção quando o utilizador navega para ela. O
  // overlayer perde o estado quando a secção sai do DOM, por isso re-aplicamos
  // todas as highlights conhecidas sempre que uma nova secção é montada. Cada
  // `addAnnotation` resolve o CFI e ignora silenciosamente os que não pertencem
  // à secção activa.
  const reapplyHighlights = (): void => {
    setTimeout(() => {
      for (const a of highlightState.values()) {
        void view.addAnnotation({ value: a.cfiRange, color: a.color });
      }
    }, 0);
  };
  view.addEventListener('create-overlay', reapplyHighlights);

  const relocateHandler = (e: Event): void => {
    const detail = (e as CustomEvent<RelocateDetail>).detail;
    if (typeof detail?.cfi === 'string') currentCfi = detail.cfi;
    const tocHref = detail?.tocItem?.href;
    if (typeof tocHref === 'string') currentTocHref = tocHref;
    for (const fn of locationListeners) fn(detail);
  };
  view.addEventListener('relocate', relocateHandler);

  // Selecção dentro do iframe — escutamos `selectionchange` no documento do
  // capítulo activo. Foliate emite o evento `load` quando carrega uma section.
  const onLoad = (e: Event): void => {
    const detail = (e as CustomEvent<{ doc: Document; index: number }>).detail;
    const doc = detail?.doc;
    if (!doc) return;
    currentDoc = doc;
    doc.addEventListener('selectionchange', () => {
      const sel = doc.getSelection();
      const text = sel?.toString() ?? '';
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      let cfiRange: string | null = null;
      try {
        if (range && typeof view.getCFI === 'function' && typeof detail.index === 'number') {
          cfiRange = view.getCFI(detail.index, range);
        }
      } catch {
        cfiRange = null;
      }
      for (const fn of selectionListeners) fn({ text, cfiRange, range, doc });
    });
  };
  view.addEventListener('load', onLoad);

  const renderer: EpubRenderer = {
    applyStyles,
    setPaginationMode(mode) {
      currentMode = mode;
      applyAttrs(mode, options.pageWidth);
    },
    async goToCfi(cfi) {
      await view.goTo(cfi);
    },
    async goToHref(href) {
      // foliate-js aceita tanto CFI como href em view.goTo.
      await view.goTo(href);
    },
    async nextPage() {
      await view.next();
    },
    async prevPage() {
      await view.prev();
    },
    getCurrentCfi() {
      return currentCfi;
    },
    getCurrentTocHref() {
      return currentTocHref;
    },
    getToc() {
      return book.toc ?? [];
    },
    getBook() {
      return book;
    },
    cfiFor(index, range) {
      try {
        return view.getCFI(index, range);
      } catch {
        return null;
      }
    },
    onLocationChange(listener) {
      locationListeners.add(listener);
      return () => locationListeners.delete(listener);
    },
    onSelectionChange(listener) {
      selectionListeners.add(listener);
      return () => selectionListeners.delete(listener);
    },
    setHighlights(items) {
      const nextKeys = new Set(items.map((i) => i.cfiRange));
      for (const key of [...highlightState.keys()]) {
        if (!nextKeys.has(key)) {
          highlightState.delete(key);
          void view.deleteAnnotation({ value: key });
        }
      }
      for (const item of items) {
        const existing = highlightState.get(item.cfiRange);
        if (!existing || existing.color !== item.color) {
          highlightState.set(item.cfiRange, { ...item });
          void view.addAnnotation({ value: item.cfiRange, color: item.color });
        }
      }
    },
    addHighlight(item) {
      highlightState.set(item.cfiRange, { ...item });
      void view.addAnnotation({ value: item.cfiRange, color: item.color });
    },
    removeHighlight(cfiRange) {
      highlightState.delete(cfiRange);
      void view.deleteAnnotation({ value: cfiRange });
    },
    onAnnotationClick(listener) {
      annotationClickListeners.add(listener);
      return () => annotationClickListeners.delete(listener);
    },
    getActiveText() {
      return currentDoc?.body?.textContent ?? '';
    },
    markTtsPosition(charIndex) {
      if (!currentDoc) return;
      currentDoc.querySelectorAll('.tts-active').forEach((el) => el.classList.remove('tts-active'));
      if (charIndex < 0) return;
      const walker = currentDoc.createTreeWalker(currentDoc.body, NodeFilter.SHOW_TEXT);
      let offset = 0;
      let found: Text | null = null;
      let cur = walker.nextNode() as Text | null;
      while (cur !== null) {
        const len = cur.textContent?.length ?? 0;
        if (offset + len > charIndex) { found = cur; break; }
        offset += len;
        cur = walker.nextNode() as Text | null;
      }
      if (!found) return;
      const BLOCK_TAGS = new Set(['P', 'LI', 'BLOCKQUOTE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'SECTION', 'ARTICLE']);
      let el: Element | null = found.parentElement;
      while (el && !BLOCK_TAGS.has(el.tagName)) el = el.parentElement;
      el?.classList.add('tts-active');
    },
    clearTtsHighlight() {
      currentDoc?.querySelectorAll('.tts-active').forEach((el) => el.classList.remove('tts-active'));
    },
    destroy() {
      view.removeEventListener('relocate', relocateHandler);
      view.removeEventListener('load', onLoad);
      view.removeEventListener('draw-annotation', drawHandler);
      view.removeEventListener('show-annotation', showAnnotationHandler);
      view.removeEventListener('create-overlay', reapplyHighlights);
      locationListeners.clear();
      selectionListeners.clear();
      annotationClickListeners.clear();
      highlightState.clear();
      try {
        view.close();
      } catch {
        // best-effort
      }
      view.remove();
    },
  };

  return renderer;
};
