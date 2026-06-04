import { describe, expect, it } from 'vitest';

import { isConvertible } from '@/lib/tauri/convert';

describe('isConvertible', () => {
  it('recognises .pdf', () => {
    expect(isConvertible('document.pdf')).toBe(true);
  });

  it('recognises .docx', () => {
    expect(isConvertible('report.docx')).toBe(true);
  });

  it('recognises .txt', () => {
    expect(isConvertible('notes.txt')).toBe(true);
  });

  it('recognises .html', () => {
    expect(isConvertible('page.html')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isConvertible('REPORT.PDF')).toBe(true);
    expect(isConvertible('Doc.DOCX')).toBe(true);
  });

  it('rejects .epub (already native)', () => {
    expect(isConvertible('book.epub')).toBe(false);
  });

  it('rejects unsupported extensions', () => {
    expect(isConvertible('image.png')).toBe(false);
    expect(isConvertible('data.csv')).toBe(false);
  });

  it('rejects no extension', () => {
    expect(isConvertible('README')).toBe(false);
  });
});

describe('convertFileToEpub PWA fallback', () => {
  it('returns null outside Tauri', async () => {
    const { convertFileToEpub } = await import('@/lib/tauri/convert');
    const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });
    expect(await convertFileToEpub(file)).toBeNull();
  });
});
