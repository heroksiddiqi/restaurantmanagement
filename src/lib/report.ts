import { format } from 'date-fns';
import type { Expense, Order } from '../db/types';
import { addDays, dayRange, fromDateKey } from './day';

export interface ItemSale {
  code: string;
  name: string;
  qty: number;
  revenue: number;
}

export interface DayReport {
  date: string;
  orders: number;
  itemsSold: number;
  grossSales: number;
  discounts: number;
  netSales: number;
  vat: number;
  service: number;
  sales: number;
  cogs: number;
  grossProfit: number;
  expenses: number;
  netProfit: number;
  dueCollected: number;
  averageBill: number;
  topItems: ItemSale[];
}

export interface DueSummary {
  count: number;
  total: number;
}

export interface TrendPoint {
  date: string;
  label: string;
  sales: number;
  profit: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function summarizeDay(
  orders: Order[],
  expenses: Expense[],
  dateKey: string,
): DayReport {
  const { start, end } = dayRange(dateKey);
  const paid = orders.filter(
    (order) =>
      order.status === 'paid' &&
      order.paidAt != null &&
      order.paidAt >= start &&
      order.paidAt < end,
  );

  let grossSales = 0;
  let discounts = 0;
  let netSales = 0;
  let vat = 0;
  let service = 0;
  let sales = 0;
  let cogs = 0;
  let itemsSold = 0;
  let dueCollected = 0;

  const itemMap = new Map<string, ItemSale>();

  for (const order of paid) {
    grossSales += order.subtotal;
    discounts += order.discount;
    netSales += order.subtotal - order.discount;
    vat += order.vat;
    service += order.service;
    sales += order.total;
    if (order.createdAt < start) dueCollected += order.total;

    for (const line of order.items) {
      cogs += line.unitCost * line.qty;
      itemsSold += line.qty;

      const existing = itemMap.get(line.code);
      const revenue = line.unitPrice * line.qty;
      if (existing) {
        existing.qty += line.qty;
        existing.revenue += revenue;
      } else {
        itemMap.set(line.code, {
          code: line.code,
          name: line.name,
          qty: line.qty,
          revenue,
        });
      }
    }
  }

  const expenseTotal = expenses
    .filter((expense) => expense.date === dateKey)
    .reduce((sum, expense) => sum + expense.amount, 0);

  const grossProfit = netSales - cogs;

  const topItems = Array.from(itemMap.values())
    .map((item) => ({ ...item, revenue: round2(item.revenue) }))
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
    .slice(0, 5);

  return {
    date: dateKey,
    orders: paid.length,
    itemsSold,
    grossSales: round2(grossSales),
    discounts: round2(discounts),
    netSales: round2(netSales),
    vat: round2(vat),
    service: round2(service),
    sales: round2(sales),
    cogs: round2(cogs),
    grossProfit: round2(grossProfit),
    expenses: round2(expenseTotal),
    netProfit: round2(grossProfit - expenseTotal),
    dueCollected: round2(dueCollected),
    averageBill: paid.length > 0 ? round2(sales / paid.length) : 0,
    topItems,
  };
}

export function summarizeDue(orders: Order[]): DueSummary {
  const due = orders.filter((order) => order.status === 'due');
  return {
    count: due.length,
    total: round2(due.reduce((sum, order) => sum + order.total, 0)),
  };
}

export function buildTrend(
  orders: Order[],
  expenses: Expense[],
  endDateKey: string,
  days = 7,
): TrendPoint[] {
  const points: TrendPoint[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(endDateKey, -offset);
    const report = summarizeDay(orders, expenses, date);
    points.push({
      date,
      label: format(fromDateKey(date), 'EEE'),
      sales: report.sales,
      profit: report.netProfit,
    });
  }

  return points;
}

export function computeExpectedCash(
  openingCash: number,
  sales: number,
  expenses: number,
): number {
  return round2(openingCash + sales - expenses);
}
