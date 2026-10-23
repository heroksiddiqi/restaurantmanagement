interface QuickKeypadProps {
  value: string;
  error: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function QuickKeypad({
  value,
  error,
  onChange,
  onSubmit,
}: QuickKeypadProps) {
  return (
    <div className="mt-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-2.5">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') onSubmit();
          }}
          placeholder="Quick add: 201 201*2"
          inputMode="text"
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-900 outline-none focus:border-emerald-600"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={value.trim().length === 0}
          className="h-10 shrink-0 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition active:bg-emerald-800 disabled:bg-neutral-300"
        >
          Add
        </button>
      </div>

      <p className="mt-1.5 px-1 text-[11px] text-neutral-500">
        {error ? (
          <span className="font-medium text-red-600">{error}</span>
        ) : (
          'Separate codes with a space, use * for quantity: 201*2'
        )}
      </p>
    </div>
  );
}
