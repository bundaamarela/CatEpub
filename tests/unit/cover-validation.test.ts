import { describe, expect, it } from 'vitest';

import {
  ALLOWED_COVER_MIMES,
  MAX_COVER_BYTES,
  validateCover,
} from '@/lib/library/cover-validation';

const makeFile = (mime: string, size: number): File => {
  const blob = new Blob([new Uint8Array(size)], { type: mime });
  return new File([blob], `cover.${mime.split('/')[1]}`, { type: mime });
};

describe('validateCover', () => {
  it('accepts PNG (for generate_covers.py output)', () => {
    const png = makeFile('image/png', 1024);
    expect(validateCover(png)).toBeNull();
  });

  it('accepts JPEG and WebP', () => {
    expect(validateCover(makeFile('image/jpeg', 1024))).toBeNull();
    expect(validateCover(makeFile('image/webp', 1024))).toBeNull();
  });

  it('rejects non-image mimes', () => {
    const err = validateCover(makeFile('application/pdf', 1024));
    expect(err).toEqual({ kind: 'invalid-type', mime: 'application/pdf' });
  });

  it('rejects files above the size cap', () => {
    const oversized = makeFile('image/png', MAX_COVER_BYTES + 1);
    const err = validateCover(oversized);
    expect(err?.kind).toBe('too-large');
  });

  it('allowlist includes png', () => {
    expect(ALLOWED_COVER_MIMES).toContain('image/png');
  });
});
