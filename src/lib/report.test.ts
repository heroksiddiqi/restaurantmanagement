import { describe, expect, it } from 'vitest';
import type { Expense, Order } from '../db/types';
import { fromDateKey } from './day';
import {
  buildTrend,
  computeExpectedCash,
  summarizeDay,
  summarizeDue,
} from './report';

const DAY = '2026-10-23';
const START = fromDateKey(DAY).getTime();

function makeOrder(overrides: Partial<Order>): Order {
  return {
    orderNo: 'OR-261023-001',
    type: 'dine-in',
    tableName: 'T-01',
    status: 'paid',
    items: [],
    subtotal: 0,
    discountType: 'fixed',
    discountValue: 0,
    discount: 0,
    vatPct: 0,
    servicePct: 0,
    vat: 0,
    service: 0,
    total: 0,
    paidAmount: 0,
    createdAt: START + 60 * 60 * 1000,
    ...overrides,
  };
}

describe('summarizeDay', () => {
  it('recognises revenue by paid date and ignores open dues', () => {
    const orders = [
      makeOrder({
        status: 'due',
        paidAt: undefined,
        total: 999,
        subtotal: 999,
      }),
      makeOrder({
        id: 2,
        paidAt: START + 10 * 60 * 60 * 1000,
        createdAt: START - 24 * 60 * 60 * 1000,
        subtotal: 200,
        discount: 20,
        vat: 9,
        service: 18,
        total: 207,
        items: [
          {
            menuItemId: 1,
            code: '201',
            name: 'Chicken Curry',
            unitPrice: 60,
            unitCost: 30,
            qty: 2,
          },
          {
            menuItemId: 2,
            code: '101',
            name: 'Plain Rice',
            unitPrice: 80,
            unitCost: 20,
            qty: 1,
          },
        ],
      }),
      makeOrder({
        id: 3,
        orderNo: 'OR-261024-001',
        paidAt: START + 48 * 60 * 60 * 1000,
        subtotal: 500,
        total: 500,
      }),
    ];

    const report = summarizeDay(orders, [], DAY);

    expect(report.orders).toBe(1);
    expect(report.sales).toBe(207);
    expect(report.netSales).toBe(180);
    expect(report.discounts).toBe(20);
    expect(report.vat).toBe(9);
    expect(report.service).toBe(18);
    expect(report.cogs).toBe(80);
    expect(report.grossProfit).toBe(100);
    expect(report.netProfit).toBe(100);
    expect(report.itemsSold).toBe(3);
    expect(report.dueCollected).toBe(207);
    expect(report.averageBill).toBe(207);
    expect(report.topItems[0]).toEqual({
      code: '201',
      name: 'Chicken Curry',
      qty: 2,
      revenue: 120,
    });
  });

  it('subtracts expenses recorded for the day only', () => {
    const orders = [
      makeOrder({
        paidAt: START + 1000,
        subtotal: 100,
        total: 100,
        items: [
          {
            menuItemId: 1,
            code: '101',
            name: 'Plain Rice',
            unitPrice: 100,
            unitCost: 40,
            qty: 1,
          },
        ],
      }),
    ];
    const expenses: Expense[] = [
      { date: DAY, category: 'Ingredients', amount: 25 },
      { date: '2026-10-22', category: 'Rent', amount: 500 },
    ];

    const report = summarizeDay(orders, expenses, DAY);
    expect(report.expenses).toBe(25);
    expect(report.netProfit).toBe(35);
  });

  it('returns zeroes for a day without sales', () => {
    const report = summarizeDay([], [], DAY);
    expect(report.orders).toBe(0);
    expect(report.sales).toBe(0);
    expect(report.netProfit).toBe(0);
    expect(report.topItems).toEqual([]);
  });
});

describe('summarizeDue', () => {
  it('totals all outstanding dues', () => {
    const orders = [
      makeOrder({ status: 'due', total: 120 }),
      makeOrder({ status: 'due', total: 80 }),
      makeOrder({ status: 'paid', total: 300 }),
    ];
    expect(summarizeDue(orders)).toEqual({ count: 2, total: 200 });
  });
});

describe('buildTrend', () => {
  it('returns one point per day ending on the selected date', () => {
    const points = buildTrend([], [], DAY);
    expect(points).toHaveLength(7);
    expect(points[0].date).toBe('2026-10-17');
    expect(points[6].date).toBe(DAY);
    expect(points[6].sales).toBe(0);
  });
});

describe('computeExpectedCash', () => {
  it('adds sales to opening cash and subtracts expenses', () => {
    expect(computeExpectedCash(1000, 450, 50)).toBe(1400);
  });
});
