import { formatTaka } from '../lib/money';

interface CartBarProps {
  count: number;
  total: number;
  onReview: () => void;
}

export function CartBar({ count, total, onReview }: CartBarProps) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4 pb-safe-3">
      <button
        type="button"
        onClick={onReview}
        className="pointer-events-auto flex w-full items-center justify-between rounded-2xl bg-emerald-700 px-4 py-3 text-white shadow-lg transition active:bg-emerald-800"
      >
        <span className="text-left">
          <span className="block text-[11px] font-medium uppercase tracking-widest text-emerald-100">
            {count} {count === 1 ? 'item' : 'items'}
          </span>
          <span className="block text-lg font-semibold leading-tight">
            {formatTaka(total)}
          </span>
        </span>
        <span className="rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold">
          Review
        </span>
      </button>
    </div>
  );
}
