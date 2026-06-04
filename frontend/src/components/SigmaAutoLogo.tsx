/**
 * SigmaAuto Logo Component
 *
 * Ícone: Σ estilizado com seta curva na extremidade inferior direita
 * Paleta: âmbar/laranja (#f59e0b → #ff7b2f) sobre fundo grafite
 *
 * Variantes:
 *   "icon"     → só o ícone Σ (favicon, avatar)
 *   "full"     → ícone + wordmark "Sigma Auto"
 *   "compact"  → ícone + wordmark em linha compacta (sidebar)
 */

type LogoVariant = 'icon' | 'full' | 'compact';

interface SigmaAutoLogoProps {
  variant?: LogoVariant;
  size?: number;       // tamanho do ícone em px
  className?: string;
  tone?: 'light' | 'dark';
}

export function SigmaAutoLogo({ variant = 'compact', size = 36, className = '', tone = 'light' }: SigmaAutoLogoProps) {
  const primaryText = tone === 'dark' ? '#0f1f2b' : '#ffffff';
  const secondaryText = tone === 'dark' ? '#4f6470' : '#64748b';

  const Icon = (
    <img
      src="/logo.png"
      alt="SigmaAuto"
      width={size}
      height={size}
      style={{ objectFit: 'contain' }}
    />
  );

  if (variant === 'icon') {
    return <span className={className}>{Icon}</span>;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {Icon}
        <div className="leading-none">
          <span className="block font-black text-[15px] tracking-tight" style={{ color: primaryText }}>
            Sigma<span style={{ color: '#f59e0b' }}>Auto</span>
          </span>
        </div>
      </div>
    );
  }

  // full
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {Icon}
      <div className="leading-none">
        <span className="block font-black text-xl tracking-tight" style={{ color: primaryText }}>
          Sigma<span style={{ color: '#f59e0b' }}>Auto</span>
        </span>
        <span className="block text-[10px] font-medium tracking-widest uppercase mt-0.5" style={{ color: secondaryText }}>
          Gestão de Oficina
        </span>
      </div>
    </div>
  );
}

/**
 * Favicon / ícone standalone (SVG puro — use para exportar como .svg)
 */
export function SigmaAutoIcon({ size = 40 }: { size?: number }) {
  return <SigmaAutoLogo variant="icon" size={size} />;
}
