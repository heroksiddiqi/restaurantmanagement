import { describe, expect, it } from 'vitest';
import { calculateBill, calculateChange } from './bill';

const settings = { vatPct: 0, servicePct: 0, roundToTaka: true };

describe('calculateBill', () => {
  it('sums lines and rounds the total', () => {
    const totals = calculateBill(
      [
        { price: 30, cost: 10, qty: 2 },
        { price: 150, cost: 70, qty: 1 },
        { price: 20, cost: 7, qty: 3 },
      ],
      0,
      settings,
    );

    expect(totals.subtotal).toBe(270);
    expect(totals.discount).toBe(0);
    expect(totals.total).toBe(270);
    expect(totals.cogs).toBe(111);
    expect(totals.grossProfit).toBe(159);
  });

  it('applies a fixed discount and clamps it to the subtotal', () => {
    const line = [{ price: 100, cost: 40, qty: 1 }];

    expect(calculateBill(line, 20, settings).total).toBe(80);
    expect(calculateBill(line, 500, settings).total).toBe(0);
    expect(calculateBill(line, -50, settings).total).toBe(100);
  });

  it('applies VAT and service charge on the discounted amount', () => {
    const totals = calculateBill(
      [{ price: 100, cost: 40, qty: 1 }],
      20,
      { vatPct: 5, servicePct: 10, roundToTaka: true },
    );

    expect(totals.taxable).toBe(80);
    expect(totals.vat).toBe(4);
    expect(totals.service).toBe(8);
    expect(totals.total).toBe(92);
  });

  it('keeps decimals when rounding is disabled', () => {
    const totals = calculateBill(
      [{ price: 100, cost: 40, qty: 1 }],
      20,
      { vatPct: 5, servicePct: 10, roundToTaka: false },
    );

    expect(totals.total).toBe(92);
    expect(totals.vat).toBe(4);
  });

  it('handles an empty bill', () => {
    const totals = calculateBill([], 0, settings);
    expect(totals.subtotal).toBe(0);
    expect(totals.total).toBe(0);
    expect(totals.cogs).toBe(0);
    expect(totals.grossProfit).toBe(0);
  });
});

describe('calculateChange', () => {
  it('returns the difference when the customer overpays', () => {
    expect(calculateChange(500, 470)).toBe(30);
  });

  it('never returns a negative change', () => {
    expect(calculateChange(300, 470)).toBe(0);
  });
});
