import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { Navbar, Page } from 'konsta/react';
import { useMemo, useState } from 'react';
import { db } from '../db/db';
import { expenseTitle } from '../db/expenses';
import {
  fromDateKey,
  startOfMonthKey,
  toDateKey,
  todayKey,
} from '../lib/day';
import { formatTaka } from '../lib/money';

type Preset =
  | 'today'
  | 'week'
  | 'month'
  | 'lastMonth'
  | 'year'
  | 'custom';

type View = 'summary' | 'detailed';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'year', label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

interface ReportRange {
  start: number;
  end: number;
  fromKey: string;
  toKey: string;
  title: string;
}

function computeRange(preset: Preset, fromKey: string, toKey: string): ReportRange {
  const now = new Date();
  const today = todayKey();

  if (preset === 'today') {
    return {
      start: fromDateKey(today).getTime(),
      end: fromDateKey(today).getTime() + 24 * 60 * 60 * 1000,
      fromKey: today,
      toKey: today,
      title: 'Today',
    };
  }

  if (preset === 'week') {
    const dow = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - dow);
    weekStart.setHours(0, 0, 0, 0);
    const from = toDateKey(weekStart);
    return {
      start: weekStart.getTime(),
      end: weekStart.getTime() + 7 * 24 * 60 * 60 * 1000,
      fromKey: from,
      toKey: today,
      title: 'This week',
    };
  }

  if (preset === 'month') {
    const from = startOfMonthKey(today);
    const start = fromDateKey(from);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return {
      start: start.getTime(),
      end: end.getTime(),
      fromKey: from,
      toKey: today,
      title: format(now, 'MMMM yyyy'),
    };
  }

  if (preset === 'lastMonth') {
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const from = toDateKey(lastMonthDate);
    const start = fromDateKey(from);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);
    return {
      start: start.getTime(),
      end: end.getTime(),
      fromKey: from,
      toKey: toDateKey(end),
      title: format(lastMonthDate, 'MMMM yyyy'),
    };
  }

  if (preset === 'year') {
    const year = now.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    return {
      start: start.getTime(),
      end: end.getTime(),
      fromKey: toDateKey(start),
      toKey: today,
      title: String(year),
    };
  }

  // custom
  const start = fromDateKey(fromKey).getTime();
  const end = fromDateKey(toKey).getTime() + 24 * 60 * 60 * 1000;
  return {
    start,
    end,
    fromKey,
    toKey,
    title:
      fromKey === toKey
        ? format(fromDateKey(fromKey), 'dd MMM yyyy')
        : `${format(fromDateKey(fromKey), 'dd MMM')} – ${format(fromDateKey(toKey), 'dd MMM yyyy')}`,
  };
}

interface ReportRow {
  id: number | string;
  title: string;
  subtitle: string;
  amount: number;
}

export function ReportsPage() {
  const settings = useLiveQuery(() => db.settings.get('app'), []);

  const [preset, setPreset] = useState<Preset>('today');
  const [view, setView] = useState<View>('summary');
  const [fromKey, setFromKey] = useState(
    startOfMonthKey(todayKey()),
  );
  const [toKey, setToKey] = useState(todayKey());

  const range = useMemo(
    () => computeRange(preset, fromKey, toKey),
    [preset, fromKey, toKey],
  );

  const orders = useLiveQuery(async () => {
    const all = await db.orders.toArray();
    return all.filter(
      (order) =>
        order.status === 'paid' &&
        order.paidAt != null &&
        order.paidAt >= range.start &&
        order.paidAt < range.end,
    );
  }, [range.start, range.end]);

  const expenses = useLiveQuery(
    async () => {
      const all = await db.expenses.toArray();
      return all.filter(
        (expense) =>
          expense.date >= range.fromKey && expense.date <= range.toKey,
      );
    },
    [range.fromKey, range.toKey],
  );

  const dayOrders = useMemo(() => orders ?? [], [orders]);
  const dayExpenses = useMemo(() => expenses ?? [], [expenses]);

  const ordersTotal = dayOrders.reduce((sum, order) => sum + order.total, 0);
  const expensesTotal = dayExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const profit = ordersTotal - expensesTotal;

  const orderRows: ReportRow[] = useMemo(
    () =>
      dayOrders.map((order) => ({
        id: order.id ?? order.orderNo,
        title: `Order #${order.orderNo}`,
        subtitle: format(new Date(order.paidAt ?? order.createdAt), 'dd MMM, hh:mm a'),
        amount: order.total,
      })),
    [dayOrders],
  );

  const expenseRows: ReportRow[] = useMemo(
    () =>
      dayExpenses.map((expense) => ({
        id: expense.id ?? `${expense.date}-${expense.name ?? ''}`,
        title: expenseTitle(expense),
        subtitle: format(new Date(expense.date), 'dd MMM yyyy'),
        amount: expense.amount,
      })),
    [dayExpenses],
  );

  return (
    <Page className="pb-safe-24 overflow-x-hidden">
      <Navbar
        title="Reports"
        subtitle={settings?.restaurantName ?? 'Profit & loss'}
      />

      {/* Preset shortcuts */}
      <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar">
        {PRESETS.map((entry) => {
          const selected = preset === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setPreset(entry.key)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selected
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-neutral-200 bg-white text-neutral-600'
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>

      {/* Custom range inputs */}
      {preset === 'custom' && (
        <div className="mx-4 mt-3 grid grid-cols-2 gap-2">
          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              From
            </span>
            <input
              type="date"
              value={fromKey}
              max={toKey}
              onChange={(event) => {
                if (event.target.value) setFromKey(event.target.value);
              }}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </label>
          <label>
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              To
            </span>
            <input
              type="date"
              value={toKey}
              min={fromKey}
              max={todayKey()}
              onChange={(event) => {
                if (event.target.value) setToKey(event.target.value);
              }}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </label>
        </div>
      )}

      <p className="mx-4 mt-3 text-base font-semibold text-neutral-900">
        {range.title}
      </p>

      {/* Summary / Detailed switch */}
      <div className="mx-4 mt-2 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1">
        {(['summary', 'detailed'] as View[]).map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setView(entry)}
            className={`rounded-lg py-2 text-xs font-semibold capitalize transition ${
              view === entry
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500'
            }`}
          >
            {entry}
          </button>
        ))}
      </div>

      {!orders || !expenses ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading report…
        </p>
      ) : view === 'summary' ? (
        <div className="mt-3 space-y-3 px-4">
          <div className="rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-100">
              Orders · {dayOrders.length}{' '}
              {dayOrders.length === 1 ? 'bill' : 'bills'}
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none tabular-nums">
              {formatTaka(ordersTotal)}
            </p>
          </div>

          <div className="rounded-2xl bg-red-600 px-4 py-3 text-white shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-widest text-red-100">
              Expenses · {dayExpenses.length}{' '}
              {dayExpenses.length === 1 ? 'entry' : 'entries'}
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none tabular-nums">
              {formatTaka(expensesTotal)}
            </p>
          </div>

          <div
            className={`rounded-2xl px-4 py-3 text-white shadow-sm ${
              profit >= 0 ? 'bg-emerald-600' : 'bg-red-700'
            }`}
          >
            <p className="text-[11px] font-medium uppercase tracking-widest text-white/80">
              {profit >= 0 ? 'Profit' : 'Loss'} · orders − expenses
            </p>
            <p className="mt-1 text-3xl font-semibold leading-none tabular-nums">
              {formatTaka(Math.abs(profit))}
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 overflow-x-auto pb-2">
            <div className="flex w-max gap-3 px-4">
              {/* Orders / income column */}
              <section className="flex w-72 shrink-0 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <p className="border-b border-emerald-100 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Orders / Income
                </p>
                <div className="divide-y divide-neutral-100">
                  {orderRows.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-neutral-400">
                      No orders in range
                    </p>
                  ) : (
                    orderRows.map((row) => (
                      <div key={row.id} className="px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 truncate text-xs font-semibold text-neutral-800">
                            {row.title}
                          </p>
                          <p className="shrink-0 text-xs font-semibold tabular-nums text-emerald-700">
                            {formatTaka(row.amount)}
                          </p>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          {row.subtitle}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-dashed border-emerald-200 px-3 py-2">
                  <span className="text-xs font-semibold text-neutral-600">
                    Total orders
                  </span>
                  <span className="text-xs font-bold tabular-nums text-emerald-700">
                    {formatTaka(ordersTotal)}
                  </span>
                </div>
              </section>

              {/* Expenses column */}
              <section className="flex w-72 shrink-0 flex-col rounded-2xl border border-neutral-200 bg-white shadow-sm">
                <p className="border-b border-red-100 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-red-600">
                  Expenses
                </p>
                <div className="divide-y divide-neutral-100">
                  {expenseRows.length === 0 ? (
                    <p className="px-3 py-6 text-center text-xs text-neutral-400">
                      No expenses in range
                    </p>
                  ) : (
                    expenseRows.map((row) => (
                      <div key={row.id} className="px-3 py-2">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="min-w-0 truncate text-xs font-semibold text-neutral-800">
                            {row.title}
                          </p>
                          <p className="shrink-0 text-xs font-semibold tabular-nums text-red-600">
                            {formatTaka(row.amount)}
                          </p>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          {row.subtitle}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-dashed border-red-200 px-3 py-2">
                  <span className="text-xs font-semibold text-neutral-600">
                    Total expense
                  </span>
                  <span className="text-xs font-bold tabular-nums text-red-600">
                    {formatTaka(expensesTotal)}
                  </span>
                </div>
              </section>
            </div>
          </div>

          {/* Profit / loss for the same range — outside the horizontal scroll
              so it stays visible while the columns are swiped. */}
          <div
            className={`mx-4 mt-1 rounded-2xl px-4 py-3 text-white shadow-sm ${
              profit >= 0 ? 'bg-emerald-600' : 'bg-red-700'
            }`}
          >
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-medium uppercase tracking-widest text-white/80">
                  {profit >= 0 ? 'Profit' : 'Loss'} · orders − expenses
                </p>
                <p className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                  {formatTaka(Math.abs(profit))}
                </p>
              </div>
              <div className="shrink-0 space-y-0.5 text-right text-[11px] leading-tight text-white/80">
                <p className="tabular-nums">
                  Orders {formatTaka(ordersTotal)}
                </p>
                <p className="tabular-nums">
                  Expenses −{formatTaka(expensesTotal)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </Page>
  );
}
