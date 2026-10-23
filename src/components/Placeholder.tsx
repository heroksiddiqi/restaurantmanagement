import type { ComponentType } from 'react';

interface PlaceholderProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

export function Placeholder({ icon: Icon, title, description }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        <Icon className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="max-w-xs text-sm leading-relaxed text-neutral-500">
        {description}
      </p>
    </div>
  );
}
