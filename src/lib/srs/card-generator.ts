import type { Highlight } from '@/types/highlight';
import type { Flashcard } from '@/types/flashcard';
import { createCard } from './scheduler';

/**
 * Extrai a primeira frase de um excerto.
 * Considera os terminadores `.`, `!`, `?` (incluindo `…`). Faz fallback ao texto inteiro
 * quando não encontra um terminador, com truncagem suave a ~200 chars.
 */
const firstSentence = (text: string): string => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return '';
  const match = trimmed.match(/^[\s\S]*?[.!?…](?=\s|$)/);
  const sentence = match ? match[0] : trimmed;
  if (sentence.length <= 200) return sentence;
  return `${sentence.slice(0, 197).trimEnd()}…`;
};

/**
 * Cria um Flashcard a partir de um Highlight, sem IA.
 *  - `front`: primeira frase do `text` do highlight
 *  - `back` : `note` se existir, caso contrário o `text` completo
 */
export const highlightToCard = (highlight: Highlight): Flashcard => {
  const front = firstSentence(highlight.text);
  const back = highlight.note ?? highlight.text;
  return createCard({
    bookId: highlight.bookId,
    front,
    back,
    highlightId: highlight.id,
  });
};

export interface AiCardContent {
  front: string;
  back: string;
}

/**
 * Resultado de uma chamada de IA: espera-se uma resposta no formato
 *   `Pergunta: …\nResposta: …`
 * Tolera variações: `P:`/`Q:` para a pergunta, `R:`/`A:` para a resposta.
 */
const parseAiResponse = (raw: string): AiCardContent | null => {
  const cleaned = raw.replace(/\r\n/g, '\n').trim();
  const re =
    /^\s*(?:Pergunta|P|Q)\s*[:-]\s*([\s\S]+?)\n\s*(?:Resposta|R|A)\s*[:-]\s*([\s\S]+?)\s*$/i;
  const m = cleaned.match(re);
  if (!m) return null;
  const front = m[1]?.trim() ?? '';
  const back = m[2]?.trim() ?? '';
  if (front.length === 0 || back.length === 0) return null;
  return { front, back };
};

const AI_SYSTEM = `Crias flashcards de estudo a partir de excertos de livros. Devolve sempre exactamente duas linhas no formato:
Pergunta: <pergunta curta e clara em português europeu>
Resposta: <resposta concisa em português europeu>
Não adicionas mais nada. A pergunta deve poder ser respondida apenas com base no excerto.`;

const buildPrompt = (highlight: Highlight): string => {
  const noteHint = highlight.note ? `\n\nNota do leitor: ${highlight.note}` : '';
  return `Excerto:\n${highlight.text}${noteHint}`;
};

export interface AiTextRequest {
  system: string;
  prompt: string;
}

export type AiTextFn = (req: AiTextRequest) => Promise<string | null>;

/**
 * Gera um par pergunta/resposta usando uma função de IA fornecida pelo chamador
 * (`generateText` em produção, mockada em testes). Devolve `null` se a IA estiver
 * indisponível ou se a resposta não for parseável.
 */
export const generateWithAi = async (
  highlight: Highlight,
  getAiText: AiTextFn,
): Promise<AiCardContent | null> => {
  const reply = await getAiText({ system: AI_SYSTEM, prompt: buildPrompt(highlight) });
  if (reply === null) return null;
  return parseAiResponse(reply);
};
