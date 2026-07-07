import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-white hover:bg-accent-hover border border-transparent font-semibold',
  secondary:
    'bg-transparent text-accent-ink border border-accent/40 hover:border-accent/40 hover:text-accent-ink',
  ghost:
    'bg-transparent text-surface-200 hover:bg-ink/5 border border-transparent',
  danger:
    'bg-danger text-white hover:bg-danger/90 border border-transparent font-semibold',
};

const sizes: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-md min-h-[36px]',
  md: 'text-sm px-4 py-2.5 rounded-md min-h-[44px]',
  lg: 'text-sm px-5 py-3 rounded-lg min-h-[48px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';
