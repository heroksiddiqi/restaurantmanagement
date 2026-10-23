import { format } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { LayoutGrid, Plus, Printer } from 'lucide-react';
import { Navbar, NavbarBackLink, Page } from 'konsta/react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../db/db';
import { createOrder, getOpenOrderForTable } from '../db/orders';
import { formatTaka } from '../lib/money';

const STATUS_LABEL: Record<string, string> = {
  unpaid: 'UNPAID',
  due: 'DUE',
  paid: 'PAID',
  void: 'VOID',
};

export function ReceiptPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const id = Number(orderId);

  const order = useLiveQuery(() => db.orders.get(id), [id]);
  const settings = useLiveQuery(() => db.settings.get('app'), []);

  async function startNewOrder() {
    if (!order) return;
    if (order.type === 'dine-in' && order.tableId != null) {
      const existing = await getOpenOrderForTable(order.tableId);
      if (existing?.id != null) {
        navigate(`/order/${existing.id}`);
        return;
      }
      const newId = await createOrder({
        tableId: order.tableId,
        tableName: order.tableName,
        type: 'dine-in',
      });
      navigate(`/order/${newId}`);
      return;
    }

    const newId = await createOrder({ type: 'parcel' });
    navigate(`/order/${newId}`);
  }

  if (!order) {
    return (
      <Page>
        <Navbar
          title="Receipt"
          left={
            <NavbarBackLink
              text="Back"
              showText
              onClick={() => navigate('/tables')}
            />
          }
        />
        <p className="px-4 py-10 text-center text-sm text-neutral-500">
          Order not found.
        </p>
      </Page>
    );
  }

  const printedAt = format(
    new Date(order.paidAt ?? order.createdAt),
    'dd MMM yyyy, hh:mm a',
  );
  const place =
    order.type === 'parcel' ? 'Parcel' : (order.tableName ?? 'Dine-in');
  const method =
    order.paymentMethod === 'due'
      ? 'Due'
      : order.paymentMethod === 'cash'
        ? 'Cash'
        : order.paymentMethod ?? '—';

  return (
    <Page className="pb-safe-6">
      <Navbar
        className="no-print"
        title="Receipt"
        left={
          <NavbarBackLink
            text="Back"
            showText
            onClick={() => navigate('/tables')}
          />
        }
      />

      <div className="receipt-print mx-4 mt-3 rounded-2xl border border-neutral-200 bg-white px-4 py-5 font-mono text-[11px] leading-relaxed text-black">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-wide">
            {settings?.restaurantName ?? 'Restaurant'}
          </p>
          {settings?.address && <p>{settings.address}</p>}
          {settings?.phone && <p>{settings.phone}</p>}
        </div>

        <div className="my-3 border-t border-dashed border-black" />

        <div className="flex justify-between">
          <span>Order</span>
          <span className="font-semibold">{order.orderNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{printedAt}</span>
        </div>
        <div className="flex justify-between">
          <span>Type</span>
          <span>{place}</span>
        </div>
        <div className="flex justify-between">
          <span>Status</span>
          <span className="font-semibold">
            {STATUS_LABEL[order.status] ?? order.status.toUpperCase()}
          </span>
        </div>
        {order.dueCustomer && (
          <div className="flex justify-between">
            <span>Customer</span>
            <span>{order.dueCustomer}</span>
          </div>
        )}
        {order.customerPhone && (
          <div className="flex justify-between">
            <span>Phone</span>
            <span>{order.customerPhone}</span>
          </div>
        )}

        <div className="my-2 border-t border-dashed border-black" />

        <ul className="space-y-1">
          {order.items.map((line) => (
            <li key={line.menuItemId}>
              <div className="flex justify-between gap-2">
                <span className="min-w-0 flex-1 break-words">{line.name}</span>
                <span className="shrink-0 tabular-nums">
                  {formatTaka(line.unitPrice * line.qty)}
                </span>
              </div>
              <div className="text-[10px] text-black/60">
                {line.code} · {line.qty} × {formatTaka(line.unitPrice)}
              </div>
            </li>
          ))}
        </ul>

        <div className="my-2 border-t border-dashed border-black" />

        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatTaka(order.subtotal)}</span>
        </div>
        {order.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span className="tabular-nums">-{formatTaka(order.discount)}</span>
          </div>
        )}
        {order.vat > 0 && (
          <div className="flex justify-between">
            <span>VAT ({order.vatPct}%)</span>
            <span className="tabular-nums">{formatTaka(order.vat)}</span>
          </div>
        )}
        {order.service > 0 && (
          <div className="flex justify-between">
            <span>Service ({order.servicePct}%)</span>
            <span className="tabular-nums">{formatTaka(order.service)}</span>
          </div>
        )}

        <div className="mt-1 border-t border-dashed border-black pt-1">
          <div className="flex justify-between text-[13px] font-bold">
            <span>Total</span>
            <span className="tabular-nums">{formatTaka(order.total)}</span>
          </div>
        </div>

        <div className="mt-2 flex justify-between">
          <span>Payment</span>
          <span>{method}</span>
        </div>
        {order.paymentMethod === 'cash' && order.cashReceived != null && (
          <>
            <div className="flex justify-between">
              <span>Cash received</span>
              <span className="tabular-nums">
                {formatTaka(order.cashReceived)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Change</span>
              <span className="tabular-nums">
                {formatTaka(order.change ?? 0)}
              </span>
            </div>
          </>
        )}
        {order.status === 'due' && (
          <div className="mt-1 flex justify-between text-[12px] font-bold">
            <span>Amount due</span>
            <span className="tabular-nums">{formatTaka(order.total)}</span>
          </div>
        )}

        {order.note && <p className="mt-2 break-words text-[10px]">Note: {order.note}</p>}

        <div className="my-3 border-t border-dashed border-black" />

        <p className="text-center text-[10px]">
          {settings?.receiptFooter ?? 'Thank you, please come again!'}
        </p>
      </div>

      <div className="no-print mx-4 mt-4 space-y-2 pb-safe-6">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 text-sm font-semibold text-white active:bg-emerald-800"
        >
          <Printer className="h-4 w-4" /> Print receipt
        </button>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => void startNewOrder()}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-sm font-medium text-neutral-800 active:bg-neutral-100"
          >
            <Plus className="h-4 w-4" /> New order
          </button>
          <button
            type="button"
            onClick={() => navigate('/tables')}
            className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-neutral-200 bg-white text-sm font-medium text-neutral-800 active:bg-neutral-100"
          >
            <LayoutGrid className="h-4 w-4" /> Tables
          </button>
        </div>
      </div>
    </Page>
  );
}
