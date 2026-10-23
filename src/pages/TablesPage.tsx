import { useLiveQuery } from 'dexie-react-hooks';
import {
  Actions,
  ActionsButton,
  ActionsGroup,
  ActionsLabel,
  Button,
  Navbar,
  Page,
} from 'konsta/react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CancelOrderDialog } from '../components/CancelOrderDialog';
import { db } from '../db/db';
import { cleanupEmptyOrders, createOrder, getOpenOrderForTable } from '../db/orders';
import type { Order, RestaurantTable } from '../db/types';
import { formatTaka } from '../lib/money';

export function TablesPage() {
  const navigate = useNavigate();
  const tables = useLiveQuery(
    async () =>
      (await db.diningTables.toArray()).sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      ),
    [],
  );
  const openOrders = useLiveQuery(
    () => db.orders.where('status').equals('unpaid').toArray(),
    [],
  );
  const menuCount = useLiveQuery(() => db.menuItems.count(), []);
  const settings = useLiveQuery(() => db.settings.get('app'), []);

  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(
    null,
  );
  const [cancelTarget, setCancelTarget] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void cleanupEmptyOrders();
  }, []);

  const openByTable = new Map<number, Order>();
  let unpaidTotal = 0;

  for (const order of openOrders ?? []) {
    if (order.items.length === 0) continue;
    unpaidTotal += order.total;
    if (order.tableId != null) openByTable.set(order.tableId, order);
  }

  const tableCount = tables?.length ?? 0;
  const freeCount = Math.max(tableCount - openByTable.size, 0);
  const selectedOrder =
    selectedTable?.id != null ? openByTable.get(selectedTable.id) : undefined;

  async function startOrder(table: RestaurantTable) {
    if (table.id == null || starting) return;
    setStarting(true);
    setError('');
    try {
      const existing = await getOpenOrderForTable(table.id);
      if (existing?.id != null) {
        setSelectedTable(null);
        navigate(`/order/${existing.id}`);
        return;
      }
      const orderId = await createOrder({
        tableId: table.id,
        tableName: table.name,
        type: 'dine-in',
      });
      setSelectedTable(null);
      navigate(`/order/${orderId}`);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : 'Could not start order.',
      );
    } finally {
      setStarting(false);
    }
  }

  async function startParcel() {
    if (starting) return;
    setStarting(true);
    setError('');
    try {
      const orderId = await createOrder({ type: 'parcel' });
      navigate(`/order/${orderId}`);
    } catch (startError) {
      setError(
        startError instanceof Error ? startError.message : 'Could not start order.',
      );
    } finally {
      setStarting(false);
    }
  }

  async function openExisting(order: Order) {
    if (order.id == null) return;
    setSelectedTable(null);
    navigate(`/order/${order.id}`);
  }

  return (
    <Page className="pb-safe-24">
      <Navbar
        title="Tables"
        subtitle={settings?.restaurantName ?? 'Restaurant POS'}
        right={
          <Button small onClick={() => void startParcel()} disabled={starting}>
            Parcel
          </Button>
        }
      />

      <div className="mx-4 mb-5 mt-2 rounded-2xl bg-gradient-to-br from-emerald-700 to-emerald-600 p-4 text-white shadow-sm">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-emerald-100">
              Unpaid total
            </p>
            <p className="mt-1 text-2xl font-semibold leading-none">
              {formatTaka(unpaidTotal)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold leading-none">
              {freeCount}/{tableCount}
            </p>
            <p className="mt-1 text-[11px] font-medium uppercase tracking-widest text-emerald-100">
              tables free
            </p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between px-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Dining tables
        </h2>
        <span className="text-xs text-neutral-400">{menuCount ?? 0} menu items</span>
      </div>

      {error && (
        <p className="mx-4 mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      {!tables ? (
        <p className="px-4 text-sm text-neutral-500">Loading tables…</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {tables.map((table) => {
            const order = table.id != null ? openByTable.get(table.id) : undefined;
            const occupied = Boolean(order);

            return (
              <button
                key={table.id}
                type="button"
                onClick={() => setSelectedTable(table)}
                aria-label={`Table ${table.name}${occupied ? ', unpaid' : ', free'}`}
                className={`rounded-2xl border p-4 text-left shadow-sm transition active:scale-[0.98] ${
                  occupied
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-neutral-200 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-neutral-900">
                    {table.name}
                  </span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      occupied ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {table.seats} seats
                </p>
                <p
                  className={`mt-3 text-sm font-semibold ${
                    occupied ? 'text-amber-700' : 'text-emerald-700'
                  }`}
                >
                  {order ? formatTaka(order.total) : 'Free'}
                </p>
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-5 px-4 text-center text-xs text-neutral-400">
        Tap a table to open its order, or start a parcel.
      </p>

      <Actions
        opened={selectedTable != null}
        onBackdropClick={() => setSelectedTable(null)}
        className="z-50"
      >
        <ActionsGroup>
          <ActionsLabel>
            {selectedTable
              ? `${selectedTable.name} · ${selectedTable.seats} seats`
              : ''}
          </ActionsLabel>
          {selectedOrder ? (
            <>
              <ActionsButton
                bold
                onClick={() => void openExisting(selectedOrder)}
              >
                Open order · {formatTaka(selectedOrder.total)}
              </ActionsButton>
              <ActionsButton
                className="text-red-600"
                onClick={() => {
                  setCancelTarget(selectedOrder);
                  setSelectedTable(null);
                }}
              >
                Cancel order
              </ActionsButton>
            </>
          ) : (
            <ActionsButton
              bold
              onClick={() => {
                if (selectedTable) void startOrder(selectedTable);
              }}
            >
              Start new order
            </ActionsButton>
          )}
        </ActionsGroup>
        <ActionsGroup>
          <ActionsButton onClick={() => setSelectedTable(null)}>
            Close
          </ActionsButton>
        </ActionsGroup>
      </Actions>

      <CancelOrderDialog
        order={cancelTarget}
        onClose={() => setCancelTarget(null)}
      />
    </Page>
  );
}
