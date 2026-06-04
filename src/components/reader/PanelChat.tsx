import {
  type FC,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { chat, isAiEnabled, type ChatMessage } from '@/lib/ai/client';
import { CHAT_SYSTEM } from '@/lib/ai/prompts';
import { retrieveRelevant, type RetrievedChunk } from '@/lib/ai/rag';
import { cn } from '@/lib/utils/cn';
import styles from './PanelChat.module.css';

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  /** Apenas para mensagens do assistant: chunks usados, indexados de 1. */
  citations?: RetrievedChunk[];
}

interface Props {
  bookId: string;
  /** Chamado quando o utilizador clica numa citação. Recebe o chunk completo. */
  onCitationClick: (chunk: RetrievedChunk) => void;
}

const buildContextPrompt = (question: string, chunks: RetrievedChunk[]): string => {
  if (chunks.length === 0) return question;
  const passages = chunks
    .map((c, i) => `[Passagem ${i + 1}]\n${c.chunkText}`)
    .join('\n\n');
  return `Pergunta:\n${question}\n\nPassagens fornecidas:\n${passages}`;
};

/**
 * Substitui ocorrências de `[Passagem N]` no texto por `<button>` clicáveis.
 * Não usa `dangerouslySetInnerHTML` — divide a string e injecta elementos React.
 */
const renderWithCitations = (
  text: string,
  citations: RetrievedChunk[],
  onClick: (chunk: RetrievedChunk) => void,
): ReactNode[] => {
  const out: ReactNode[] = [];
  const regex = /\[Passagem (\d+)\]/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(text)) !== null) {
    const before = text.slice(lastEnd, match.index);
    if (before.length > 0) out.push(before);
    const n = parseInt(match[1] ?? '0', 10);
    const chunk = citations[n - 1];
    if (chunk) {
      out.push(
        <button
          key={`cite-${key++}`}
          type="button"
          className={cn(styles.citation)}
          onClick={() => onClick(chunk)}
          title={`Saltar para a passagem ${n}`}
        >
          [Passagem {n}]
        </button>,
      );
    } else {
      out.push(match[0]);
    }
    lastEnd = match.index + match[0].length;
  }
  const tail = text.slice(lastEnd);
  if (tail.length > 0) out.push(tail);
  return out;
};

export const PanelChat: FC<Props> = ({ bookId, onCitationClick }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const aiEnabled = useMemo(() => isAiEnabled(), []);

  useEffect(() => {
    if (aiEnabled) inputRef.current?.focus();
  }, [aiEnabled]);

  useEffect(() => {
    // Auto-scroll para a última mensagem.
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  if (!aiEnabled) {
    return (
      <div className={cn(styles.panel)}>
        <div className={cn(styles.empty)}>
          <div className={cn(styles.emptyTitle)}>Conversar com o livro</div>
          <p className={cn(styles.emptySub)}>
            Activa a IA em Definições e adiciona uma chave Anthropic para começar.
          </p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    const question = input.trim();
    if (question.length === 0 || loading) return;

    setError(null);
    setInput('');
    const userMsg: DisplayMessage = { role: 'user', content: question };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const chunks = await retrieveRelevant(bookId, question, { k: 5 });
      const userContent = buildContextPrompt(question, chunks);
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await chat({
        system: CHAT_SYSTEM,
        messages: [...history, { role: 'user', content: userContent }],
      });
      if (reply === null) {
        setError('Não foi possível obter resposta da IA.');
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: reply, citations: chunks },
        ]);
      }
    } catch (err) {
      console.error('[PanelChat] failed', err);
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn(styles.panel)}>
      <div className={cn(styles.messages)} ref={scrollRef}>
        {messages.length === 0 && !loading && (
          <div className={cn(styles.empty)}>
            <div className={cn(styles.emptyTitle)}>Pergunta sobre o livro</div>
            <p className={cn(styles.emptySub)}>
              Faz perguntas em linguagem natural — as respostas citam passagens clicáveis.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              styles.message,
              m.role === 'user' ? styles.messageUser : styles.messageAssistant,
            )}
          >
            {m.role === 'assistant' && m.citations && m.citations.length > 0
              ? renderWithCitations(m.content, m.citations, onCitationClick)
              : m.content}
          </div>
        ))}
        {loading && (
          <div className={cn(styles.loadingBubble)}>
            <span className={cn(styles.spinner)} aria-hidden />
            <span>A pensar…</span>
          </div>
        )}
        {error && <div className={cn(styles.error)}>{error}</div>}
      </div>

      <form className={cn(styles.form)} onSubmit={(e) => void handleSubmit(e)}>
        <input
          ref={inputRef}
          type="text"
          className={cn(styles.input)}
          placeholder="Pergunta…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          data-testid="chat-input"
        />
        <button
          type="submit"
          className={cn(styles.button)}
          disabled={loading || input.trim().length === 0}
        >
          Enviar
        </button>
      </form>
    </div>
  );
};
