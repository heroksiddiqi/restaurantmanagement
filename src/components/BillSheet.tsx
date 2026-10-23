import { useState, type InputHTMLAttributes } from 'react';
import { Segmented, SegmentedButton, Sheet } from 'konsta/react';
import { X } from 'lucide-react';
import { markOrderDue, markOrderPaid } from '../db/orders';
import type { Order, Settings } from '../db/types';
import { calculateBill, calculateChange } from '../lib/bill';
import { formatTaka } from '../lib/money';

interface BillSheetProps {
  opened: boolean;
  order: Order;
  settings?: Settings;
  onClose: () => void;
  onDone: (status: 'paid' | 'due') => void;
}

function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </span>
      <input
        {...props}
        className="h-11 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white"
      />
    </label>
  );
}

function TotalRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={
          strong ? 'text-sm font-semibold text-neutral-900' : 'text-sm text-neutral-500'
        }
      >
        {label}
      </span>
      <span
        className={
          strong
            ? 'text-lg font-semibold tabular-nums text-neutral-900'
            : 'text-sm tabular-nums text-neutral-700'
        }
      >
        {value}
      </span>
    </div>
  );
}

export function BillSheet({
  opened,
  order,
  settings,
  onClose,
  onDone,
}: BillSheetProps) {
  const [method, setMethod] = useState<'cash' | 'due'>('cash');
  const [discount, setDiscount] = useState(() =>
    order.discount > 0 ? String(order.discount) : '',
  );
  const [received, setReceived] = useState(() => String(order.total));
  const [customerName, setCustomerName] = useState(order.dueCustomer ?? '');
  const [phone, setPhone] = useState(order.customerPhone ?? '');
  const [note, setNote] = useState(order.note ?? '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const discountValue = Math.max(0, Number(discount) || 0);
  const receivedValue = Math.max(0, Number(received) || 0);

  const percentages = {
    vatPct: settings?.vatPct ?? order.vatPct,
    servicePct: settings?.servicePct ?? order.servicePct,
    roundToTaka: settings?.roundToTaka ?? true,
  };

  const preview = calculateBill(
    order.items.map((line) => ({
      price: line.unitPrice,
      cost: line.unitCost,
      qty: line.qty,
    })),
    discountValue,
    percentages,
  );

  const change = calculateChange(receivedValue, preview.total);
  const shortfall = method === 'cash' && receivedValue < preview.total;
  const suggestions = Array.from(
    new Set(
      [
        preview.total,
        Math.ceil(preview.total / 50) * 50,
        500,
        1000,
        2000,
      ].filter((amount) => amount >= preview.total && amount > 0),
    ),
  ).slice(0, 4);

  const canSubmit =
    !saving && preview.total >= 0 && order.items.length > 0 && !shortfall;

  async function handleSubmit() {
    if (order.id == null || !canSubmit) return;
    setSaving(true);
    setError('');

    try {
      if (method === 'cash') {
        const paid = await markOrderPaid(
          order.id,
          {
            discount: discountValue,
            note: note.trim(),
            cashReceived: receivedValue,
          },
          settings,
        );
        if (!paid) throw new Error('This order is no longer open.');
        onDone('paid');
      } else {
        const due = await markOrderDue(
          order.id,
          {
            discount: discountValue,
            note: note.trim(),
            customerName: customerName.trim(),
            phone: phone.trim(),
          },
          settings,
        );
        if (!due) throw new Error('This order is no longer open.');
        onDone('due');
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Could not complete payment.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      opened={opened}
      onBackdropClick={onClose}
      className="z-50 max-h-[92dvh]"
    >
      <div className="flex max-h-[92dvh] flex-col">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">
              Bill · {order.orderNo}
            </h2>
            <p className="text-xs text-neutral-500">
              {order.tableName ?? 'Parcel'} · {order.items.length} lines
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
          <div className="mb-3">
            <Segmented strong>
              <SegmentedButton
                active={method === 'cash'}
                onClick={() => setMethod('cash')}
              >
                Cash
              </SegmentedButton>
              <SegmentedButton
                active={method === 'due'}
                onClick={() => setMethod('due')}
              >
                Due
              </SegmentedButton>
            </Segmented>
          </div>

          <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-3">
            <TotalRow label="Subtotal" value={formatTaka(preview.subtotal)} />
            {preview.vat > 0 && (
              <TotalRow
                label={`VAT (${percentages.vatPct}%)`}
                value={formatTaka(preview.vat)}
              />
            )}
            {preview.service > 0 && (
              <TotalRow
                label={`Service (${percentages.servicePct}%)`}
                value={formatTaka(preview.service)}
              />
            )}
            <div className="border-t border-dashed border-neutral-200 pt-2">
              <TotalRow label="Total" value={formatTaka(preview.total)} strong />
            </div>
          </div>

          <div className="mt-3">
            <Field
              label="Discount (৳)"
              type="number"
              inputMode="decimal"
              min={0}
              max={preview.subtotal}
              step={1}
              placeholder="0"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
            {preview.discount > 0 && (
              <p className="mt-1 text-xs text-neutral-500">
                Discount applied: {formatTaka(preview.discount)}
              </p>
            )}
          </div>

          {method === 'cash' ? (
            <div className="mt-3">
              <Field
                label="Cash received (৳)"
                type="number"
                inputMode="decimal"
                min={0}
                step={1}
                placeholder="0"
                value={received}
                onChange={(event) => setReceived(event.target.value)}
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setReceived(String(amount))}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                      receivedValue === amount
                        ? 'border-emerald-700 bg-emerald-700 text-white'
                        : 'border-neutral-200 bg-white text-neutral-700'
                    }`}
                  >
                    {formatTaka(amount)}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-neutral-100 px-3 py-2">
                <span className="text-sm text-neutral-600">
                  {shortfall ? 'Short by' : 'Change'}
                </span>
                <span
                  className={`text-base font-semibold tabular-nums ${
                    shortfall ? 'text-red-600' : 'text-emerald-700'
                  }`}
                >
                  {formatTaka(
                    shortfall ? preview.total - receivedValue : change,
                  )}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Field
                label="Customer name"
                type="text"
                placeholder="Optional"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
              <Field
                label="Phone"
                type="tel"
                inputMode="tel"
                placeholder="Optional"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </div>
          )}

          <div className="mt-3">
            <Field
              label="Note"
              type="text"
              placeholder="Optional"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

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
              : method === 'cash'
                ? `Mark paid · ${formatTaka(preview.total)}`
                : `Mark as due · ${formatTaka(preview.total)}`}
          </button>
        </div>
      </div>
    </Sheet>
  );
}
