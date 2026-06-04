export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'purple';

export type SemanticTag = 'fact' | 'argue' | 'concept' | 'question' | 'quote';

export interface Highlight {
  id: string;
  bookId: string;
  cfiRange: string; // CFI start-end
  text: string;
  context?: string; // ~50 chars antes/depois
  color: HighlightColor;
  semanticTag?: SemanticTag;
  note?: string; // markdown
  tags: string[]; // hierárquicas: "estratégia/jogos"
  createdAt: string;
  updatedAt: string;
}
