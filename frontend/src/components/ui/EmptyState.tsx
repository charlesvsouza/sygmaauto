import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-line bg-surface-950/50 px-6 py-12 text-center',
        className,
      )}
    >
      {icon && <div className="text-surface-500">{icon}</div>}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-surface-100">{title}</p>
        {description && <p className="text-xs text-surface-400">{description}</p>}
      </div>
      {action}
    </div>
  );
}
