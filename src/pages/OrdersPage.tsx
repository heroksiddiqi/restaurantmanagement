import { useLiveQuery } from 'dexie-react-hooks';
import { format } from 'date-fns';
import {
  Dialog,
  DialogButton,
  Navbar,
  Page,
} from 'konsta/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CancelOrderDialog } from '../components/CancelOrderDialog';
import { db } from '../db/db';
import { collectDue } from '../db/orders';
import type { Order, OrderStatus } from '../db/types';
import { formatTaka } from '../lib/money';

type Tab = Extract<OrderStatus, 'unpaid' | 'due' | 'paid'>;

const TABS: { key: Tab; label: string }[] = [
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'due', label: 'Due' },
  { key: 'paid', label: 'Paid' },
];

const STATUS_STYLES: Record<Tab, string> = {
  unpaid: 'bg-neutral-100 text-neutral-600',
  due: 'bg-amber-100 text-amber-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

export function OrdersPage() {
  const navigate = useNavigate();
  const orders = useLiveQuery(
    () => db.orders.orderBy('createdAt').reverse().toArray(),
    [],
  );

  const [tab, setTab] = useState<Tab>('unpaid');
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [collectTarget, setCollectTarget] = useState<Order | null>(null);

  const counts: Record<Tab, number> = { unpaid: 0, due: 0, paid: 0 };
  for (const order of orders ?? []) {
    if (order.status === 'unpaid' || order.status === 'due' || order.status === 'paid') {
      counts[order.status] += 1;
    }
  }

  const visible = (orders ?? []).filter((order) => order.status === tab);

  async function handleCollect() {
    if (collectTarget?.id == null) return;
    const paid = await collectDue(collectTarget.id);
    setCollectTarget(null);
    if (paid?.id != null) navigate(`/receipt/${paid.id}`);
  }

  return (
    <Page className="pb-safe-24">
      <Navbar
        title="Orders"
        subtitle={`${counts.unpaid} open · ${counts.due} due`}
      />

      <div className="mx-4 mt-2 grid grid-cols-3 gap-1 rounded-xl bg-neutral-100 p-1">
        {TABS.map((entry) => {
          const selected = tab === entry.key;
          return (
            <button
              key={entry.key}
              type="button"
              onClick={() => setTab(entry.key)}
              className={`rounded-lg py-2 text-xs font-semibold transition ${
                selected
                  ? 'bg-white text-neutral-900 shadow-sm'
                  : 'text-neutral-500'
              }`}
            >
              {entry.label} · {counts[entry.key]}
            </button>
          );
        })}
      </div>

      {!orders ? (
        <p className="px-4 py-8 text-center text-sm text-neutral-500">
          Loading orders…
        </p>
      ) : visible.length === 0 ? (
        <div className="px-8 py-14 text-center">
          <p className="text-sm font-medium text-neutral-700">
            {tab === 'unpaid'
              ? 'No open orders'
              : tab === 'due'
                ? 'No dues right now'
                : 'No paid orders yet'}
          </p>
          <p className="mt-1 text-xs text-neutral-500">
            {tab === 'unpaid'
              ? 'Start an order from the Tables screen.'
              : tab === 'due'
                ? 'Orders marked as due will wait here until collected.'
                : 'Completed bills will be listed here.'}
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-3 px-4">
          {visible.map((order) => {
            const items = order.items.reduce((sum, line) => sum + line.qty, 0);
            const preview = order.items
              .slice(0, 2)
              .map((line) => `${line.name} ×${line.qty}`)
              .join(', ');
            const more = order.items.length > 2 ? ` +${order.items.length - 2} more` : '';
            const place = order.type === 'parcel' ? 'Parcel' : order.tableName;

            return (
              <article
                key={order.id}
                className="rounded-2xl border border-neutral-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900">
                      {place ?? 'Dine-in'}
                      <span className="ml-2 text-[11px] font-normal text-neutral-400">
                        {order.orderNo}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {format(new Date(order.createdAt), 'dd MMM, hh:mm a')} ·{' '}
                      {items} {items === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      STATUS_STYLES[tab]
                    }`}
                  >
                    {tab}
                  </span>
                </div>

                {order.items.length > 0 && (
                  <p className="mt-2 line-clamp-2 text-xs text-neutral-500">
                    {preview}
                    {more}
                  </p>
                )}

                {order.status === 'due' && (order.dueCustomer || order.customerPhone) && (
                  <p className="mt-1 text-xs text-amber-700">
                    {[order.dueCustomer, order.customerPhone]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}

                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className="text-base font-semibold tabular-nums text-neutral-900">
                    {formatTaka(order.total)}
                  </span>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {order.status === 'unpaid' && (
                      <>
                        <button
                          type="button"
                          onClick={() => navigate(`/order/${order.id}`)}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white active:bg-emerald-800"
                        >
                          Open order
                        </button>
                        <button
                          type="button"
                          onClick={() => setCancelTarget(order)}
                          className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 active:bg-red-50"
                        >
                          Cancel
                        </button>
                      </>
                    )}

                    {order.status === 'due' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setCollectTarget(order)}
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white active:bg-emerald-800"
                        >
                          Collect cash
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/receipt/${order.id}`)}
                          className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-700 active:bg-neutral-100"
                        >
                          Receipt
                        </button>
                      </>
                    )}

                    {order.status === 'paid' && (
                      <button
                        type="button"
                        onClick={() => navigate(`/receipt/${order.id}`)}
                        className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 active:bg-neutral-100"
                      >
                        Receipt
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <CancelOrderDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />

      <Dialog
        opened={collectTarget != null}
        onBackdropClick={() => setCollectTarget(null)}
        title="Collect due payment?"
        content={
          collectTarget
            ? `${formatTaka(collectTarget.total)} from ${collectTarget.dueCustomer || 'the customer'} will be recorded as cash.`
            : ''
        }
        buttons={
          <>
            <DialogButton onClick={() => setCollectTarget(null)}>
              Not yet
            </DialogButton>
            <DialogButton strong onClick={() => void handleCollect()}>
              Collect cash
            </DialogButton>
          </>
        }
      />
    </Page>
  );
}
