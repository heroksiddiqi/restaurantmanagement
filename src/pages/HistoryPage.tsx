import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Navbar, Page } from 'konsta/react';
import { useState } from 'react';
import { DatePickSheet } from '../components/DatePickSheet';
import { FloatingBar } from '../components/FloatingBar';
import { db } from '../db/db';
import { expenseTitle } from '../db/expenses';
import { parseOrderSequence } from '../lib/orderNo';
import { dayRange, todayKey } from '../lib/day';
import { formatTaka } from '../lib/money';

type Mode = 'orders' | 'expenses' | 'both';

const MODES: { key: Mode; label: string }[] = [
  { key: 'orders', label: 'Order' },
  { key: 'expenses', label: 'Expense' },
  { key: 'both', label: 'Both' },
];

export function HistoryPage() {
  const [dateKey, setDateKey] = useState(todayKey());
  const [dateOpen, setDateOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('both');

  const orders = useLiveQuery(async () => {
    const { start, end } = dayRange(dateKey);
    return db.orders
      .where('createdAt')
      .between(start, end, true, false)
      .filter((order) => order.status === 'paid')
      .toArray();
  }, [dateKey]);

  const expenses = useLiveQuery(
    () => db.expenses.where('date').equals(dateKey).toArray(),
    [dateKey],
  );

  const dayOrders = orders ?? [];
  const dayExpenses = expenses ?? [];

  const ordersTotal = dayOrders.reduce((sum, order) => sum + order.total, 0);
  const expensesTotal = dayExpenses.reduce(
    (sum, expense) => sum + expense.amount,
    0,
  );
  const profit = ordersTotal - expensesTotal;

  return (
    <Page className="pb-[calc(160px+env(safe-area-inset-bottom))]">
      <Navbar
        title="History"
        subtitle={format(new Date(dateKey), 'dd MMM yyyy')}
        right={
          <button
            type="button"
            onClick={() => setDateOpen(true)}
            aria-label="Pick date"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 active:bg-neutral-100"
          >
            <CalendarDays className="h-5 w-5" />
          </button>
        }
      />

      <DatePickSheet
        opened={dateOpen}
        value={dateKey}
        max={todayKey()}
        title="View history of"
        onChange={(key) => {
          if (key) setDateKey(key);
        }}
        onClose={() => setDateOpen(false)}
      />

      {/* Read-only mode switch */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1">
        {MODES.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setMode(entry.key)}
            className={`rounded-lg py-2 text-xs font-semibold transition ${
              mode === entry.key
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500'
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {/* Entries */}
      {!orders || !expenses ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading records…
        </p>
      ) : dayOrders.length === 0 && dayExpenses.length === 0 ? (
        <div className="px-8 py-14 text-center">
          <p className="text-sm font-medium text-neutral-700">
            Nothing recorded
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            No orders or expenses on this date.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2.5 px-4">
          {mode !== 'expenses' &&
            dayOrders.map((order) => {
              const sequence = parseOrderSequence(order.orderNo);
              const itemNames = order.items
                .map((line) => `${line.name}${line.qty > 1 ? ` ×${line.qty}` : ''}`)
                .join(', ');

              return (
                <article
                  key={`order-${order.id}`}
                  className="rounded-2xl border border-emerald-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-emerald-800">
                      Order #{sequence ?? order.orderNo}
                    </p>
                    <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">
                      {formatTaka(order.total)}
                    </p>
                  </div>
                  {itemNames && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                      {itemNames}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-neutral-400">
                    {format(new Date(order.createdAt), 'hh:mm a')} ·{' '}
                    {format(new Date(order.createdAt), 'dd MMM yyyy')}
                  </p>
                </article>
              );
            })}

          {mode !== 'orders' &&
            dayExpenses.map((expense) => (
              <article
                key={`expense-${expense.id}`}
                className="rounded-2xl border border-red-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-red-700">
                    {expenseTitle(expense)}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-red-600">
                    {formatTaka(expense.amount)}
                  </p>
                </div>
                <p className="mt-0.5 text-[10px] text-neutral-400">
                  {format(new Date(expense.date), 'dd MMM yyyy')}
                </p>
              </article>
            ))}
        </div>
      )}

      {/* Floating total / profit-loss */}
      {mode === 'orders' ? (
        <FloatingBar
          label={`Orders total · ${dayOrders.length} bills`}
          amount={ordersTotal}
          tone="emerald"
        />
      ) : mode === 'expenses' ? (
        <FloatingBar
          label={`Expense total · ${dayExpenses.length} entries`}
          amount={expensesTotal}
          tone="red"
        />
      ) : (
        <FloatingBar
          label={`Profit · orders − expenses`}
          amount={Math.abs(profit)}
          tone={profit >= 0 ? 'emerald' : 'red'}
        />
      )}
    </Page>
  );
}
