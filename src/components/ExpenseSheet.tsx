import { format } from 'date-fns';
import { useState } from 'react';
import { Sheet } from 'konsta/react';
import { X } from 'lucide-react';
import {
  addExpense,
  EXPENSE_CATEGORIES,
} from '../db/expenses';
import { fromDateKey } from '../lib/day';
import { formatTaka } from '../lib/money';

interface ExpenseSheetProps {
  opened: boolean;
  dateKey: string;
  onClose: () => void;
}

export function ExpenseSheet({ opened, dateKey, onClose }: ExpenseSheetProps) {
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const amountValue = Number(amount);
  const canSubmit =
    !saving && Number.isFinite(amountValue) && amountValue > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError('');

    try {
      await addExpense({
        date: dateKey,
        category,
        amount: amountValue,
        note,
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Could not save expense.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      opened={opened}
      onBackdropClick={onClose}
      className="z-50 max-h-[88dvh]"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Add expense
            </h2>
            <p className="text-xs text-neutral-500">
              {format(fromDateKey(dateKey), 'dd MMM yyyy')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
            Category
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {EXPENSE_CATEGORIES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(name)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                  category === name
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-neutral-200 bg-white text-neutral-700'
                }`}
              >
                {name}
              </button>
            ))}
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Amount (৳)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              placeholder="0"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Note
            </span>
            <input
              type="text"
              placeholder="Optional"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </label>

          {amountValue > 0 && (
            <p className="mt-3 text-xs text-neutral-500">
              {category} expense of {formatTaka(amountValue)} will be deducted
              from the day&apos;s profit.
            </p>
          )}

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="border-t border-neutral-200 px-4 py-3 pb-safe-3">
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="h-12 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white transition active:bg-emerald-800 disabled:bg-neutral-300"
          >
            {saving ? 'Saving…' : 'Add expense'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
