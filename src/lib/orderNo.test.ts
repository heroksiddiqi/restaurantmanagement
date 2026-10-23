import { describe, expect, it } from 'vitest';
import {
  buildOrderNo,
  nextOrderNo,
  parseOrderSequence,
  startOfLocalDay,
} from './orderNo';

const noon = new Date(2026, 9, 23, 12, 30).getTime();

describe('buildOrderNo', () => {
  it('builds a daily order number', () => {
    expect(buildOrderNo(noon, 1)).toBe('OR-261023-001');
    expect(buildOrderNo(noon, 42)).toBe('OR-261023-042');
  });
});

describe('parseOrderSequence', () => {
  it('extracts the sequence', () => {
    expect(parseOrderSequence('OR-261023-007')).toBe(7);
  });

  it('returns null for unrelated numbers', () => {
    expect(parseOrderSequence('INV-1')).toBeNull();
    expect(parseOrderSequence('OR-261023-abc')).toBeNull();
  });
});

describe('nextOrderNo', () => {
  it('continues from the highest sequence of the day', () => {
    expect(nextOrderNo(['OR-261023-001', 'OR-261023-009'], noon)).toBe(
      'OR-261023-010',
    );
  });

  it('starts at one for an empty day', () => {
    expect(nextOrderNo([], noon)).toBe('OR-261023-001');
  });
});

describe('startOfLocalDay', () => {
  it('returns local midnight', () => {
    const start = new Date(startOfLocalDay(noon));
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(start.getDate()).toBe(23);
  });
});
