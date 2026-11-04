import { Sheet } from 'konsta/react';

interface DatePickSheetProps {
  opened: boolean;
  value: string;
  max?: string;
  title?: string;
  onChange: (key: string) => void;
  onClose: () => void;
}

export function DatePickSheet({
  opened,
  value,
  max,
  title = 'Pick date',
  onChange,
  onClose,
}: DatePickSheetProps) {
  return (
    <Sheet
      opened={opened}
      onBackdropClick={onClose}
      className="z-50 pb-safe-3"
    >
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <p className="text-base font-semibold text-neutral-900">{title}</p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close date picker"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 active:bg-neutral-100"
        >
          ✕
        </button>
      </div>

      <div className="p-4">
        <input
          type="date"
          value={value}
          max={max}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 outline-none transition focus:border-emerald-600 focus:bg-white"
        />
        {max && (
          <p className="mt-1.5 px-1 text-[11px] text-neutral-500">
            Future dates cannot be selected.
          </p>
        )}
      </div>

      <div className="border-t border-neutral-200 p-3">
        <button
          type="button"
          onClick={onClose}
          className="h-11 w-full rounded-xl bg-emerald-700 text-sm font-semibold text-white active:bg-emerald-800"
        >
          Done
        </button>
      </div>
    </Sheet>
  );
}
