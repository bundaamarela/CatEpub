import { describe, expect, it } from 'vitest';

import { resolveAuto } from '@/lib/theme/useAutoTheme';

const at = (h: number, m = 0): Date => {
  const d = new Date(2026, 0, 1);
  d.setHours(h, m, 0, 0);
  return d;
};

describe('resolveAuto', () => {
  const schedule = { lightStart: '07:00', darkStart: '19:30' };

  it('returns light during the day (mid-morning)', () => {
    expect(resolveAuto(at(10), schedule)).toBe('light');
  });

  it('returns light at exactly lightStart', () => {
    expect(resolveAuto(at(7, 0), schedule)).toBe('light');
  });

  it('returns dark at exactly darkStart', () => {
    expect(resolveAuto(at(19, 30), schedule)).toBe('dark');
  });

  it('returns dark in the evening', () => {
    expect(resolveAuto(at(21), schedule)).toBe('dark');
  });

  it('returns dark before lightStart (early morning)', () => {
    expect(resolveAuto(at(3), schedule)).toBe('dark');
  });
});

describe('resolveAuto — wrap-around schedule', () => {
  // Light 22:00 - 06:00, dark 06:00 - 22:00
  const schedule = { lightStart: '22:00', darkStart: '06:00' };

  it('returns light at midnight', () => {
    expect(resolveAuto(at(0), schedule)).toBe('light');
  });

  it('returns dark at noon', () => {
    expect(resolveAuto(at(12), schedule)).toBe('dark');
  });

  it('returns light at 23:00', () => {
    expect(resolveAuto(at(23), schedule)).toBe('light');
  });

  it('returns dark at exactly darkStart (06:00)', () => {
    expect(resolveAuto(at(6, 0), schedule)).toBe('dark');
  });
});
