import Anthropic from '@anthropic-ai/sdk';

import { usePrefs } from '@/lib/store/prefs';

/**
 * Modelo padrão. Mantemos `claude-sonnet-4-6` para equilíbrio
 * custo/qualidade nas tarefas de definição/tradução/chat.
 */
export const DEFAULT_MODEL = 'claude-sonnet-4-6';

/**
 * Lê configuração de IA do store de preferências (não-reactivo —
 * adequado para chamadas em event handlers / async).
 */
const getAiConfig = (): { apiKey: string | undefined; enabled: boolean } => {
  const { aiProvider, aiApiKey } = usePrefs.getState();
  return {
    apiKey: aiApiKey,
    enabled: aiProvider === 'anthropic' && typeof aiApiKey === 'string' && aiApiKey.length > 0,
  };
};

/** Devolve `true` se o cliente pode ser usado. */
export const isAiEnabled = (): boolean => getAiConfig().enabled;

/**
 * Cria um cliente Anthropic se a configuração for válida; caso contrário
 * devolve `null`. Usa `dangerouslyAllowBrowser` porque o utilizador fornece
 * a sua própria API key (uso pessoal, não exposição multi-tenant).
 */
const createClient = (): Anthropic | null => {
  const { apiKey, enabled } = getAiConfig();
  if (!enabled || apiKey === undefined) return null;
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
};

interface CompletionOptions {
  system?: string;
  prompt: string;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Geração simples de texto. Devolve `null` silenciosamente se IA está
 * desactivada ou se a chamada falha — chamadores devem oferecer fallback.
 */
export const generateText = async ({
  system,
  prompt,
  maxTokens = 512,
  signal,
}: CompletionOptions): Promise<string | null> => {
  const client = createClient();
  if (!client) return null;
  try {
    const response = await client.messages.create(
      {
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        ...(system !== undefined ? { system } : {}),
        messages: [{ role: 'user', content: prompt }],
      },
      signal !== undefined ? { signal } : {},
    );
    const block = response.content[0];
    if (block && block.type === 'text') return block.text;
    return null;
  } catch (err) {
    if (signal?.aborted) return null;
    console.error('[ai/client] generateText failed', err);
    return null;
  }
};

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  system: string;
  messages: ChatMessage[];
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Conversa multi-turn. Devolve `null` se desactivado ou em caso de erro.
 */
export const chat = async ({
  system,
  messages,
  maxTokens = 1024,
  signal,
}: ChatOptions): Promise<string | null> => {
  const client = createClient();
  if (!client) return null;
  try {
    const response = await client.messages.create(
      {
        model: DEFAULT_MODEL,
        max_tokens: maxTokens,
        system,
        messages,
      },
      signal !== undefined ? { signal } : {},
    );
    const block = response.content[0];
    if (block && block.type === 'text') return block.text;
    return null;
  } catch (err) {
    if (signal?.aborted) return null;
    console.error('[ai/client] chat failed', err);
    return null;
  }
};
