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
}

export function SigmaAutoLogo({ variant = 'compact', size = 36, className = '' }: SigmaAutoLogoProps) {
  const Icon = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sa-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ff7b2f" />
        </linearGradient>
        {/* Brilho sutil no topo */}
        <linearGradient id="sa-bg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b10" />
          <stop offset="100%" stopColor="#0f0f12" />
        </linearGradient>
      </defs>

      {/* Background rounded square */}
      <rect width="40" height="40" rx="10" fill="url(#sa-bg)" />
      <rect width="40" height="40" rx="10" fill="url(#sa-grad)" fillOpacity="0.12" />

      {/*
        Sigma (Σ) estilizado:
        - Barra superior horizontal
        - Diagonal superior descendo para o centro
        - Diagonal inferior descendo do centro (mais curta)
        - Barra inferior com seta →
      */}
      {/* Barra superior */}
      <line x1="10" y1="9" x2="30" y2="9" stroke="url(#sa-grad)" strokeWidth="2.8" strokeLinecap="round" />

      {/* Diagonal sup: topo-direito → centro */}
      <line x1="29" y1="9.5" x2="13" y2="20.5" stroke="url(#sa-grad)" strokeWidth="2.8" strokeLinecap="round" />

      {/* Diagonal inf: centro → baixo-direito */}
      <line x1="13" y1="19.5" x2="27" y2="30" stroke="url(#sa-grad)" strokeWidth="2.8" strokeLinecap="round" />

      {/* Barra inferior com corpo de seta */}
      <line x1="10" y1="31" x2="27.5" y2="31" stroke="url(#sa-grad)" strokeWidth="2.8" strokeLinecap="round" />

      {/* Ponta da seta → */}
      <polyline
        points="24,26.5 30,31 24,35.5"
        stroke="url(#sa-grad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );

  if (variant === 'icon') {
    return <span className={className}>{Icon}</span>;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {Icon}
        <div className="leading-none">
          <span className="block font-black text-white text-[15px] tracking-tight">
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
        <span className="block font-black text-white text-xl tracking-tight">
          Sigma<span style={{ color: '#f59e0b' }}>Auto</span>
        </span>
        <span className="block text-[10px] text-slate-500 font-medium tracking-widest uppercase mt-0.5">
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
