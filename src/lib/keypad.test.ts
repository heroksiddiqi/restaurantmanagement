import { describe, expect, it } from 'vitest';
import { parseKeypad, resolveKeypad } from './keypad';

describe('parseKeypad', () => {
  it('parses codes with and without quantities', () => {
    expect(parseKeypad('201 201*2 501')).toEqual({
      entries: [
        { code: '201', qty: 1 },
        { code: '201', qty: 2 },
        { code: '501', qty: 1 },
      ],
      invalid: [],
    });
  });

  it('accepts x, commas and extra whitespace', () => {
    expect(parseKeypad('101x3, 202*1  603')).toEqual({
      entries: [
        { code: '101', qty: 3 },
        { code: '202', qty: 1 },
        { code: '603', qty: 1 },
      ],
      invalid: [],
    });
  });

  it('reports malformed tokens', () => {
    expect(parseKeypad('201*0 202*x 201** 301*')).toEqual({
      entries: [],
      invalid: ['201*0', '202*x', '201**', '301*'],
    });
  });
});

describe('resolveKeypad', () => {
  const known = new Set(['201', '501']);

  it('keeps known codes and lists unknown ones', () => {
    expect(resolveKeypad('201 999*2 501', known)).toEqual({
      entries: [
        { code: '201', qty: 1 },
        { code: '501', qty: 1 },
      ],
      unknown: ['999'],
      invalid: [],
    });
  });

  it('is case sensitive for codes', () => {
    expect(resolveKeypad('a1 A1', new Set(['a1'])).unknown).toEqual(['A1']);
  });
});
