import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ChipVariant = 'ok' | 'warn' | 'err' | 'neutral' | 'gold';

const chipStyles: Record<ChipVariant, string> = {
  ok: 'bg-emerald-100 text-emerald-800',
  warn: 'bg-amber-100 text-amber-800',
  err: 'bg-red-100 text-red-800',
  neutral: 'bg-panel-2 text-muted',
  gold: 'bg-accent/10 text-accent-ink',
};

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: ChipVariant;
}

export function Chip({ variant = 'neutral', className, ...props }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none',
        chipStyles[variant],
        className,
      )}
      {...props}
    />
  );
}
