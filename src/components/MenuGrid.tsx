import type { MenuItem } from '../db/types';
import { formatTaka } from '../lib/money';

interface MenuGridProps {
  items: MenuItem[];
  quantities: Map<number, number>;
  onAdd: (item: MenuItem) => void;
}

export function MenuGrid({ items, quantities, onAdd }: MenuGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5 px-4">
      {items.map((item) => {
        const qty = item.id != null ? quantities.get(item.id) ?? 0 : 0;

        return (
          <button
            key={item.id ?? item.code}
            type="button"
            onClick={() => onAdd(item)}
            className={`relative flex min-h-[92px] flex-col justify-between rounded-2xl border p-3 text-left shadow-sm transition active:scale-[0.98] ${
              qty > 0
                ? 'border-emerald-400 bg-emerald-50'
                : 'border-neutral-200 bg-white'
            }`}
          >
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {item.code}
              </p>
              <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-neutral-900">
                {item.name}
              </p>
            </div>
            <p className="mt-2 text-sm font-semibold text-emerald-700">
              {formatTaka(item.price)}
            </p>
            {qty > 0 && (
              <span className="absolute right-2 top-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-emerald-700 px-1.5 text-xs font-semibold text-white">
                {qty}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
