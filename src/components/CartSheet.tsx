import { Minus, Plus, Trash2 } from 'lucide-react';
import { Sheet } from 'konsta/react';
import type { Order } from '../db/types';
import { formatTaka } from '../lib/money';

interface CartSheetProps {
  opened: boolean;
  order: Order;
  onClose: () => void;
  onReview: () => void;
  onQtyChange: (menuItemId: number, qty: number) => void;
  onRemove: (menuItemId: number) => void;
}

export function CartSheet({
  opened,
  order,
  onClose,
  onReview,
  onQtyChange,
  onRemove,
}: CartSheetProps) {
  const count = order.items.reduce((sum, line) => sum + line.qty, 0);

  return (
    <Sheet
      opened={opened}
      onBackdropClick={onClose}
      className="z-50 max-h-[85dvh]"
    >
      <div className="flex max-h-[85dvh] flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Current order
            </h2>
            <p className="text-xs text-neutral-500">
              {order.tableName ?? 'Parcel'} · {count}{' '}
              {count === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-neutral-500 active:bg-neutral-100"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {order.items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-neutral-500">
              No items yet. Tap a menu card or use the quick keypad.
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {order.items.map((line) => (
                <li key={line.menuItemId} className="flex items-center gap-2 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {line.name}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {line.code} · {formatTaka(line.unitPrice)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onQtyChange(line.menuItemId, line.qty - 1)}
                      aria-label={`Decrease ${line.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 active:bg-neutral-100"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-7 text-center text-sm font-semibold tabular-nums text-neutral-900">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onQtyChange(line.menuItemId, line.qty + 1)}
                      aria-label={`Increase ${line.name}`}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-700 active:bg-neutral-100"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="w-16 text-right text-sm font-semibold tabular-nums text-neutral-900">
                    {formatTaka(line.unitPrice * line.qty)}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemove(line.menuItemId)}
                    aria-label={`Remove ${line.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 active:bg-red-50 active:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-neutral-200 px-4 py-3 pb-safe-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-neutral-500">Total</span>
            <span className="text-lg font-semibold tabular-nums text-neutral-900">
              {formatTaka(order.total)}
            </span>
          </div>
          <button
            type="button"
            onClick={onReview}
            disabled={order.items.length === 0}
            className="h-12 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white transition active:bg-emerald-800 disabled:bg-neutral-300"
          >
            Review bill
          </button>
        </div>
      </div>
    </Sheet>
  );
}
