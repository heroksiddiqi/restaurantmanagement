import { format } from 'date-fns';
import { useState } from 'react';
import { Sheet } from 'konsta/react';
import { X } from 'lucide-react';
import { saveDayClose } from '../db/dayClose';
import type { DayClose } from '../db/types';
import { fromDateKey } from '../lib/day';
import { formatTaka } from '../lib/money';
import { computeExpectedCash } from '../lib/report';

interface DayCloseSheetProps {
  opened: boolean;
  dateKey: string;
  sales: number;
  expenses: number;
  existing?: DayClose;
  previousCounted: number;
  onClose: () => void;
}

function LedgerRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-neutral-500">{label}</span>
      <span className="tabular-nums text-neutral-800">{value}</span>
    </div>
  );
}

export function DayCloseSheet({
  opened,
  dateKey,
  sales,
  expenses,
  existing,
  previousCounted,
  onClose,
}: DayCloseSheetProps) {
  const initialOpening = existing?.openingCash ?? previousCounted;
  const [opening, setOpening] = useState(() => String(initialOpening));
  const [counted, setCounted] = useState(() =>
    existing ? String(existing.countedCash) : '',
  );
  const [note, setNote] = useState(existing?.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const openingValue = Math.max(0, Number(opening) || 0);
  const expected = computeExpectedCash(openingValue, sales, expenses);
  const countedValue = Number(counted);
  const hasCount = counted.trim() !== '' && Number.isFinite(countedValue);
  const difference = countedValue - expected;
  const balanced = hasCount && Math.abs(difference) < 0.005;

  const canSubmit = !saving && hasCount && countedValue >= 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError('');

    try {
      await saveDayClose({
        date: dateKey,
        openingCash: openingValue,
        expectedCash: expected,
        countedCash: countedValue,
        note,
      });
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save the day close.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      opened={opened}
      onBackdropClick={onClose}
      className="z-50 max-h-[90dvh]"
    >
      <div className="flex max-h-[90dvh] flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              {existing ? 'Update day close' : 'Close day'}
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
          <div className="space-y-1.5 rounded-2xl border border-neutral-200 bg-white p-3">
            <LedgerRow
              label="Opening cash"
              value={formatTaka(openingValue)}
            />
            <LedgerRow label="Cash collected" value={formatTaka(sales)} />
            <LedgerRow label="Expenses" value={`-${formatTaka(expenses)}`} />
            <div className="border-t border-dashed border-neutral-200 pt-1.5">
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>Expected in drawer</span>
                <span className="tabular-nums">{formatTaka(expected)}</span>
              </div>
            </div>
          </div>

          <label className="mt-4 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Opening cash (৳)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              value={opening}
              onChange={(event) => setOpening(event.target.value)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              Counted cash (৳)
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={1}
              placeholder={String(expected)}
              value={counted}
              onChange={(event) => setCounted(event.target.value)}
              className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
            />
          </label>

          <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-100 px-3 py-2">
            <span className="text-sm text-neutral-600">Difference</span>
            <span
              className={`text-base font-semibold tabular-nums ${
                !hasCount
                  ? 'text-neutral-400'
                  : balanced
                    ? 'text-emerald-700'
                    : 'text-red-600'
              }`}
            >
              {!hasCount
                ? '—'
                : `${balanced ? '' : difference > 0 ? '+' : ''}${formatTaka(difference)}`}
            </span>
          </div>
          {hasCount && !balanced && (
            <p className="mt-1.5 px-1 text-[11px] text-red-600">
              {difference > 0
                ? 'Drawer is over the expected amount.'
                : 'Drawer is short of the expected amount.'}
            </p>
          )}

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
            {saving
              ? 'Saving…'
              : existing
                ? 'Update day close'
                : 'Save day close'}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
