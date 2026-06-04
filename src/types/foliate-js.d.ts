/**
 * Tipos ambientes mínimos para foliate-js (vendorizada como submódulo em
 * vendor/foliate-js, com alias Vite). Cobre apenas a superfície usada em
 * src/lib/epub/.
 */

declare module 'foliate-js/view.js' {
  export class ResponseError extends Error {}
  export class NotFoundError extends Error {}
  export class UnsupportedTypeError extends Error {}

  export interface FoliateMetadata {
    title?: string | Record<string, string>;
    author?:
      | string
      | { name?: string | Record<string, string> }
      | Array<string | { name?: string | Record<string, string> }>;
    language?: string | string[];
    publisher?: string | { name?: string };
    published?: string;
    description?: string;
    identifier?: string;
    subject?: string | string[] | Array<{ name?: string }>;
    [key: string]: unknown;
  }

  export interface FoliateTOCItem {
    label: string;
    href: string;
    subitems?: FoliateTOCItem[];
  }

  export interface FoliateBook {
    metadata?: FoliateMetadata;
    toc?: FoliateTOCItem[];
    pageList?: FoliateTOCItem[];
    sections: Array<{
      load(): string | Promise<string>;
      unload?(): void;
      createDocument?(): Document | Promise<Document>;
      size?: number;
      linear?: string;
      cfi?: string;
      id?: string | number;
    }>;
    dir?: 'ltr' | 'rtl';
    rendition?: { layout?: 'reflowable' | 'pre-paginated' };
    landmarks?: Array<{ type?: string[]; href?: string }>;
    resolveHref?(href: string): { index: number; anchor?: (doc: Document) => Node | Range | null };
    resolveCFI?(cfi: string): { index: number; anchor?: (doc: Document) => Node | Range | null };
    splitTOCHref?(href: string): Promise<[string | number, unknown]>;
    getTOCFragment?(doc: Document, id: unknown): Node | null;
    getCover?(): Promise<Blob | null>;
  }

  /** Cria um book a partir de File/Blob/URL. */
  export function makeBook(input: Blob | File | string): Promise<FoliateBook>;

  export interface RelocateDetail {
    fraction?: number;
    location?: { current?: number; next?: number; total?: number };
    tocItem?: FoliateTOCItem | null;
    pageItem?: FoliateTOCItem | null;
    cfi?: string;
    range?: Range;
    index?: number;
  }

  export interface FoliateAnnotation {
    /** CFI (range ou ponto). */
    value: string;
    /** Cor opcional usada pelo nosso draw handler. */
    color?: string;
    [key: string]: unknown;
  }

  export interface DrawAnnotationDetail {
    draw: (
      func: (rects: ReadonlyArray<DOMRect>, options?: Record<string, unknown>) => Element,
      opts?: Record<string, unknown>,
    ) => void;
    annotation: FoliateAnnotation;
    doc: Document;
    range: Range;
  }

  export interface ShowAnnotationDetail {
    value: string;
    index: number;
    range: Range;
  }

  export class View extends HTMLElement {
    book?: FoliateBook;
    isFixedLayout?: boolean;
    renderer?: HTMLElement & {
      goTo(arg: unknown): Promise<void>;
      next(): Promise<void> | void;
      prev(): Promise<void> | void;
      destroy?(): void;
      getContents?(): { doc: Document; index: number; range?: Range };
      setAttribute(name: string, value: string): void;
    };
    lastLocation?: RelocateDetail | null;

    open(input: Blob | File | string | FoliateBook): Promise<void>;
    close(): void;
    init(opts?: { lastLocation?: string; showTextStart?: boolean }): Promise<void>;
    goTo(target: string | number | { index: number; anchor?: unknown }): Promise<void>;
    goToFraction(fraction: number): Promise<void>;
    next(): Promise<void> | void;
    prev(): Promise<void> | void;
    getCFI(index: number, range?: Range): string;
    addAnnotation(
      annotation: FoliateAnnotation,
      remove?: boolean,
    ): Promise<{ index: number; label: string } | undefined>;
    deleteAnnotation(annotation: FoliateAnnotation): Promise<unknown>;
    showAnnotation(annotation: FoliateAnnotation): Promise<void>;
  }
}

declare module 'foliate-js/overlayer.js' {
  type DrawFn = (rects: ReadonlyArray<DOMRect>, options?: Record<string, unknown>) => Element;

  export class Overlayer {
    static highlight: DrawFn;
    static underline: DrawFn;
    static squiggly: DrawFn;
    static strikethrough: DrawFn;
    static outline: DrawFn;
  }
}
