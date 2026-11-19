import { describe, expect, it } from 'vitest';
import { formatFixed, formatPercent } from './display.ts';

describe('formatPercent', () => {
  it('uses the configured number of decimals', () => {
    expect(formatPercent(28.4045, 2)).toBe('28.40%');
    expect(formatPercent(28.4045, 4)).toBe('28.4045%');
    expect(formatPercent(28.4045, 0)).toBe('28%');
  });

  it('marks non-zero values below the display step', () => {
    expect(formatPercent(0.004, 2)).toBe('<0.01%');
    expect(formatPercent(0.4, 0)).toBe('<1%');
  });

  it('keeps exact zero at zero', () => {
    expect(formatPercent(0, 2)).toBe('0.00%');
    expect(formatPercent(0, 0)).toBe('0%');
  });

  it('handles non-finite values', () => {
    expect(formatPercent(Number.NaN, 2)).toBe('-');
  });
});

describe('formatFixed', () => {
  it('uses the configured number of decimals', () => {
    expect(formatFixed(-26.4, 0)).toBe('-26');
    expect(formatFixed(-26.4, 1)).toBe('-26.4');
    expect(formatFixed(-26.4, 3)).toBe('-26.400');
  });

  it('handles non-finite values', () => {
    expect(formatFixed(Number.POSITIVE_INFINITY, 2)).toBe('-');
  });
});
