import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ChipVariant = 'ok' | 'warn' | 'err' | 'neutral' | 'gold';

const chipStyles: Record<ChipVariant, string> = {
  ok: 'bg-[#23321f] text-[#b6e2a6]',
  warn: 'bg-[#3a2e1e] text-[#f0c87a]',
  err: 'bg-[#3a1f1f] text-[#f0a6a6]',
  neutral: 'bg-surface-900 text-surface-300',
  gold: 'bg-accent/10 text-accent',
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
