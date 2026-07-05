import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

type Size = 'sm' | 'md' | 'lg';

const sizeMap: Record<Size, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
};

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: Size;
  className?: string;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative w-full rounded-lg border border-line bg-surface-950 text-surface-100 shadow-card-hover',
          sizeMap[size],
          className,
        )}
      >
        {title != null && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="text-base font-semibold tracking-[0.02em] text-surface-50">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-surface-400 transition-colors hover:bg-ink/5 hover:text-surface-100"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
