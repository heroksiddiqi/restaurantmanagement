import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { CalendarDays, Minus, Plus, Search, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogButton,
  Navbar,
  Page,
  Sheet,
} from 'konsta/react';
import { useMemo, useState } from 'react';
import { DatePickSheet } from '../components/DatePickSheet';
import { FloatingBar } from '../components/FloatingBar';
import { MenuGrid } from '../components/MenuGrid';
import { QuickKeypad } from '../components/QuickKeypad';
import { db } from '../db/db';
import { createCounterOrder } from '../db/orders';
import { saveDayClose } from '../db/dayClose';
import { MENU_CATEGORIES } from '../db/seed';
import type { MenuItem } from '../db/types';
import { tapFeedback } from '../lib/haptics';
import { resolveKeypad } from '../lib/keypad';
import { dayRange, todayKey } from '../lib/day';
import { parseOrderSequence } from '../lib/orderNo';
import { formatTaka } from '../lib/money';

const CATEGORY_ORDER: string[] = [...MENU_CATEGORIES];

function sortCategories(a: string, b: string): number {
  const indexA = CATEGORY_ORDER.indexOf(a);
  const indexB = CATEGORY_ORDER.indexOf(b);
  return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

interface SelectedLine {
  item: MenuItem;
  qty: number;
}

export function OrderEntryPage() {
  const settings = useLiveQuery(() => db.settings.get('app'), []);
  const menuItems = useLiveQuery(
    () => db.menuItems.orderBy('code').toArray(),
    [],
  );

  const [dateKey, setDateKey] = useState(todayKey());
  const [dateOpen, setDateOpen] = useState(false);
  const isToday = dateKey === todayKey();

  const orders = useLiveQuery(async () => {
    const { start, end } = dayRange(dateKey);
    return db.orders
      .where('createdAt')
      .between(start, end, true, false)
      .filter((order) => order.status === 'paid')
      .toArray();
  }, [dateKey]);

  const dayExpenses = useLiveQuery(
    () => db.expenses.where('date').equals(dateKey).toArray(),
    [dateKey],
  );

  const existingClose = useLiveQuery(
    () => db.dayCloses.where('date').equals(dateKey).first(),
    [dateKey],
  );

  const [amount, setAmount] = useState('');
  const [selected, setSelected] = useState<Map<number, SelectedLine>>(new Map());
  const [itemsOpen, setItemsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [keypad, setKeypad] = useState('');
  const [keypadError, setKeypadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [countedCash, setCountedCash] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [closeError, setCloseError] = useState('');
  const [closing, setClosing] = useState(false);

  const activeItems = useMemo(
    () => (menuItems ?? []).filter((item) => item.active),
    [menuItems],
  );

  const categories = useMemo(() => {
    const names = new Set<string>();
    for (const item of activeItems) names.add(item.category);
    return Array.from(names).sort(sortCategories);
  }, [activeItems]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activeItems.filter((item) => {
      const matchesCategory = category === 'All' || item.category === category;
      const matchesQuery =
        needle.length === 0 ||
        item.name.toLowerCase().includes(needle) ||
        item.code.includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [activeItems, category, query]);

  const quantities = useMemo(() => {
    const map = new Map<number, number>();
    for (const line of selected.values()) {
      map.set(line.item.id as number, line.qty);
    }
    return map;
  }, [selected]);

  const itemsSum = useMemo(() => {
    let sum = 0;
    for (const line of selected.values()) sum += line.item.price * line.qty;
    return round2(sum);
  }, [selected]);

  const hasItems = selected.size > 0;
  const effectiveAmount = hasItems ? itemsSum : Number(amount);
  const canSubmit = isToday && !submitting && effectiveAmount > 0;

  const dayOrders = orders ?? [];
  const totalAmount = dayOrders.reduce((sum, order) => sum + order.total, 0);
  const totalCount = dayOrders.length;

  const expenseTotal = round2(
    (dayExpenses ?? []).reduce((sum, expense) => sum + expense.amount, 0),
  );
  const expectedCash = round2(totalAmount - expenseTotal);
  const countedValue = Number(countedCash);
  const countedValid =
    Number.isFinite(countedValue) && countedValue >= 0 && countedCash !== '';
  const closeDifference = round2(countedValue - expectedCash);

  function handleAdd(item: MenuItem) {
    if (item.id == null) return;
    tapFeedback();
    setError('');
    setSelected((previous) => {
      const next = new Map(previous);
      const existing = next.get(item.id as number);
      next.set(item.id as number, { item, qty: (existing?.qty ?? 0) + 1 });
      return next;
    });
  }

  function adjustQty(menuItemId: number, delta: number) {
    setSelected((previous) => {
      const next = new Map(previous);
      const line = next.get(menuItemId);
      if (!line) return previous;
      const qty = line.qty + delta;
      if (qty <= 0) next.delete(menuItemId);
      else next.set(menuItemId, { ...line, qty });
      return next;
    });
  }

  function removeLine(menuItemId: number) {
    setSelected((previous) => {
      const next = new Map(previous);
      next.delete(menuItemId);
      return next;
    });
  }

  function handleKeypadSubmit() {
    const inbox = keypad.trim();
    if (!inbox) return;

    const knownCodes = new Set(activeItems.map((item) => item.code));
    const result = resolveKeypad(inbox, knownCodes);
    const problems = [
      ...result.unknown.map((code) => `Unknown code ${code}`),
      ...result.invalid.map((token) => `Invalid "${token}"`),
    ];

    if (problems.length > 0) {
      setKeypadError(problems.join(' · '));
      return;
    }

    setSelected((previous) => {
      const next = new Map(previous);
      for (const entry of result.entries) {
        const item = activeItems.find(
          (candidate) => candidate.code === entry.code,
        );
        if (item?.id == null) continue;
        const existing = next.get(item.id);
        next.set(item.id, { item, qty: (existing?.qty ?? 0) + entry.qty });
      }
      return next;
    });

    setKeypad('');
    setKeypadError('');
    setError('');
    tapFeedback();
  }

  async function handleSubmit() {
    if (!canSubmit || !(effectiveAmount > 0)) return;
    setSubmitting(true);
    setError('');

    try {
      await createCounterOrder({
        amount: effectiveAmount,
        items: Array.from(selected.values()).map((line) => ({
          item: line.item,
          qty: line.qty,
        })),
      });
      tapFeedback();
      setAmount('');
      setSelected(new Map());
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

  function handleCloseOpenChange(open: boolean) {
    setCloseOpen(open);
    if (open) {
      setCountedCash(
        existingClose ? String(existingClose.countedCash) : '',
      );
      setCloseNote(existingClose?.note ?? '');
      setCloseError('');
    }
  }

  async function handleSaveClose() {
    if (!countedValid || closing) return;
    setClosing(true);
    setCloseError('');

    try {
      await saveDayClose({
        date: dateKey,
        openingCash: existingClose?.openingCash ?? 0,
        expectedCash,
        countedCash: countedValue,
        note: closeNote,
      });
      setCloseOpen(false);
    } catch (saveError: unknown) {
      setCloseError(
        saveError instanceof Error
          ? saveError.message
          : 'Something went wrong.',
      );
    } finally {
      setClosing(false);
    }
  }

  return (
    <Page className="pb-[calc(160px+env(safe-area-inset-bottom))]">
      <Navbar
        title="Order"
        subtitle={settings?.restaurantName ?? 'Counter billing'}
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
        title="View orders of"
        onChange={(key) => {
          if (key) setDateKey(key);
        }}
        onClose={() => setDateOpen(false)}
      />

      {!isToday && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-800">
          Viewing {format(new Date(dateKey), 'dd MMM yyyy')} — bills can only be
          added for today.
        </div>
      )}

      {/* Bill amount input */}
      <div className="mx-4 mt-3 grid grid-cols-12 gap-2">
        <label className="col-span-10 relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400">
            ৳
          </span>
          <input
            value={hasItems ? String(itemsSum) : amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError('');
            }}
            disabled={hasItems || !isToday}
            inputMode="decimal"
            placeholder="0"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-7 pr-3 text-base font-semibold tabular-nums text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white disabled:bg-neutral-100 disabled:text-neutral-400 has-[&:not(:placeholder-shown)]:border-emerald-600"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!canSubmit}
          className="col-span-2 h-12 rounded-xl bg-emerald-700 text-xs font-bold uppercase tracking-wide text-white transition active:bg-emerald-800 disabled:bg-neutral-300"
        >
          {submitting ? '…' : 'Submit'}
        </button>
      </div>

      {/* Optional items */}
      {isToday && (
        <div className="mx-4 mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setItemsOpen(true)}
            className="flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs font-medium text-emerald-700 active:text-emerald-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Add items (optional)
            {hasItems && (
              <span className="rounded-full bg-emerald-100 px-1.5 text-[10px] font-semibold text-emerald-800">
                {hasItems ? itemsSum : ''}
              </span>
            )}
          </button>
          {hasItems && (
            <button
              type="button"
              onClick={() => setSelected(new Map())}
              className="rounded-lg px-1.5 py-1 text-xs font-medium text-red-600 active:bg-red-50"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {error && (
        <p className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <hr className="mx-4 my-4 border-t border-dashed border-neutral-200" />

      {/* Day's bills */}
      {!orders ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading orders…
        </p>
      ) : dayOrders.length === 0 ? (
        <div className="px-8 py-14 text-center">
          <p className="text-sm font-medium text-neutral-700">
            {isToday ? 'No bills yet' : 'No bills on this day'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {isToday
              ? 'Type the bill amount above and press Submit.'
              : 'Orders made on this date will be listed here.'}
          </p>
        </div>
      ) : (
        <div className="mx-4 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {dayOrders.map((order) => {
            const sequence = parseOrderSequence(order.orderNo);
            const itemNames = order.items
              .map((line) => `${line.name}${line.qty > 1 ? ` ×${line.qty}` : ''}`)
              .join(', ');

            return (
              <div key={order.id} className="px-3.5 py-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-semibold text-neutral-900">
                    Order #{sequence ?? order.orderNo}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-neutral-900">
                    Bill: {formatTaka(order.total)}
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
              </div>
            );
          })}
        </div>
      )}

      {/* Floating total above the tabbar */}
      <FloatingBar
        label={
          isToday
            ? `Total · ${totalCount} ${totalCount === 1 ? 'bill' : 'bills'}`
            : `${format(new Date(dateKey), 'dd MMM yyyy')} · ${totalCount} bills`
        }
        amount={totalAmount}
        tone="emerald"
        right={
          isToday ? (
            <button
              type="button"
              onClick={() => handleCloseOpenChange(true)}
              className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-white active:bg-white/25"
            >
              {existingClose ? 'Update close' : 'Close day'}
            </button>
          ) : existingClose ? (
            <span className="shrink-0 rounded-lg bg-white/15 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Closed
            </span>
          ) : undefined
        }
      />

      {/* Close day dialog */}
      <Dialog
        opened={closeOpen}
        onBackdropClick={() => handleCloseOpenChange(false)}
        title="Close the day?"
        content={
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-neutral-500">Orders total</span>
              <span className="tabular-nums">{formatTaka(totalAmount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-500">Expenses</span>
              <span className="tabular-nums">-{formatTaka(expenseTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-dashed border-neutral-200 pt-1 font-semibold">
              <span>Expected cash</span>
              <span className="tabular-nums">{formatTaka(expectedCash)}</span>
            </div>
            <label className="mt-2 block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Counted cash (৳)
              </span>
              <input
                value={countedCash}
                onChange={(event) => {
                  setCountedCash(event.target.value);
                  setCloseError('');
                }}
                inputMode="decimal"
                placeholder="0"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm tabular-nums text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
              />
            </label>
            {countedValid && (
              <p
                className={`text-xs font-medium ${
                  Math.abs(closeDifference) < 0.01
                    ? 'text-emerald-700'
                    : 'text-amber-700'
                }`}
              >
                Difference: {formatTaka(closeDifference)}
              </p>
            )}
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Note (optional)
              </span>
              <input
                value={closeNote}
                onChange={(event) => setCloseNote(event.target.value)}
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
              />
            </label>
            {closeError && (
              <p className="text-xs font-medium text-red-600">{closeError}</p>
            )}
          </div>
        }
        buttons={
          <>
            <DialogButton onClick={() => handleCloseOpenChange(false)}>
              Cancel
            </DialogButton>
            <DialogButton
              strong
              disabled={!countedValid || closing}
              onClick={() => void handleSaveClose()}
            >
              {closing ? 'Saving…' : 'Save close'}
            </DialogButton>
          </>
        }
      />

      {/* Item picker sheet */}
      <Sheet
        opened={itemsOpen}
        onBackdropClick={() => setItemsOpen(false)}
        className="z-50 flex h-[90dvh] flex-col pb-safe-3"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div>
            <p className="text-base font-semibold text-neutral-900">Add items</p>
            <p className="text-xs text-neutral-500">
              Optional — reference for the bill
            </p>
          </div>
          <button
            type="button"
            onClick={() => setItemsOpen(false)}
            aria-label="Close items"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
          <div className="mx-4 mt-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or code"
                inputMode="search"
                className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-9 pr-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white"
              />
            </div>

            <QuickKeypad
              value={keypad}
              error={keypadError}
              onChange={(value) => {
                setKeypad(value);
                setKeypadError('');
              }}
              onSubmit={handleKeypadSubmit}
            />
          </div>

          <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
            {['All', ...categories].map((name) => {
              const isSelected = category === name;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-neutral-200 bg-white text-neutral-600'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </div>

          <div className="mt-3 pb-2">
            {!menuItems ? (
              <p className="px-4 py-6 text-sm text-neutral-500">Loading menu…</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-neutral-500">
                No menu items match this search.
              </p>
            ) : (
              <MenuGrid
                items={filtered}
                quantities={quantities}
                onAdd={handleAdd}
              />
            )}
          </div>

          {hasItems && (
            <div className="mx-4 mb-2 space-y-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                Selected items
              </p>
              {Array.from(selected.values()).map((line) => (
                <div
                  key={line.item.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-neutral-800">
                      {line.item.name}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {line.item.code} · {formatTaka(line.item.price)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Decrease ${line.item.name}`}
                      onClick={() => adjustQty(line.item.id as number, -1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 active:bg-neutral-100"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums text-neutral-900">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase ${line.item.name}`}
                      onClick={() => adjustQty(line.item.id as number, 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 active:bg-neutral-100"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={`Remove ${line.item.name}`}
                      onClick={() => removeLine(line.item.id as number)}
                      className="flex h-7 w-7 items-center justify-center rounded-lg text-red-600 active:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between border-t border-dashed border-neutral-200 pt-2">
                <span className="text-sm text-neutral-600">Items total</span>
                <span className="text-sm font-semibold tabular-nums text-neutral-900">
                  {formatTaka(itemsSum)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-neutral-200 p-3">
          <button
            type="button"
            onClick={() => setItemsOpen(false)}
            className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white active:bg-emerald-800"
          >
            Done
          </button>
        </div>
      </Sheet>
    </Page>
  );
}
