import { useLiveQuery } from 'dexie-react-hooks';
import { Minus, Plus, Search, Trash2 } from 'lucide-react';
import { Navbar, Page, Sheet } from 'konsta/react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { MenuGrid } from '../components/MenuGrid';
import { QuickKeypad } from '../components/QuickKeypad';
import { db } from '../db/db';
import { createCounterOrder } from '../db/orders';
import { MENU_CATEGORIES } from '../db/seed';
import type { MenuItem } from '../db/types';
import { tapFeedback } from '../lib/haptics';
import { resolveKeypad } from '../lib/keypad';
import { endOfLocalDay, parseOrderSequence, startOfLocalDay } from '../lib/orderNo';
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
  const todaysOrders = useLiveQuery(async () => {
    const timestamp = Date.now();
    return db.orders
      .where('createdAt')
      .between(startOfLocalDay(timestamp), endOfLocalDay(timestamp), true, false)
      .filter((order) => order.status === 'paid')
      .toArray();
  }, []);

  const [amount, setAmount] = useState('');
  const [selected, setSelected] = useState<Map<number, SelectedLine>>(new Map());
  const [itemsOpen, setItemsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [keypad, setKeypad] = useState('');
  const [keypadError, setKeypadError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    for (const line of selected.values()) map.set(line.item.id as number, line.qty);
    return map;
  }, [selected]);

  const itemsSum = useMemo(() => {
    let sum = 0;
    for (const line of selected.values()) {
      sum += line.item.price * line.qty;
    }
    return round2(sum);
  }, [selected]);

  const hasItems = selected.size > 0;
  const effectiveAmount = hasItems ? itemsSum : Number(amount);
  const canSubmit = !submitting && effectiveAmount > 0;

  const orders = todaysOrders ?? [];
  const totalAmount = orders.reduce((sum, order) => sum + order.total, 0);
  const totalCount = orders.length;

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
        const item = activeItems.find((candidate) => candidate.code === entry.code);
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

  return (
    <Page className="pb-safe-24">
      <Navbar
        title="Order"
        subtitle={settings?.restaurantName ?? 'Counter billing'}
      />

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
            disabled={hasItems}
            inputMode="decimal"
            placeholder="0"
            autoComplete="off"
            className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 pl-7 pr-3 text-base font-semibold tabular-nums text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white disabled:bg-emerald-50 disabled:text-neutral-700"
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

      {error && (
        <p className="mx-4 mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <hr className="mx-4 my-4 border-t border-dashed border-neutral-200" />

      {/* Today's bills */}
      {!todaysOrders ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading orders…
        </p>
      ) : orders.length === 0 ? (
        <div className="px-8 py-14 text-center">
          <p className="text-sm font-medium text-neutral-700">No bills yet</p>
          <p className="mt-1 text-xs text-neutral-500">
            Type the bill amount above and press Submit.
          </p>
        </div>
      ) : (
        <div className="mx-4 divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          {orders.map((order) => {
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
                  {order.orderNo}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {todaysOrders && totalCount > 0 && (
        <div className="mx-4 mt-4 rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-sm">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-100">
                Total · {totalCount} {totalCount === 1 ? 'bill' : 'bills'}
              </p>
              <p className="mt-1 text-2xl font-semibold leading-none">
                {formatTaka(totalAmount)}
              </p>
            </div>
          </div>
        </div>
      )}

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
