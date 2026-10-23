import { describe, expect, it } from 'vitest';
import { addDays, dayRange, fromDateKey, toDateKey } from './day';

describe('toDateKey', () => {
  it('uses the local calendar date', () => {
    expect(toDateKey(new Date(2026, 9, 23, 23, 59))).toBe('2026-10-23');
    expect(toDateKey(new Date(2026, 0, 2, 0, 1))).toBe('2026-01-02');
  });
});

describe('fromDateKey', () => {
  it('returns local midnight', () => {
    const date = fromDateKey('2026-10-23');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(9);
    expect(date.getDate()).toBe(23);
    expect(date.getHours()).toBe(0);
  });
});

describe('dayRange', () => {
  it('covers exactly one local day', () => {
    const { start, end } = dayRange('2026-10-23');
    expect(end - start).toBe(24 * 60 * 60 * 1000);
    expect(toDateKey(start)).toBe('2026-10-23');
    expect(toDateKey(end)).toBe('2026-10-24');
  });
});

describe('addDays', () => {
  it('moves across month and year boundaries', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });
});
