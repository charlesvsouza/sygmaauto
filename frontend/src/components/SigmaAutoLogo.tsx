/**
 * SigmaAuto Logo Component
 *
 * Variantes:
 *   "icon"     → só o ícone (favicon, avatar)
 *   "full"     → ícone + wordmark "SigmaAuto" + subtítulo
 *   "compact"  → ícone + wordmark em linha (sidebar)
 *
 * tone:
 *   "light" → wordmark branco (para fundos escuros: sidebar)
 *   "dark"  → wordmark grafite (para fundos claros)
 *   "brand" → ícone em tile azul-profundo com degradê + wordmark azul degradê
 *             (para o card de login claro, onde o logo branco sumiria)
 */

type LogoVariant = 'icon' | 'full' | 'compact';
type LogoTone = 'light' | 'dark' | 'brand';
// accent do wordmark "Auto": 'gold' = assinatura da MARCA (marketing/landing),
// 'teal' = cor do PRODUTO (app). Mantém a identidade gold+teal deliberada.
type LogoAccent = 'gold' | 'teal';

interface SigmaAutoLogoProps {
  variant?: LogoVariant;
  size?: number; // tamanho do ícone em px
  className?: string;
  tone?: LogoTone;
  accent?: LogoAccent;
}

const BRAND_GRADIENT = 'linear-gradient(135deg, #0f2557 0%, #1e3a8a 45%, #3b82f6 100%)';

export function SigmaAutoLogo({ variant = 'compact', size = 36, className = '', tone = 'light', accent = 'gold' }: SigmaAutoLogoProps) {
  const primaryText = tone === 'dark' ? '#0f1f2b' : '#ffffff';
  const secondaryText = tone === 'dark' ? '#4f6470' : tone === 'brand' ? '#5a6b8a' : '#64748b';

  const wordStyle =
    tone === 'brand'
      ? {
          background: BRAND_GRADIENT,
          WebkitBackgroundClip: 'text' as const,
          backgroundClip: 'text' as const,
          color: 'transparent',
        }
      : { color: primaryText };

  // teal: escuro (#0a6458) sobre fundo claro, brilhante (#34d3bf) sobre fundo escuro
  const tealAccent = tone === 'dark' ? '#0a6458' : '#34d3bf';
  const accentColor = accent === 'teal' ? tealAccent : '#f59e0b';
  const accentStyle = tone === 'brand' ? wordStyle : { color: accentColor };

  const Icon =
    tone === 'brand' ? (
      <span
        style={{
          display: 'inline-flex',
          padding: Math.round(size * 0.18),
          borderRadius: Math.round(size * 0.28),
          background: BRAND_GRADIENT,
          boxShadow: '0 4px 12px -4px rgba(30, 58, 138, 0.5)',
        }}
      >
        <img
          src="/logo.png"
          alt="SigmaAuto"
          width={Math.round(size * 0.72)}
          height={Math.round(size * 0.72)}
          style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
        />
      </span>
    ) : (
      <img src="/logo.png" alt="SigmaAuto" width={size} height={size} style={{ objectFit: 'contain' }} />
    );

  if (variant === 'icon') {
    return <span className={className}>{Icon}</span>;
  }

  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-2.5 ${className}`}>
        {Icon}
        <div className="leading-none">
          <span className="block font-black text-[15px] tracking-tight" style={wordStyle}>
            Sigma<span style={accentStyle}>Auto</span>
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
        <span className="block font-black text-xl tracking-tight" style={wordStyle}>
          Sigma<span style={accentStyle}>Auto</span>
        </span>
        <span className="block text-[10px] font-medium tracking-widest uppercase mt-0.5" style={{ color: secondaryText }}>
          Gestão de Oficina
        </span>
      </div>
    </div>
  );
}

export function SigmaAutoIcon({ size = 40 }: { size?: number }) {
  return <SigmaAutoLogo variant="icon" size={size} />;
}
