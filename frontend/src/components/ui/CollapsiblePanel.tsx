import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CollapsiblePanelProps {
  title: ReactNode;
  count?: number;
  defaultOpen?: boolean;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Painel colapsável no padrão Oficina Integrada: cabeçalho com título + contagem
 *  + ações, corpo recolhível. Reduz rolagem em listas longas. */
export function CollapsiblePanel({
  title,
  count,
  defaultOpen = true,
  actions,
  children,
  className,
}: CollapsiblePanelProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-lg border border-line bg-panel shadow-sm overflow-hidden', className)}>
      <div className={cn('flex items-center gap-3 px-4 py-3', open && 'border-b border-line')}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 flex-1 text-left"
          aria-expanded={open}
        >
          <ChevronDown
            size={16}
            className={cn('text-muted transition-transform duration-200', !open && '-rotate-90')}
          />
          <span className="text-sm font-semibold text-ink">{title}</span>
          {count != null && (
            <span className="text-xs font-medium text-muted bg-panel-2 rounded-full px-2 py-0.5">
              {count}
            </span>
          )}
        </button>
        {actions}
      </div>
      {open && <div>{children}</div>}
    </div>
  );
}
