import { type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

export type StatusTone = 'neutral' | 'golden' | 'positive' | 'negative';

/** Fonte única dos chips de status: neutro, em andamento, positivo e negativo. */
export const STATUS_CHIP_CLASS: Record<StatusTone, string> = {
  neutral: 'bg-surface-900 text-surface-300 border border-surface-800',
  golden: 'bg-accent text-white border border-transparent',
  positive: 'bg-accent/10 text-accent-ink border border-accent/40',
  negative: 'bg-red-50 text-red-700 border border-red-200',
};

export interface StatusChipProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
}

/** O texto do chip sempre diz o status; a cor é só reforço. Piso de 12px. */
export function StatusChip({ tone = 'neutral', className, ...props }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold leading-tight',
        STATUS_CHIP_CLASS[tone],
        className,
      )}
      {...props}
    />
  );
}
