import { describe, expect, it } from 'vitest';

import { formatSeriesLabel } from '@/lib/library/format';
import {
  MAX_COVER_BYTES,
  formatCoverError,
  validateCover,
} from '@/lib/library/cover-validation';

const makeFile = (mime: string, size: number): File => {
  const blob = new Blob([new Uint8Array(size)], { type: mime });
  return new File([blob], 'cover.bin', { type: mime });
};

describe('validateCover', () => {
  it('accepts JPEG within size limit', () => {
    expect(validateCover(makeFile('image/jpeg', 1024))).toBeNull();
  });

  it('accepts PNG within size limit', () => {
    expect(validateCover(makeFile('image/png', 500_000))).toBeNull();
  });

  it('accepts WebP within size limit', () => {
    expect(validateCover(makeFile('image/webp', 1_000_000))).toBeNull();
  });

  it('rejects GIF (unsupported MIME)', () => {
    const err = validateCover(makeFile('image/gif', 1024));
    expect(err).not.toBeNull();
    expect(err?.kind).toBe('invalid-type');
  });

  it('rejects PDF (non-image)', () => {
    const err = validateCover(makeFile('application/pdf', 1024));
    expect(err).not.toBeNull();
    expect(err?.kind).toBe('invalid-type');
  });

  it('rejects file over 2 MB', () => {
    const err = validateCover(makeFile('image/jpeg', MAX_COVER_BYTES + 1));
    expect(err).not.toBeNull();
    expect(err?.kind).toBe('too-large');
  });

  it('accepts file exactly at 2 MB limit', () => {
    expect(validateCover(makeFile('image/jpeg', MAX_COVER_BYTES))).toBeNull();
  });
});

describe('formatCoverError', () => {
  it('produces human-readable message for invalid type', () => {
    expect(formatCoverError({ kind: 'invalid-type', mime: 'image/gif' })).toContain('JPEG');
    expect(formatCoverError({ kind: 'invalid-type', mime: 'image/gif' })).toContain('PNG');
    expect(formatCoverError({ kind: 'invalid-type', mime: 'image/gif' })).toContain('WebP');
  });

  it('produces human-readable message for oversize with MB', () => {
    const msg = formatCoverError({ kind: 'too-large', size: 3 * 1024 * 1024 });
    expect(msg).toContain('3.0 MB');
    expect(msg).toContain('2 MB');
  });
});

describe('formatSeriesLabel', () => {
  it('returns "Series · Vol. N" when both set', () => {
    expect(formatSeriesLabel({ series: 'Dune', volume: 2 })).toBe('Dune · Vol. 2');
  });

  it('returns just series when no volume', () => {
    expect(formatSeriesLabel({ series: 'Foundation' })).toBe('Foundation');
  });

  it('returns null when no series even with volume', () => {
    expect(formatSeriesLabel({ volume: 1 })).toBeNull();
  });

  it('returns null when series is empty string', () => {
    expect(formatSeriesLabel({ series: '', volume: 1 })).toBeNull();
  });

  it('handles volume 0', () => {
    expect(formatSeriesLabel({ series: 'Prequel', volume: 0 })).toBe('Prequel · Vol. 0');
  });
});
