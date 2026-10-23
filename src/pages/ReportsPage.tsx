import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react';
import { Dialog, DialogButton, Navbar, Page } from 'konsta/react';
import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { DayCloseSheet } from '../components/DayCloseSheet';
import { ExpenseSheet } from '../components/ExpenseSheet';
import { db } from '../db/db';
import { deleteExpense } from '../db/expenses';
import type { Expense } from '../db/types';
import {
  addDays,
  fromDateKey,
  todayKey,
} from '../lib/day';
import { formatTaka } from '../lib/money';
import {
  buildTrend,
  computeExpectedCash,
  summarizeDay,
  summarizeDue,
} from '../lib/report';

interface RowProps {
  label: string;
  amount: number;
  negative?: boolean;
  strong?: boolean;
  tone?: 'default' | 'profit' | 'loss';
}

function Row({ label, amount, negative, strong, tone = 'default' }: RowProps) {
  const toneClass =
    tone === 'profit'
      ? 'text-emerald-700'
      : tone === 'loss'
        ? 'text-red-600'
        : 'text-neutral-800';

  return (
    <div className="flex items-center justify-between py-0.5">
      <span
        className={
          strong ? 'text-sm font-semibold text-neutral-900' : 'text-sm text-neutral-500'
        }
      >
        {label}
      </span>
      <span
        className={`tabular-nums ${strong ? 'text-sm font-semibold' : 'text-sm'} ${toneClass}`}
      >
        {(negative || amount < 0) && amount !== 0 ? '-' : ''}
        {formatTaka(Math.abs(amount))}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'default' | 'profit' | 'loss' | 'due';
}) {
  const valueClass =
    tone === 'profit'
      ? 'text-emerald-700'
      : tone === 'loss'
        ? 'text-red-600'
        : tone === 'due'
          ? 'text-amber-700'
          : 'text-neutral-900';

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-semibold leading-tight ${valueClass}`}>
        {value}
      </p>
      <p className="mt-0.5 text-[11px] text-neutral-500">{hint}</p>
    </div>
  );
}

export function ReportsPage() {
  const orders = useLiveQuery(() => db.orders.toArray(), []);
  const expenses = useLiveQuery(() => db.expenses.toArray(), []);
  const closes = useLiveQuery(() => db.dayCloses.toArray(), []);
  const settings = useLiveQuery(() => db.settings.get('app'), []);

  const [dateKey, setDateKey] = useState(todayKey);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const report = useMemo(
    () => summarizeDay(orders ?? [], expenses ?? [], dateKey),
    [orders, expenses, dateKey],
  );
  const due = useMemo(() => summarizeDue(orders ?? []), [orders]);
  const trend = useMemo(
    () => buildTrend(orders ?? [], expenses ?? [], dateKey),
    [orders, expenses, dateKey],
  );

  const dayExpenses = useMemo(
    () =>
      (expenses ?? [])
        .filter((expense) => expense.date === dateKey)
        .sort((a, b) => (b.id ?? 0) - (a.id ?? 0)),
    [expenses, dateKey],
  );

  const dayClose = (closes ?? []).find((close) => close.date === dateKey);
  const previousClose = (closes ?? [])
    .filter((close) => close.date < dateKey)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);

  const today = todayKey();
  const isToday = dateKey === today;
  const previousCounted = previousClose?.countedCash ?? 0;
  const previewOpening = dayClose?.openingCash ?? previousCounted;
  const previewExpected =
    dayClose?.expectedCash ??
    computeExpectedCash(previewOpening, report.sales, report.expenses);
  const previewDifference = dayClose
    ? dayClose.countedCash - dayClose.expectedCash
    : 0;

  async function handleDeleteExpense() {
    if (deleteTarget?.id == null) return;
    await deleteExpense(deleteTarget.id);
    setDeleteTarget(null);
  }

  return (
    <Page className="overflow-x-hidden pb-safe-24">
      <Navbar
        title="Reports"
        subtitle={settings?.restaurantName ?? 'Daily profit & loss'}
      />

      <div className="mx-4 mt-2 flex items-center gap-1 rounded-2xl border border-neutral-200 bg-white p-1.5">
        <button
          type="button"
          onClick={() => setDateKey((current) => addDays(current, -1))}
          aria-label="Previous day"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 active:bg-neutral-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <label className="relative min-w-0 flex-1 rounded-lg py-1 text-center active:bg-neutral-50">
          <span className="block truncate text-sm font-semibold text-neutral-900">
            {format(fromDateKey(dateKey), 'EEE, dd MMM yyyy')}
          </span>
          <span className="block text-[11px] text-neutral-500">
            {isToday ? 'Today · tap to change' : 'Tap to change date'}
          </span>
          <input
            type="date"
            value={dateKey}
            max={today}
            onChange={(event) => {
              if (event.target.value) setDateKey(event.target.value);
            }}
            aria-label="Report date"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>

        <button
          type="button"
          onClick={() => setDateKey((current) => addDays(current, 1))}
          disabled={dateKey >= today}
          aria-label="Next day"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-600 active:bg-neutral-100 disabled:text-neutral-300"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="mx-4 mt-3 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 p-4 text-white shadow-sm">
        <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-100">
          Sales collected
        </p>
        <p className="mt-1 text-3xl font-semibold leading-none">
          {formatTaka(report.sales)}
        </p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-emerald-100">
          <span>
            {report.orders} {report.orders === 1 ? 'order' : 'orders'}
          </span>
          <span>Avg {formatTaka(report.averageBill)}</span>
          {report.dueCollected > 0 && (
            <span>Due collected {formatTaka(report.dueCollected)}</span>
          )}
        </div>
      </div>

      <div className="mx-4 mt-2 grid grid-cols-2 gap-2">
        <StatCard
          label="Net profit"
          value={formatTaka(report.netProfit)}
          hint={`Gross ${formatTaka(report.grossProfit)}`}
          tone={report.netProfit >= 0 ? 'profit' : 'loss'}
        />
        <StatCard
          label="Expenses"
          value={formatTaka(report.expenses)}
          hint={`${dayExpenses.length} ${dayExpenses.length === 1 ? 'entry' : 'entries'}`}
        />
        <StatCard
          label="Due outstanding"
          value={formatTaka(due.total)}
          hint={`${due.count} ${due.count === 1 ? 'customer' : 'customers'}`}
          tone={due.total > 0 ? 'due' : 'default'}
        />
        <StatCard
          label="Items sold"
          value={String(report.itemsSold)}
          hint={`${report.orders} paid ${report.orders === 1 ? 'bill' : 'bills'}`}
        />
      </div>

      <section className="mx-4 mt-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <h2 className="mb-2 text-sm font-semibold text-neutral-900">
          Profit &amp; loss
        </h2>
        <Row label="Gross sales" amount={report.grossSales} />
        {report.discounts > 0 && (
          <Row label="Discounts" amount={report.discounts} negative />
        )}
        <Row label="Net sales" amount={report.netSales} strong />
        {report.vat > 0 && <Row label="VAT collected" amount={report.vat} />}
        {report.service > 0 && (
          <Row label="Service charge" amount={report.service} />
        )}
        <Row label="Total collected" amount={report.sales} strong />
        <div className="my-2 border-t border-dashed border-neutral-200" />
        <Row label="Cost of goods" amount={report.cogs} negative />
        <Row label="Gross profit" amount={report.grossProfit} strong />
        <Row label="Expenses" amount={report.expenses} negative />
        <div className="my-2 border-t border-dashed border-neutral-200" />
        <Row
          label="Net profit"
          amount={report.netProfit}
          strong
          tone={report.netProfit >= 0 ? 'profit' : 'loss'}
        />
      </section>

      <section className="mx-4 mt-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Last 7 days</h2>
          <div className="flex items-center gap-3 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm bg-emerald-700" /> Sales
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-600" /> Profit
            </span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={176}>
          <ComposedChart
            data={trend}
            margin={{ top: 8, right: 4, left: 4, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e5e5e5"
            />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 10, fill: '#737373' }}
            />
            <YAxis hide />
            <Tooltip
              formatter={(value) => formatTaka(Number(value))}
              contentStyle={{
                borderRadius: 12,
                borderColor: '#e5e5e5',
                fontSize: 12,
              }}
            />
            <Bar
              dataKey="sales"
              name="Sales"
              fill="#047857"
              radius={[4, 4, 0, 0]}
              barSize={16}
            />
            <Line
              dataKey="profit"
              name="Net profit"
              stroke="#d97706"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      <section className="mx-4 mt-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <h2 className="mb-1 text-sm font-semibold text-neutral-900">
          Top items
        </h2>
        {report.topItems.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-500">
            No items sold on this day.
          </p>
        ) : (
          <div>
            {report.topItems.map((item, index) => (
              <div
                key={item.code}
                className="flex items-center gap-2 border-t border-neutral-100 py-2 first:border-t-0"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-[11px] font-semibold text-neutral-500">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {item.name}
                  </p>
                  <p className="text-[11px] text-neutral-500">
                    {item.code} · {item.qty} sold
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-neutral-900">
                  {formatTaka(item.revenue)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-4 mt-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Expenses</h2>
          <button
            type="button"
            onClick={() => setExpenseOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white active:bg-emerald-800"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>

        {dayExpenses.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-500">
            No expenses recorded for this day.
          </p>
        ) : (
          <div>
            {dayExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center gap-2 border-t border-neutral-100 py-2 first:border-t-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-neutral-900">
                    {expense.category}
                  </p>
                  {expense.note && (
                    <p className="truncate text-[11px] text-neutral-500">
                      {expense.note}
                    </p>
                  )}
                </div>
                <span className="text-sm font-semibold tabular-nums text-neutral-900">
                  {formatTaka(expense.amount)}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(expense)}
                  aria-label={`Delete ${expense.category} expense`}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 active:bg-red-50 active:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mx-4 mt-4 rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-900">Day close</h2>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              dayClose
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-neutral-100 text-neutral-500'
            }`}
          >
            {dayClose ? 'Closed' : 'Open'}
          </span>
        </div>

        <div className="space-y-1">
          <Row label="Opening cash" amount={previewOpening} />
          <Row label="Cash collected" amount={report.sales} />
          <Row label="Expenses" amount={report.expenses} negative />
          <div className="border-t border-dashed border-neutral-200 pt-1">
            <Row label="Expected cash" amount={previewExpected} strong />
          </div>
          {dayClose && (
            <>
              <Row label="Counted cash" amount={dayClose.countedCash} />
              <Row
                label="Difference"
                amount={previewDifference}
                strong
                tone={Math.abs(previewDifference) < 0.005 ? 'profit' : 'loss'}
              />
            </>
          )}
        </div>

        {dayClose ? (
          <>
            {dayClose.note && (
              <p className="mt-2 text-[11px] text-neutral-500">
                Note: {dayClose.note}
              </p>
            )}
            <p className="mt-1 text-[11px] text-neutral-400">
              Closed at {format(new Date(dayClose.closedAt), 'hh:mm a')}
            </p>
            <button
              type="button"
              onClick={() => setCloseOpen(true)}
              className="mt-2 h-10 w-full rounded-xl border border-neutral-200 text-sm font-medium text-neutral-800 active:bg-neutral-100"
            >
              Update day close
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 text-[11px] text-neutral-500">
              Count the drawer at the end of the day. Expected cash = opening
              cash + cash collected − expenses.
            </p>
            <button
              type="button"
              onClick={() => setCloseOpen(true)}
              className="mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-emerald-700 text-sm font-semibold text-white active:bg-emerald-800"
            >
              <CalendarDays className="h-4 w-4" /> Close day
            </button>
          </>
        )}
      </section>

      {expenseOpen && (
        <ExpenseSheet
          opened
          dateKey={dateKey}
          onClose={() => setExpenseOpen(false)}
        />
      )}

      {closeOpen && (
        <DayCloseSheet
          opened
          dateKey={dateKey}
          sales={report.sales}
          expenses={report.expenses}
          existing={dayClose}
          previousCounted={previousCounted}
          onClose={() => setCloseOpen(false)}
        />
      )}

      <Dialog
        opened={deleteTarget != null}
        onBackdropClick={() => setDeleteTarget(null)}
        title="Delete expense?"
        content={
          deleteTarget
            ? `${deleteTarget.category} · ${formatTaka(deleteTarget.amount)} will be removed from this day.`
            : ''
        }
        buttons={
          <>
            <DialogButton onClick={() => setDeleteTarget(null)}>
              Keep
            </DialogButton>
            <DialogButton strong onClick={() => void handleDeleteExpense()}>
              Delete
            </DialogButton>
          </>
        }
      />
    </Page>
  );
}
