export interface Note {
  id: string;
  bookId: string;
  cfi?: string;
  highlightId?: string;
  title?: string;
  body: string; // markdown
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  bookId: string;
  cfi: string;
  label?: string;
  createdAt: string;
}
