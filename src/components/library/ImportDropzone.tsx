import { type FC, useCallback, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { categoriseBook, type CategoriseSuggestion } from '@/lib/ai/categorise';
import { isAiEnabled } from '@/lib/ai/client';
import * as booksDb from '@/lib/db/books';
import { importEpubFile, type ImportProgress, type ImportResult } from '@/lib/epub/import';
import { BOOK_QUERY_KEYS } from '@/lib/store/library';
import { convertFileToEpub, isConvertible } from '@/lib/tauri/convert';
import { isTauri } from '@/lib/tauri/library-scan';
import { cn } from '@/lib/utils/cn';
import styles from './ImportDropzone.module.css';

interface ToastItem {
  id: string;
  kind: 'progress' | 'success' | 'duplicate' | 'error' | 'suggest';
  title: string;
  detail?: string;
  bookId?: string;
  suggestion?: CategoriseSuggestion;
}

const STAGE_LABEL: Record<ImportProgress['stage'], string> = {
  hashing: 'A calcular hash…',
  parsing: 'A analisar EPUB…',
  saving: 'A gravar…',
  done: 'Gravado',
};

const ACCEPT_ALL =
  '.epub,application/epub+zip,.pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.txt,text/plain,.html,text/html';
const ACCEPT_EPUB = '.epub,application/epub+zip';

interface Props {
  maxBytes?: number;
}

export const ImportDropzone: FC<Props> = ({ maxBytes = 100 * 1024 * 1024 }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const qc = useQueryClient();

  const pushToast = (toast: ToastItem): void => {
    setToasts((prev) => [...prev.filter((t) => t.id !== toast.id), toast]);
  };
  const removeToast = (id: string): void => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };
  const removeToastSoon = (id: string, ms = 4500): void => {
    window.setTimeout(() => removeToast(id), ms);
  };

  const acceptSuggestion = useCallback(
    async (toast: ToastItem): Promise<void> => {
      if (toast.bookId === undefined || toast.suggestion === undefined) return;
      const book = await booksDb.getById(toast.bookId);
      if (book === undefined) return;

      const merged = new Set([...book.tags, ...toast.suggestion.tags]);
      await booksDb.update(toast.bookId, {
        category: toast.suggestion.category,
        tags: [...merged],
        ...(toast.suggestion.language.length > 0 ? { language: toast.suggestion.language } : {}),
      });
      await qc.invalidateQueries({ queryKey: BOOK_QUERY_KEYS.all });
      removeToast(toast.id);
    },
    [qc],
  );

  const triggerCategorisation = useCallback(
    (bookId: string, title: string): void => {
      void (async () => {
        const book = await booksDb.getById(bookId);
        if (book === undefined) return;
        const suggestion = await categoriseBook(book.title, book.author, book.description);
        if (suggestion === null) return;

        const suggestId = `suggest-${bookId}`;
        pushToast({
          id: suggestId,
          kind: 'suggest',
          title,
          detail: `Categoria sugerida: ${suggestion.category}`,
          bookId,
          suggestion,
        });
      })();
    },
    [],
  );

  const handleFiles = async (files: FileList | File[]): Promise<void> => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setBusy(true);
    try {
      for (const file of list) {
        const id = `${file.name}-${file.size}`;
        if (file.size > maxBytes) {
          pushToast({
            id,
            kind: 'error',
            title: file.name,
            detail: `Maior que o limite (${Math.round(maxBytes / 1024 / 1024)} MB).`,
          });
          removeToastSoon(id, 6000);
          continue;
        }

        let importFile = file;
        if (isConvertible(file.name)) {
          if (!isTauri()) {
            pushToast({
              id,
              kind: 'error',
              title: file.name,
              detail: 'Conversão de formato disponível apenas na app desktop.',
            });
            removeToastSoon(id, 6000);
            continue;
          }
          const ext = file.name.split('.').pop()?.toUpperCase() ?? '';
          pushToast({
            id,
            kind: 'progress',
            title: file.name,
            detail: `A converter ${ext} para EPUB…`,
          });
          const converted = await convertFileToEpub(file);
          if (converted === null) {
            pushToast({
              id,
              kind: 'error',
              title: file.name,
              detail: 'Falha na conversão. Pandoc instalado?',
            });
            removeToastSoon(id, 8000);
            continue;
          }
          importFile = converted;
        }

        pushToast({ id, kind: 'progress', title: file.name, detail: STAGE_LABEL.hashing });
        const result: ImportResult = await importEpubFile(importFile, (p) => {
          pushToast({ id, kind: 'progress', title: file.name, detail: STAGE_LABEL[p.stage] });
        });

        switch (result.status) {
          case 'imported':
            pushToast({ id, kind: 'success', title: result.title, detail: 'Importado' });
            removeToastSoon(id);
            if (isAiEnabled()) {
              triggerCategorisation(result.bookId, result.title);
            }
            break;
          case 'duplicate':
            pushToast({
              id,
              kind: 'duplicate',
              title: result.title,
              detail: 'Já existe na biblioteca',
            });
            removeToastSoon(id);
            break;
          case 'error':
            pushToast({
              id,
              kind: 'error',
              title: file.name,
              detail: result.error.message,
            });
            removeToastSoon(id, 8000);
            break;
        }
      }
    } finally {
      setBusy(false);
      await qc.invalidateQueries({ queryKey: BOOK_QUERY_KEYS.all });
    }
  };

  return (
    <>
      {toasts.length > 0 && (
        <div className={cn(styles.toasts)} role="status" aria-live="polite">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                styles.toast,
                t.kind === 'progress' && styles.toastProgress,
                t.kind === 'success' && styles.toastSuccess,
                t.kind === 'duplicate' && styles.toastDuplicate,
                t.kind === 'error' && styles.toastError,
                t.kind === 'suggest' && styles.toastSuggest,
              )}
            >
              <span className={cn(styles.toastTitle)}>{t.title}</span>
              {t.detail && <span className={cn(styles.toastDetail)}>{t.detail}</span>}
              {t.kind === 'suggest' && (
                <span className={cn(styles.toastActions)}>
                  <button
                    type="button"
                    className={cn(styles.toastBtn, styles.toastBtnAccept)}
                    onClick={() => void acceptSuggestion(t)}
                  >
                    Aceitar
                  </button>
                  <button
                    type="button"
                    className={cn(styles.toastBtn)}
                    onClick={() => removeToast(t.id)}
                  >
                    Ignorar
                  </button>
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        className={cn(
          styles.dropzone,
          active && styles.dropzoneActive,
          busy && styles.dropzoneDisabled,
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setActive(true);
        }}
        onDragLeave={() => setActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setActive(false);
          if (busy) return;
          if (e.dataTransfer.files.length > 0) {
            void handleFiles(e.dataTransfer.files);
          }
        }}
        aria-busy={busy}
        aria-label="Importar ficheiros"
      >
        Arrasta um <strong>.epub</strong>{isTauri() ? ', .pdf, .docx, .txt ou .html' : ''} aqui ou
        clica para escolher
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={isTauri() ? ACCEPT_ALL : ACCEPT_EPUB}
        multiple
        className={cn(styles.input)}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            void handleFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />
    </>
  );
};
