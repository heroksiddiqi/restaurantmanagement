import type { ReactNode } from 'react';
import { formatTaka } from '../lib/money';

interface FloatingBarProps {
  label: string;
  amount: number;
  tone: 'emerald' | 'red';
  right?: ReactNode;
}

export function FloatingBar({ label, amount, tone, right }: FloatingBarProps) {
  return (
    <div className="pointer-events-none fixed bottom-[calc(80px+env(safe-area-inset-bottom))] left-1/2 z-30 w-full max-w-md -translate-x-1/2 px-4">
      <div
        className={`pointer-events-auto flex items-center justify-between gap-3 rounded-2xl px-4 py-2.5 text-white shadow-lg ${
          tone === 'emerald' ? 'bg-emerald-700' : 'bg-red-600'
        }`}
      >
        <div>
          <p className="text-[10px] font-medium uppercase tracking-widest text-white/80">
            {label}
          </p>
          <p className="text-xl font-semibold leading-tight tabular-nums">
            {formatTaka(amount)}
          </p>
        </div>
        {right}
      </div>
    </div>
  );
}
