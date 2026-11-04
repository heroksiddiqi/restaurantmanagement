import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Navbar, Page } from 'konsta/react';
import { useState } from 'react';
import { DatePickSheet } from '../components/DatePickSheet';
import { FloatingBar } from '../components/FloatingBar';
import { db } from '../db/db';
import { addExpense } from '../db/expenses';
import { todayKey } from '../lib/day';
import { tapFeedback } from '../lib/haptics';
import { formatTaka } from '../lib/money';

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function ExpensePage() {
  const settings = useLiveQuery(() => db.settings.get('app'), []);

  const [dateKey, setDateKey] = useState(todayKey());
  const [dateOpen, setDateOpen] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const expenses = useLiveQuery(
    () => db.expenses.where('date').equals(dateKey).toArray(),
    [dateKey],
  );

  const dayExpenses = expenses ?? [];
  const expenseTotal = round2(
    dayExpenses.reduce((sum, expense) => sum + expense.amount, 0),
  );

  const amountValue = Number(amount);
  const canSubmit =
    !submitting &&
    name.trim().length > 0 &&
    Number.isFinite(amountValue) &&
    amountValue > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');

    try {
      await addExpense({
        date: dateKey,
        name,
        amount: amountValue,
      });
      tapFeedback();
      setName('');
      setAmount('');
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Something went wrong.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Page className="pb-[calc(160px+env(safe-area-inset-bottom))]">
      <Navbar
        title="Expense"
        subtitle={settings?.restaurantName ?? 'Daily expenses'}
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
        title="View expenses of"
        onChange={(key) => {
          if (key) setDateKey(key);
        }}
        onClose={() => setDateOpen(false)}
      />

      {/* Expense entry row */}
      <div className="mx-4 mt-3 grid grid-cols-12 gap-2">
        <input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSubmit();
          }}
          placeholder="Expense name"
          autoComplete="off"
          className="col-span-8 h-12 min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white"
        />
        <input
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            setError('');
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleSubmit();
          }}
          inputMode="decimal"
          placeholder="৳"
          autoComplete="off"
          className="col-span-2 h-12 min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 px-1.5 text-center text-sm font-semibold tabular-nums text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="col-span-2 h-12 rounded-xl bg-red-600 text-xs font-bold uppercase tracking-wide text-white transition active:bg-red-700 disabled:bg-neutral-300"
        >
          {submitting ? '…' : 'Submit'}
        </button>
      </div>

      {error && (
        <p className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <hr className="mx-4 my-4 border-t border-dashed border-neutral-200" />

      {/* Date heading */}
      <p className="mx-4 mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {dateKey === todayKey() ? 'Today' : format(new Date(dateKey), 'dd MMM yyyy')}
      </p>

      {/* Expense list */}
      {!expenses ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading expenses…
        </p>
      ) : dayExpenses.length === 0 ? (
        <div className="px-8 py-14 text-center">
          <p className="text-sm font-medium text-neutral-700">
            No expenses yet
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Type an expense name and amount above, then press Submit.
          </p>
        </div>
      ) : (
        <div className="mx-4 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {dayExpenses.map((expense) => (
            <div key={expense.id} className="px-3.5 py-2.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-semibold text-neutral-900">
                  {expense.name || 'Expense'}
                </p>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-red-600">
                  {formatTaka(expense.amount)}
                </p>
              </div>
              <p className="mt-0.5 text-[10px] text-neutral-400">
                {format(new Date(expense.date), 'dd MMM yyyy')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Floating total above the tabbar */}
      <FloatingBar
        label={`Total expense · ${dayExpenses.length} ${
          dayExpenses.length === 1 ? 'entry' : 'entries'
        }`}
        amount={expenseTotal}
        tone="red"
      />
    </Page>
  );
}
