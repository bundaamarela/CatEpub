export const formatSeriesLabel = (book: { series?: string; volume?: number }): string | null => {
  if (book.series === undefined || book.series.length === 0) return null;
  if (book.volume === undefined) return book.series;
  return `${book.series} · Vol. ${book.volume}`;
};
