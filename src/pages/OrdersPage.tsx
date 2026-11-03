import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import { Navbar, Page } from 'konsta/react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import type { Order } from '../db/types';
import { formatTaka } from '../lib/money';

function placeLabel(order: Order): string {
  if (order.type === 'counter') return 'Counter';
  if (order.type === 'parcel') return 'Parcel';
  return order.tableName ?? 'Dine-in';
}

export function OrdersPage() {
  const navigate = useNavigate();
  const orders = useLiveQuery(
    () => db.orders.orderBy('createdAt').reverse().toArray(),
    [],
  );

  const paid = (orders ?? []).filter((order) => order.status === 'paid');
  const total = paid.reduce((sum, order) => sum + order.total, 0);

  return (
    <Page className="pb-safe-24">
      <Navbar
        title="History"
        subtitle={
          paid.length > 0
            ? `${paid.length} bills · ${formatTaka(total)}`
            : 'Paid bills'
        }
      />

      {!orders ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading orders…
        </p>
      ) : paid.length === 0 ? (
        <div className="px-8 py-14 text-center">
          <p className="text-sm font-medium text-neutral-700">
            No paid bills yet
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            Completed bills will be listed here.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3 px-4">
          {paid.map((order) => {
            const items = order.items.reduce((sum, line) => sum + line.qty, 0);
            const preview = order.items
              .slice(0, 2)
              .map((line) => `${line.name} ×${line.qty}`)
              .join(', ');
            const more =
              order.items.length > 2 ? ` +${order.items.length - 2} more` : '';

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {placeLabel(order)}
                      <span className="ml-2 text-[11px] font-normal text-neutral-400">
                        {order.orderNo}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {format(new Date(order.paidAt ?? order.createdAt), 'dd MMM, hh:mm a')}
                      {items > 0 && ` · ${items} ${items === 1 ? 'item' : 'items'}`}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Paid
                  </span>
                </div>

                {order.items.length > 0 && (
                  <p className="mt-2 line-clamp-2 text-xs text-neutral-500">
                    {preview}
                    {more}
                  </p>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-base font-semibold tabular-nums text-neutral-900">
                    {formatTaka(order.total)}
                  </span>

                  <button
                    type="button"
                    onClick={() => navigate(`/receipt/${order.id}`)}
                    className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 active:bg-neutral-100"
                  >
                    Receipt
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </Page>
  );
}
