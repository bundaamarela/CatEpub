import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/shallow';
import { ulid } from 'ulid';

import { AiPopover, type PopoverPosition } from '@/components/reader/AiPopover';
import { FocusCheckinDialog } from '@/components/reader/FocusCheckinDialog';
import { HighlightToolbar, type HighlightSelection } from '@/components/reader/HighlightToolbar';
import { MetadataEditor } from '@/components/library/MetadataEditor';
import { PanelChat } from '@/components/reader/PanelChat';
import { PanelNotes } from '@/components/reader/PanelNotes';
import { PanelOverlay } from '@/components/reader/PanelOverlay';
import { PanelSearch } from '@/components/reader/PanelSearch';
import { PanelSettings } from '@/components/reader/PanelSettings';
import { PanelTOC } from '@/components/reader/PanelTOC';
import { ReaderSurface } from '@/components/reader/ReaderSurface';
import { ReaderTopBar } from '@/components/reader/ReaderTopBar';
import { Toast } from '@/components/shared/Toast';
import { generateText, isAiEnabled } from '@/lib/ai/client';
import {
  DEFINE_SYSTEM,
  TRANSLATE_SYSTEM,
  definePrompt,
  translatePrompt,
} from '@/lib/ai/prompts';
import { searchInBook } from '@/lib/epub/search';
import * as positions from '@/lib/db/positions';
import * as books from '@/lib/db/books';
import * as bookmarksDb from '@/lib/db/bookmarks';
import * as flashcardsDb from '@/lib/db/flashcards';
import * as notesDb from '@/lib/db/notes';
import { getAutocompleteCandidates } from '@/lib/knowledge/backlinks';
import { refreshBacklinksForSource } from '@/lib/knowledge/persist-backlinks';
import { generateWithAi, highlightToCard } from '@/lib/srs/card-generator';
import type { EpubAnnotation, EpubRenderer, RendererOptions } from '@/lib/epub/renderer';
import type { FoliateTOCItem } from 'foliate-js/view.js';
import {
  HIGHLIGHT_QUERY_KEYS,
  useAddHighlight,
  useHighlightsByBook,
  useRemoveHighlight,
  useUpdateHighlight,
} from '@/lib/store/highlights';
import { BOOK_QUERY_KEYS, useBook, useBooks } from '@/lib/store/library';
import { usePrefs } from '@/lib/store/prefs';
import { readColorToken } from '@/lib/theme/colors';
import { useAutoTheme } from '@/lib/theme/useAutoTheme';
import { WebSpeechTTS } from '@/lib/tts/webspeech';
import { useBreakpoint } from '@/lib/utils/useBreakpoint';
import { cn } from '@/lib/utils/cn';
import { debounce } from '@/lib/utils/debounce';
import type { Highlight, HighlightColor } from '@/types/highlight';
import type { ReadingPosition } from '@/types/book';
import styles from './Reader.module.css';

type Panel = 'notes' | 'settings' | 'toc' | 'search' | 'chat' | null;

/** Minimum upward swipe distance (px) to open settings from the bottom zone. */
const SWIPE_THRESHOLD = 50;
/** Maximum time (ms) for the swipe gesture to count. */
const SWIPE_MAX_MS = 400;

const buildContext = (range: Range): string | undefined => {
  try {
    const text = range.toString();
    const before =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? (range.startContainer.nodeValue ?? '').slice(
            Math.max(0, range.startOffset - 50),
            range.startOffset,
          )
        : '';
    const after =
      range.endContainer.nodeType === Node.TEXT_NODE
        ? (range.endContainer.nodeValue ?? '').slice(
            range.endOffset,
            Math.min((range.endContainer.nodeValue ?? '').length, range.endOffset + 50),
          )
        : '';
    const ctx = `${before}${text}${after}`.trim();
    return ctx.length > 0 ? ctx : undefined;
  } catch {
    return undefined;
  }
};

/** Sobe a árvore até encontrar o bloco enclosing (p/li/blockquote/div) e devolve o texto. */
const enclosingParagraph = (range: Range): string => {
  let node: Node | null = range.commonAncestorContainer;
  while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode;
  while (node && node.nodeType === Node.ELEMENT_NODE) {
    const el = node as Element;
    const tag = el.tagName.toLowerCase();
    if (tag === 'p' || tag === 'li' || tag === 'blockquote' || tag === 'div') {
      const txt = el.textContent?.trim() ?? '';
      if (txt.length > 0) return txt;
    }
    node = el.parentNode;
  }
  return range.toString().trim();
};

/** Posição do popover ancorada por baixo da selecção (coordenadas viewport). */
const popoverPositionFor = (sel: HighlightSelection): PopoverPosition | null => {
  const iframe = sel.doc.defaultView?.frameElement;
  if (!iframe) return null;
  const iframeRect = iframe.getBoundingClientRect();
  const rangeRect = sel.range.getBoundingClientRect();
  if (rangeRect.width === 0 && rangeRect.height === 0) return null;
  return {
    top: iframeRect.top + rangeRect.bottom,
    left: iframeRect.left + rangeRect.left + rangeRect.width / 2,
  };
};

const Reader = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const deepLinkCfi =
    location.state &&
    typeof location.state === 'object' &&
    'cfi' in location.state &&
    typeof (location.state as { cfi: unknown }).cfi === 'string'
      ? (location.state as { cfi: string }).cfi
      : undefined;
  const queryClient = useQueryClient();

  const bookQuery = useBook(id);
  const positionQuery = useQuery({
    queryKey: ['positions', id ?? 'noop'],
    queryFn: () => (id ? positions.getById(id).then((p) => p ?? null) : Promise.resolve(null)),
    enabled: id !== undefined,
  });
  const highlightsQuery = useHighlightsByBook(id);

  const addHighlight = useAddHighlight();
  const updateHighlight = useUpdateHighlight();
  const removeHighlight = useRemoveHighlight();

  const [chromeVisible, setChromeVisible] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [editingMetadata, setEditingMetadata] = useState(false);
  const [selection, setSelection] = useState<HighlightSelection | null>(null);
  const [showCheckin, setShowCheckin] = useState(false);
  const [bookToc, setBookToc] = useState<ReadonlyArray<FoliateTOCItem>>([]);
  const [currentTocHref, setCurrentTocHref] = useState<string | undefined>(undefined);
  const [aiPopover, setAiPopover] = useState<{
    title: string;
    loading: boolean;
    result: string | null;
    error: string | null;
    position: PopoverPosition;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const rendererRef = useRef<EpubRenderer | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const ttsRef = useRef<WebSpeechTTS | null>(null);
  const [ttsActive, setTtsActive] = useState(false);

  const book = bookQuery.data;

  const touchStartRef = useRef<{ y: number; time: number } | null>(null);

  // Mark lastReadAt once per book mount.
  const touchedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!book || touchedRef.current === book.id) return;
    touchedRef.current = book.id;
    void books.update(book.id, { lastReadAt: new Date().toISOString() });
  }, [book]);

  const prefs = usePrefs(
    useShallow((s) => ({
      fontFamily: s.fontFamily,
      fontSize: s.fontSize,
      lineHeight: s.lineHeight,
      pageWidth: s.pageWidth,
      paragraphSpacing: s.paragraphSpacing,
      letterSpacing: s.letterSpacing,
      paginationMode: s.paginationMode,
      theme: s.theme,
      themeAutoSchedule: s.themeAutoSchedule,
      focusModeEnabled: s.focusModeEnabled,
      focusCheckinInterval: s.focusCheckinInterval,
      ttsRate: s.ttsRate,
      ttsVoice: s.ttsVoice,
      setFocusModeEnabled: s.setFocusModeEnabled,
    })),
  );

  // Auto theme via requestAnimationFrame — activates only when theme === 'auto'.
  useAutoTheme(prefs.theme, prefs.themeAutoSchedule);

  const options = useMemo<RendererOptions>(
    () => ({
      fontFamily: prefs.fontFamily,
      fontSize: prefs.fontSize,
      lineHeight: prefs.lineHeight,
      pageWidth: prefs.pageWidth,
      paragraphSpacing: prefs.paragraphSpacing,
      letterSpacing: prefs.letterSpacing,
      paginationMode: prefs.paginationMode,
      background: (prefs.theme, readColorToken('--bg')),
      text: readColorToken('--text'),
    }),
    [
      prefs.fontFamily,
      prefs.fontSize,
      prefs.lineHeight,
      prefs.pageWidth,
      prefs.paragraphSpacing,
      prefs.letterSpacing,
      prefs.paginationMode,
      prefs.theme,
    ],
  );

  const persistPosition = useMemo(
    () =>
      debounce(async (bookId: string, cfi: string, fraction: number, index: number) => {
        const row: ReadingPosition = {
          bookId,
          cfi,
          chapterIndex: index,
          percentage: Math.round(fraction * 100),
          updatedAt: new Date().toISOString(),
        };
        await positions.upsert(row);
      }, 1000),
    [],
  );

  useEffect(() => {
    return () => {
      persistPosition.flush();
      void queryClient.invalidateQueries({ queryKey: BOOK_QUERY_KEYS.all });
    };
  }, [persistPosition, queryClient]);

  const allHighlights = useMemo(() => highlightsQuery.data ?? [], [highlightsQuery.data]);

  const allBooksQuery = useBooks();
  const allNotesQuery = useQuery({
    queryKey: ['notes', 'all'],
    queryFn: () => notesDb.getAll(),
  });

  const wikiCandidates = useMemo(
    () => getAutocompleteCandidates(allNotesQuery.data ?? [], allBooksQuery.data ?? []),
    [allNotesQuery.data, allBooksQuery.data],
  );

  const allHighlightsRef = useRef(allHighlights);
  useEffect(() => {
    allHighlightsRef.current = allHighlights;
  }, [allHighlights]);

  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    const items: EpubAnnotation[] = allHighlights.map((h) => ({
      cfiRange: h.cfiRange,
      color: h.color,
    }));
    r.setHighlights(items);
  }, [allHighlights]);

  // ── Focus mode check-in ──────────────────────────────────────────────────
  const checkinTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleCheckin = useCallback((): void => {
    if (checkinTimerRef.current !== null) clearTimeout(checkinTimerRef.current);
    if (!prefs.focusModeEnabled || prefs.focusCheckinInterval === 0) return;
    checkinTimerRef.current = setTimeout(() => {
      // Pause TTS if active (Phase 11 hook).
      ttsRef.current?.pause();
      setShowCheckin(true);
    }, prefs.focusCheckinInterval * 60_000);
  }, [prefs.focusModeEnabled, prefs.focusCheckinInterval]);

  useEffect(() => {
    scheduleCheckin();
    return () => {
      if (checkinTimerRef.current !== null) clearTimeout(checkinTimerRef.current);
    };
  }, [scheduleCheckin]);

  const handleCheckinSubmit = useCallback(
    (text: string): void => {
      if (book) {
        const now = new Date().toISOString();
        void notesDb.add({
          id: ulid(),
          bookId: book.id,
          body: text,
          tags: ['focus-checkin'],
          createdAt: now,
          updatedAt: now,
        });
      }
      setShowCheckin(false);
      ttsRef.current?.resume();
      scheduleCheckin();
    },
    [book, scheduleCheckin],
  );

  const handleCheckinDismiss = useCallback((): void => {
    setShowCheckin(false);
    ttsRef.current?.resume();
    scheduleCheckin();
  }, [scheduleCheckin]);

  // ── Highlight actions ────────────────────────────────────────────────────
  const applyColor = useCallback(
    async (color: HighlightColor): Promise<void> => {
      if (!selection || !book) return;
      const existing = allHighlights.find((h) => h.cfiRange === selection.cfiRange);
      if (existing) {
        if (existing.color === color) return;
        await updateHighlight.mutateAsync({
          id: existing.id,
          patch: { color, updatedAt: new Date().toISOString() },
        });
      } else {
        const now = new Date().toISOString();
        const h: Highlight = {
          id: ulid(),
          bookId: book.id,
          cfiRange: selection.cfiRange,
          text: selection.text,
          color,
          tags: [],
          createdAt: now,
          updatedAt: now,
        };
        const ctx = buildContext(selection.range);
        if (ctx !== undefined) h.context = ctx;
        await addHighlight.mutateAsync(h);
      }
      try {
        selection.doc.getSelection()?.removeAllRanges();
      } catch {
        /* ignore */
      }
      setSelection(null);
    },
    [selection, book, allHighlights, addHighlight, updateHighlight],
  );

  const removeCurrent = useCallback(async (): Promise<void> => {
    if (!selection) return;
    const existing = allHighlights.find((h) => h.cfiRange === selection.cfiRange);
    if (!existing) return;
    await removeHighlight.mutateAsync(existing.id);
    rendererRef.current?.removeHighlight(existing.cfiRange);
    setSelection(null);
  }, [selection, allHighlights, removeHighlight]);

  const copySelection = useCallback(async (): Promise<void> => {
    if (!selection) return;
    try {
      await navigator.clipboard.writeText(selection.text);
    } catch {
      /* ignore */
    }
    setSelection(null);
  }, [selection]);

  const runAiTask = useCallback(
    async (kind: 'define' | 'translate'): Promise<void> => {
      if (!selection) return;
      const position = popoverPositionFor(selection);
      if (!position) return;
      const title = kind === 'define' ? 'Definição' : 'Tradução';
      setAiPopover({ title, loading: true, result: null, error: null, position });

      const text = selection.text.trim();
      const promptArgs =
        kind === 'define'
          ? { system: DEFINE_SYSTEM, prompt: definePrompt(text, enclosingParagraph(selection.range)) }
          : { system: TRANSLATE_SYSTEM, prompt: translatePrompt(text) };
      const result = await generateText(promptArgs);
      setAiPopover((prev) =>
        prev === null
          ? prev
          : {
              ...prev,
              loading: false,
              result: result ?? null,
              error: result === null ? 'Não foi possível obter resposta da IA.' : null,
            },
      );
    },
    [selection],
  );

  const defineSelection = useCallback((): void => {
    void runAiTask('define');
  }, [runAiTask]);

  const translateSelection = useCallback((): void => {
    void runAiTask('translate');
  }, [runAiTask]);

  const addNoteToSelection = useCallback(async (): Promise<void> => {
    if (!selection || !book) return;
    const existing = allHighlights.find((h) => h.cfiRange === selection.cfiRange);
    if (!existing) {
      const now = new Date().toISOString();
      const h: Highlight = {
        id: ulid(),
        bookId: book.id,
        cfiRange: selection.cfiRange,
        text: selection.text,
        color: 'yellow',
        tags: [],
        createdAt: now,
        updatedAt: now,
      };
      const ctx = buildContext(selection.range);
      if (ctx !== undefined) h.context = ctx;
      await addHighlight.mutateAsync(h);
    }
    setSelection(null);
    setPanel('notes');
  }, [selection, book, allHighlights, addHighlight]);

  /**
   * Garante que existe um Highlight para a selecção activa e devolve-o.
   * Se já existir um highlight com o mesmo cfiRange, devolve esse.
   */
  const ensureHighlight = useCallback(async (): Promise<Highlight | null> => {
    if (!selection || !book) return null;
    const existing = allHighlights.find((h) => h.cfiRange === selection.cfiRange);
    if (existing) return existing;
    const now = new Date().toISOString();
    const h: Highlight = {
      id: ulid(),
      bookId: book.id,
      cfiRange: selection.cfiRange,
      text: selection.text,
      color: 'yellow',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    const ctx = buildContext(selection.range);
    if (ctx !== undefined) h.context = ctx;
    await addHighlight.mutateAsync(h);
    return h;
  }, [selection, book, allHighlights, addHighlight]);

  const createFlashcardFromSelection = useCallback(async (): Promise<void> => {
    const h = await ensureHighlight();
    if (!h) return;
    const card = highlightToCard(h);
    await flashcardsDb.add(card);
    try {
      selection?.doc.getSelection()?.removeAllRanges();
    } catch {
      /* ignore */
    }
    setSelection(null);
    setToast('Flashcard criado');
  }, [ensureHighlight, selection]);

  const createFlashcardWithAi = useCallback(async (): Promise<void> => {
    const h = await ensureHighlight();
    if (!h) return;
    setToast('A gerar com IA…');
    const generated = await generateWithAi(h, ({ system, prompt }) =>
      generateText({ system, prompt }),
    );
    const baseCard = highlightToCard(h);
    const card = generated ? { ...baseCard, front: generated.front, back: generated.back } : baseCard;
    await flashcardsDb.add(card);
    try {
      selection?.doc.getSelection()?.removeAllRanges();
    } catch {
      /* ignore */
    }
    setSelection(null);
    setToast(generated ? 'Flashcard criado com IA' : 'Flashcard criado (IA falhou — usei fallback)');
  }, [ensureHighlight, selection]);

  // ── Renderer ready ───────────────────────────────────────────────────────
  const handleReady = useCallback(
    (renderer: EpubRenderer) => {
      rendererRef.current = renderer;
      setBookToc(renderer.getToc());
      if (!book) return;
      renderer.onLocationChange((info) => {
        const cfi = info.cfi;
        if (typeof cfi !== 'string') return;
        const fraction = typeof info.fraction === 'number' ? info.fraction : 0;
        const index = typeof info.index === 'number' ? info.index : 0;
        persistPosition(book.id, cfi, fraction, index);
        setCurrentTocHref(renderer.getCurrentTocHref());
      });
      renderer.onSelectionChange((info) => {
        if (info.text.trim().length === 0 || !info.cfiRange || !info.range || !info.doc) {
          setSelection(null);
          return;
        }
        setSelection({
          text: info.text,
          cfiRange: info.cfiRange,
          range: info.range,
          doc: info.doc,
        });
      });
      renderer.onAnnotationClick(() => setPanel('notes'));
      const items: EpubAnnotation[] = allHighlightsRef.current.map((h) => ({
        cfiRange: h.cfiRange,
        color: h.color,
      }));
      renderer.setHighlights(items);
    },
    [book, persistPosition],
  );

  const handleError = useCallback((err: Error) => {
    setErrorMsg(err.message);
  }, []);

  // ── TTS ──────────────────────────────────────────────────────────────────
  const handleToggleTts = useCallback((): void => {
    const r = rendererRef.current;
    if (!r) return;
    if (!ttsRef.current) ttsRef.current = new WebSpeechTTS();
    const tts = ttsRef.current;
    if (tts.speaking || tts.paused) {
      tts.stop();
      r.clearTtsHighlight();
      setTtsActive(false);
      return;
    }
    const text = r.getActiveText();
    if (!text.trim()) return;
    tts.setRate(prefs.ttsRate);
    tts.setVoice(prefs.ttsVoice);
    tts.onBoundary((charIndex) => r.markTtsPosition(charIndex));
    tts.onEnd(() => {
      r.clearTtsHighlight();
      setTtsActive(false);
    });
    tts.speak(text);
    setTtsActive(true);
  }, [prefs.ttsRate, prefs.ttsVoice]);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const r = rendererRef.current;
      if (!r) return;
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        void r.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        void r.prevPage();
      } else if (e.key === ' ') {
        e.preventDefault();
        setChromeVisible((v) => !v);
      } else if (e.key === 'Escape') {
        setPanel(null);
        setSelection(null);
        setAiPopover(null);
      } else if (e.key === 'h' || e.key === 'H') {
        void applyColor('yellow');
      } else if (e.key === 'n' || e.key === 'N') {
        setPanel((p) => (p === 'notes' ? null : 'notes'));
      } else if (e.key === 'f' || e.key === 'F') {
        prefs.setFocusModeEnabled(!prefs.focusModeEnabled);
      } else if (e.key === 't' || e.key === 'T') {
        handleToggleTts();
      } else if (e.key === 'b' || e.key === 'B') {
        const cfi = r.getCurrentCfi();
        if (cfi && book) {
          void bookmarksDb
            .add({ id: ulid(), bookId: book.id, cfi, createdAt: new Date().toISOString() })
            .then(() => setToast('Marcador adicionado'));
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [applyColor, book, handleToggleTts, prefs]);

  // Auto-pause TTS when chat panel opens.
  useEffect(() => {
    if (panel === 'chat') ttsRef.current?.pause();
  }, [panel]);

  // Restore focus to the reader container whenever no panel is open — keeps
  // global keyboard shortcuts (←/→/Space/H/N/B/F/T/Esc) responsive even after
  // clicking buttons in the top bar, panels, or the highlight toolbar.
  useEffect(() => {
    if (panel !== null) return;
    const t = setTimeout(() => containerRef.current?.focus({ preventScroll: true }), 0);
    return () => clearTimeout(t);
  }, [panel, selection]);

  // Stop TTS on unmount.
  useEffect(() => {
    return () => {
      ttsRef.current?.stop();
      rendererRef.current?.clearTtsHighlight();
    };
  }, []);

  // ── Guards ───────────────────────────────────────────────────────────────
  if (!id) return <p style={{ padding: '2rem' }}>ID de livro em falta.</p>;

  if (bookQuery.isLoading || positionQuery.isLoading)
    return <p style={{ padding: '2rem', color: 'var(--text-3)' }}>A carregar livro…</p>;

  if (!book)
    return (
      <p style={{ padding: '2rem' }}>
        Livro não encontrado. <a href="/library">Voltar à biblioteca</a>
      </p>
    );

  if (errorMsg)
    return (
      <p style={{ padding: '2rem', color: '#c75050' }}>Erro a abrir EPUB: {errorMsg}</p>
    );

  const startCfi = deepLinkCfi ?? positionQuery.data?.cfi;
  const existingForSelection = selection
    ? (allHighlights.find((h) => h.cfiRange === selection.cfiRange) ?? null)
    : null;

  const isFocusMode = prefs.focusModeEnabled;

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      style={{ position: 'relative', width: '100%', height: '100%', outline: 'none' }}
      onClick={(e) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return;
        if ((e.target as HTMLElement).closest('[data-testid="highlight-toolbar"], aside')) return;
        if (!isFocusMode) setChromeVisible((v) => !v);
      }}
      // ── Swipe-up from bottom zone opens settings ──────────────────────
      onTouchStart={(e) => {
        const touch = e.touches[0];
        if (!touch) return;
        const fromBottom = window.innerHeight - touch.clientY;
        if (fromBottom <= 72) {
          touchStartRef.current = { y: touch.clientY, time: Date.now() };
        }
      }}
      onTouchEnd={(e) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (!start) return;
        const touch = e.changedTouches[0];
        if (!touch) return;
        const deltaY = start.y - touch.clientY;
        const deltaT = Date.now() - start.time;
        if (deltaY >= SWIPE_THRESHOLD && deltaT <= SWIPE_MAX_MS) {
          setPanel((p) => (p === 'settings' ? null : 'settings'));
        }
      }}
    >
      {/* Chrome hidden in focus mode */}
      {!isFocusMode && (
        <ReaderTopBar
          title={book.title}
          {...(book.author !== undefined ? { author: book.author } : {})}
          visible={chromeVisible}
          notesCount={allHighlights.length}
          onToggleToc={() => setPanel(panel === 'toc' ? null : 'toc')}
          onToggleSearch={() => setPanel(panel === 'search' ? null : 'search')}
          onToggleChat={() => setPanel(panel === 'chat' ? null : 'chat')}
          chatAvailable={isAiEnabled()}
          onToggleNotes={() => setPanel(panel === 'notes' ? null : 'notes')}
          onToggleSettings={() => setPanel(panel === 'settings' ? null : 'settings')}
          onToggleTts={handleToggleTts}
          ttsActive={ttsActive}
          onEditMetadata={() => setEditingMetadata(true)}
        />
      )}

      <ReaderSurface
        blob={book.fileBlob}
        options={options}
        {...(startCfi !== undefined ? { startCfi } : {})}
        onReady={handleReady}
        onError={handleError}
      />

      {/* Tap zones (mobile/tablet, paginated mode): left 30% → página anterior,
          right 30% → página seguinte. Centro 40% mantém o toggle de chrome
          através do handler do container. */}
      {isMobile && prefs.paginationMode === 'paginated' && (
        <>
          <button
            type="button"
            className={cn(styles.tapZoneLeft)}
            data-testid="tap-zone-prev"
            aria-label="Página anterior"
            onClick={(e) => {
              e.stopPropagation();
              void rendererRef.current?.prevPage();
            }}
          />
          <button
            type="button"
            className={cn(styles.tapZoneRight)}
            data-testid="tap-zone-next"
            aria-label="Página seguinte"
            onClick={(e) => {
              e.stopPropagation();
              void rendererRef.current?.nextPage();
            }}
          />
        </>
      )}

      <HighlightToolbar
        selection={selection}
        existingHighlight={
          existingForSelection
            ? { id: existingForSelection.id, color: existingForSelection.color }
            : null
        }
        aiAvailable={isAiEnabled()}
        onApplyColor={(c) => void applyColor(c)}
        onRemove={() => void removeCurrent()}
        onAddNote={() => void addNoteToSelection()}
        onCopy={() => void copySelection()}
        onDefine={defineSelection}
        onTranslate={translateSelection}
        onCreateFlashcard={() => void createFlashcardFromSelection()}
        onCreateFlashcardAi={() => void createFlashcardWithAi()}
      />

      {aiPopover && (
        <AiPopover
          title={aiPopover.title}
          loading={aiPopover.loading}
          result={aiPopover.result}
          error={aiPopover.error}
          position={aiPopover.position}
          onClose={() => setAiPopover(null)}
        />
      )}

      {panel === 'notes' && (
        <PanelOverlay title="Anotações" onClose={() => setPanel(null)}>
          <PanelNotes
            highlights={allHighlights}
            onJumpTo={async (cfi) => {
              await rendererRef.current?.goToCfi(cfi);
              setPanel(null);
            }}
            onUpdate={(hid, patch) => {
              void updateHighlight
                .mutateAsync({ id: hid, patch })
                .then(() => {
                  void queryClient.invalidateQueries({
                    queryKey: HIGHLIGHT_QUERY_KEYS.byBook(book.id),
                  });
                  if (patch.note !== undefined) {
                    void refreshBacklinksForSource(hid, patch.note ?? '');
                  }
                });
            }}
            onRemove={(hid) => {
              const h = allHighlights.find((x) => x.id === hid);
              if (h) rendererRef.current?.removeHighlight(h.cfiRange);
              void removeHighlight.mutateAsync(hid);
            }}
            wikiCandidates={wikiCandidates}
          />
        </PanelOverlay>
      )}

      {panel === 'settings' && (
        <PanelOverlay title="Configurações" onClose={() => setPanel(null)}>
          <PanelSettings />
        </PanelOverlay>
      )}

      {panel === 'toc' && (
        <PanelOverlay title="Índice" onClose={() => setPanel(null)}>
          <PanelTOC
            toc={bookToc}
            {...(currentTocHref !== undefined ? { currentHref: currentTocHref } : {})}
            onJumpTo={(href) => {
              void rendererRef.current?.goToHref(href);
              setPanel(null);
            }}
          />
        </PanelOverlay>
      )}

      {panel === 'search' && (
        <PanelOverlay title="Procurar no livro" onClose={() => setPanel(null)} noPadding>
          <PanelSearch
            getRenderer={() => rendererRef.current}
            onJumpTo={(cfi) => {
              void rendererRef.current?.goToCfi(cfi);
              setPanel(null);
            }}
          />
        </PanelOverlay>
      )}

      {panel === 'chat' && (
        <PanelOverlay title="Conversar com o livro" onClose={() => setPanel(null)} noPadding>
          <PanelChat
            bookId={book.id}
            onCitationClick={(chunk) => {
              const r = rendererRef.current;
              if (!r) return;
              // Encontra a passagem no livro via search e salta para a primeira ocorrência.
              // Usa os primeiros ~80 chars do chunk para reduzir falsos positivos.
              const needle = chunk.chunkText.slice(0, 80).trim();
              if (needle.length === 0) return;
              void searchInBook(r.getBook(), {
                query: needle,
                maxHits: 1,
                cfiFor: (i, range) => r.cfiFor(i, range),
              }).then((hits) => {
                const first = hits[0];
                if (first) void r.goToCfi(first.cfi);
              });
            }}
          />
        </PanelOverlay>
      )}

      {showCheckin && (
        <FocusCheckinDialog
          intervalMinutes={prefs.focusCheckinInterval}
          onSubmit={handleCheckinSubmit}
          onDismiss={handleCheckinDismiss}
        />
      )}

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}

      {editingMetadata && (
        <MetadataEditor book={book} onClose={() => setEditingMetadata(false)} />
      )}
    </div>
  );
};

export default Reader;
