import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { CatEmpty } from '@/components/icons';
import { isAiEnabled } from '@/lib/ai/client';
import { synthesiseAcrossLibrary, type SynthesisResult } from '@/lib/ai/synthesis';
import { recordStep } from '@/lib/knowledge/trails';
import { useBooks } from '@/lib/store/library';
import { cn } from '@/lib/utils/cn';
import { renderMarkdown } from '@/lib/utils/markdown';
import styles from './Synthesis.module.css';

const Synthesis = () => {
  const booksQuery = useBooks();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SynthesisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim().length === 0 || loading) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      setResult(null);

      void (async () => {
        const books = booksQuery.data ?? [];
        const res = await synthesiseAcrossLibrary(query, books, 10, controller.signal);
        if (controller.signal.aborted) return;
        if (res === null) {
          setError('Sem resultados. Verifica que a IA está activa e que os livros têm embeddings.');
        } else {
          setResult(res);
        }
        setLoading(false);
      })();
    },
    [query, loading, booksQuery.data],
  );

  if (!isAiEnabled()) {
    return (
      <section className={cn(styles.page)}>
        <div className={cn(styles.header)}>
          <h1 className={cn(styles.title)}>Síntese</h1>
        </div>
        <div className={cn(styles.noAi)}>
          <CatEmpty size={48} />
          <p>A síntese requer a IA activa.</p>
          <p>
            Configura a API key Anthropic nas{' '}
            <Link to="/settings" style={{ color: 'inherit', textDecoration: 'underline' }}>
              Definições
            </Link>
            .
          </p>
        </div>
      </section>
    );
  }

  const books = booksQuery.data ?? [];
  const booksDone = books.filter((b) => b.embeddingsStatus === 'done');
  const booksRunning = books.filter((b) => b.embeddingsStatus === 'running');
  const noEmbeddings = booksDone.length === 0;

  if (noEmbeddings) {
    return (
      <section className={cn(styles.page)}>
        <div className={cn(styles.header)}>
          <h1 className={cn(styles.title)}>Síntese</h1>
        </div>
        <div className={cn(styles.noAi)}>
          <CatEmpty size={48} />
          <p>
            A síntese precisa de livros com embeddings gerados. Importa um livro
            e aguarda o processamento.
          </p>
          {booksRunning.length > 0 ? (
            <div style={{ width: '100%', maxWidth: 360 }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
                A processar {booksRunning.length} livro
                {booksRunning.length === 1 ? '' : 's'} ·{' '}
                {booksRunning[0]?.embeddingsProgress ?? 0}%
              </p>
              <div
                style={{
                  height: 4,
                  background: 'var(--surface-2)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginTop: 6,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'var(--text)',
                    width: `${booksRunning[0]?.embeddingsProgress ?? 0}%`,
                    transition: 'width 0.3s',
                  }}
                />
              </div>
            </div>
          ) : (
            <Link to="/library" style={{ marginTop: 8 }}>
              Ir para a biblioteca
            </Link>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={cn(styles.page)}>
      <div className={cn(styles.header)}>
        <h1 className={cn(styles.title)}>Síntese</h1>
        <p className={cn(styles.subtitle)}>
          Faz perguntas que cruzam todos os livros da tua biblioteca.
        </p>
      </div>

      <form className={cn(styles.form)} onSubmit={handleSubmit}>
        <input
          type="text"
          className={cn(styles.input)}
          placeholder="Ex.: Qual a diferença entre ética e moral nos livros que li?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className={cn(styles.button)} disabled={loading || query.trim().length === 0}>
          {loading ? 'A sintetizar…' : 'Sintetizar'}
        </button>
      </form>

      {loading && (
        <div className={cn(styles.loading)}>
          A consultar embeddings e a gerar síntese…
        </div>
      )}

      {error !== null && <div className={cn(styles.empty)}>{error}</div>}

      {result !== null && (
        <>
          <div
            className={cn(styles.answer)}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(result.answer) }}
          />

          {result.tensions.length > 0 && (
            <div>
              <h2 className={cn(styles.sectionTitle)}>Tensões detectadas</h2>
              <div className={cn(styles.tensions)}>
                {result.tensions.map((t, i) => (
                  <p key={i} className={cn(styles.tensionItem)}>
                    <span className={cn(styles.tensionIcon)} aria-hidden>⚡</span>
                    <span>{t}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className={cn(styles.sectionTitle)}>Fontes ({result.sources.length})</h2>
            <div className={cn(styles.sources)}>
              {result.sources.map((s, i) => (
                <div key={i} className={cn(styles.source)}>
                  <Link
                    to={`/reader/${s.bookId}`}
                    className={cn(styles.sourceBook)}
                    onClick={() => {
                      void recordStep({
                        fromType: 'synthesis',
                        fromId: 'synthesis',
                        toType: 'book',
                        toId: s.bookId,
                        toBookId: s.bookId,
                        source: 'synthesis-citation',
                      });
                    }}
                  >
                    {s.bookTitle}
                  </Link>
                  <p className={cn(styles.sourceText)}>{s.chunkText}</p>
                  <span className={cn(styles.sourceScore)}>
                    Relevância: {(s.score * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
};

export default Synthesis;
