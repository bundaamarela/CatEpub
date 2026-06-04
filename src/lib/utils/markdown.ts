import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.setOptions({ gfm: true, breaks: true });

/**
 * Converte markdown em HTML sanitizado, pronto para `dangerouslySetInnerHTML`.
 * Usa `marked.parse(... , { async: false })` para garantir retorno síncrono.
 */
export const renderMarkdown = (md: string): string => {
  const raw = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(raw, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'del', 's', 'a', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'span',
    ],
    ALLOWED_ATTR: ['href', 'title', 'class'],
  });
};
