import { useState } from 'react';
import { Dialog, DialogButton } from 'konsta/react';
import { voidOrder } from '../db/orders';
import type { Order } from '../db/types';

interface CancelOrderDialogProps {
  order: Order | null;
  onClose: () => void;
  onDone?: () => void;
}

export function CancelOrderDialog({
  order,
  onClose,
  onDone,
}: CancelOrderDialogProps) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  function handleClose() {
    setReason('');
    onClose();
  }

  async function handleConfirm() {
    if (order?.id == null) return;
    setSaving(true);
    try {
      await voidOrder(order.id, reason.trim());
      setReason('');
      onClose();
      onDone?.();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      opened={order != null}
      onBackdropClick={handleClose}
      title="Cancel this order?"
      content={
        <div className="space-y-3">
          <p>
            {order
              ? `${order.orderNo} will be voided. Past bills stay in the order list.`
              : ''}
          </p>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Reason (optional)"
            className="h-10 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600 focus:bg-white"
          />
        </div>
      }
      buttons={
        <>
          <DialogButton onClick={handleClose}>Keep order</DialogButton>
          <DialogButton
            strong
            onClick={() => void handleConfirm()}
            disabled={saving}
          >
            Cancel order
          </DialogButton>
        </>
      }
    />
  );
}
