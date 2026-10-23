import { describe, expect, it } from 'vitest';
import { formatNumber, formatTaka, roundTaka } from './money';

describe('roundTaka', () => {
  it('rounds to the nearest taka', () => {
    expect(roundTaka(249.4)).toBe(249);
    expect(roundTaka(249.5)).toBe(250);
    expect(roundTaka(0)).toBe(0);
  });
});

describe('formatTaka', () => {
  it('formats with the taka symbol and thousands separators', () => {
    expect(formatTaka(1250)).toBe('৳1,250');
    expect(formatTaka(1250.6)).toBe('৳1,251');
    expect(formatTaka(0)).toBe('৳0');
  });

  it('keeps negative amounts readable', () => {
    expect(formatTaka(-450)).toBe('-৳450');
  });
});

describe('formatNumber', () => {
  it('formats plain numbers', () => {
    expect(formatNumber(12000)).toBe('12,000');
  });
});
