import { type FC, useEffect, useImperativeHandle, useRef } from 'react';

import { createRenderer, type EpubRenderer, type RendererOptions } from '@/lib/epub/renderer';
import { openEpubBook } from '@/lib/epub/parser';
import { cn } from '@/lib/utils/cn';
import styles from './ReaderSurface.module.css';

export interface ReaderHandle {
  renderer: EpubRenderer | null;
}

interface Props {
  blob: Blob;
  options: RendererOptions;
  startCfi?: string;
  onReady?: (renderer: EpubRenderer) => void;
  onError?: (err: Error) => void;
  ref?: React.Ref<ReaderHandle>;
}

export const ReaderSurface: FC<Props> = ({ blob, options, startCfi, onReady, onError, ref }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<EpubRenderer | null>(null);

  useImperativeHandle(ref, () => ({ renderer: rendererRef.current }), []);

  // (Re)monta o renderer sempre que a Blob muda. Mudanças apenas a `options`
  // não recriam o renderer — usam `applyStyles` em efeito separado.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const host = hostRef.current;
        if (!host) return;
        const book = await openEpubBook(blob);
        if (cancelled) return;
        const r = await createRenderer({
          host,
          book,
          options,
          ...(startCfi !== undefined ? { startCfi } : {}),
        });
        if (cancelled) {
          r.destroy();
          return;
        }
        rendererRef.current = r;
        onReady?.(r);
      } catch (err) {
        if (cancelled) return;
        onError?.(err instanceof Error ? err : new Error(String(err)));
      }
    })();

    return () => {
      cancelled = true;
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  // Aplica novos estilos sem recriar o renderer.
  useEffect(() => {
    const r = rendererRef.current;
    if (!r) return;
    r.applyStyles(options);
    r.setPaginationMode(options.paginationMode);
  }, [options]);

  return (
    <div className={cn(styles.surface)}>
      <div ref={hostRef} className={cn(styles.host)} />
    </div>
  );
};
