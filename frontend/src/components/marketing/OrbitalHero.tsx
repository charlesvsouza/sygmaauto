import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * Hero orbital: 1 esfera central + 3 anéis elípticos (sistema solar).
 * Porta fiel da implementação real do sigmadiagnostics
 * (C:\sygmahelthTech-ai\frontend\src\app\page.tsx), recolorido em
 * âmbar/dourado + teal para o sygmaauto — a paleta já era quase idêntica.
 */
export function OrbitalHero() {
  const logoControls = useAnimation();

  useEffect(() => {
    async function runLogoSequence() {
      await logoControls.start({
        rotateY: 0,
        scale: 1,
        opacity: 1,
        transition: { duration: 1.25, ease: [0.23, 1, 0.32, 1] },
      });
      logoControls.start({
        rotateY: 360,
        transition: { duration: 10, repeat: Infinity, ease: 'linear' },
      });
    }
    runLogoSequence();
  }, [logoControls]);

  return (
    <div className="relative hidden lg:flex items-center justify-center min-h-[460px]">
      <div className="absolute" style={{ left: '46%', top: '46%', transform: 'translate(-50%, -50%)' }}>
        {/* Glow solar */}
        <motion.div
          className="pointer-events-none absolute rounded-full blur-3xl"
          style={{
            left: 0,
            top: 0,
            width: '260px',
            height: '260px',
            transform: 'translate(-50%, -50%)',
            zIndex: -1,
            background:
              'radial-gradient(circle, rgba(251,191,36,0.30) 0%, rgba(245,158,11,0.16) 42%, rgba(11,127,134,0.10) 70%, transparent 100%)',
          }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.45, 0.7, 0.45] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Órbita 1 — interna, horizontal */}
        <div
          className="pointer-events-none absolute"
          style={{ left: 0, top: 0, width: '238px', height: '238px', transform: 'translate(-50%, -50%) rotateX(70deg)' }}
        >
          <div className="h-full w-full rounded-full" style={{ border: '1.5px solid rgba(251,191,36,0.55)' }} />
          <motion.div
            style={{ position: 'absolute', inset: 0 }}
            animate={{ rotateZ: [0, 360] }}
            transition={{ duration: 9, repeat: Infinity, ease: 'linear' }}
          >
            <div className="relative h-full w-full">
              <div className="absolute -top-[5px] left-1/2 -translate-x-1/2">
                <div
                  className="h-[10px] w-[10px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, #fbbf24 30%, rgba(251,191,36,0.08) 100%)',
                    boxShadow: '0 0 10px 4px rgba(251,191,36,0.9), 0 0 22px rgba(251,191,36,0.5)',
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Órbita 2 — média, plano +20° */}
        <div
          className="pointer-events-none absolute"
          style={{ left: 0, top: 0, width: '318px', height: '318px', transform: 'translate(-50%, -50%) rotateZ(20deg) rotateX(60deg)' }}
        >
          <div className="h-full w-full rounded-full" style={{ border: '1.5px solid rgba(245,158,11,0.45)' }} />
          <motion.div
            style={{ position: 'absolute', inset: 0 }}
            animate={{ rotateZ: [120, 480] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            <div className="relative h-full w-full">
              <div className="absolute -top-[6px] left-1/2 -translate-x-1/2">
                <div
                  className="h-[12px] w-[12px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, #f59e0b 30%, rgba(245,158,11,0.08) 100%)',
                    boxShadow: '0 0 12px 4px rgba(245,158,11,0.9), 0 0 26px rgba(245,158,11,0.45)',
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Órbita 3 — externa, plano -22° */}
        <div
          className="pointer-events-none absolute hidden sm:block"
          style={{ left: 0, top: 0, width: '392px', height: '392px', transform: 'translate(-50%, -50%) rotateZ(-22deg) rotateX(64deg)' }}
        >
          <div className="h-full w-full rounded-full" style={{ border: '1.5px solid rgba(251,191,36,0.38)' }} />
          <motion.div
            style={{ position: 'absolute', inset: 0 }}
            animate={{ rotateZ: [240, 600] }}
            transition={{ duration: 32, repeat: Infinity, ease: 'linear' }}
          >
            <div className="relative h-full w-full">
              <div className="absolute -top-[7px] left-1/2 -translate-x-1/2">
                <div
                  className="h-[14px] w-[14px] rounded-full"
                  style={{
                    background: 'radial-gradient(circle, #fcd34d 30%, rgba(252,211,77,0.08) 100%)',
                    boxShadow: '0 0 14px 5px rgba(252,211,77,0.85), 0 0 30px rgba(252,211,77,0.4)',
                  }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sol — logo, centrado no pivot */}
        <div className="absolute z-10" style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}>
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
            style={{ perspective: 900 }}
          >
            <motion.div initial={{ rotateY: 620, scale: 0.25, opacity: 0 }} animate={logoControls}>
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute h-[100px] w-[100px] rounded-full blur-2xl animate-pulse"
                  style={{
                    background: 'radial-gradient(circle, rgba(251,191,36,0.28) 0%, rgba(11,127,134,0.10) 65%, transparent 100%)',
                  }}
                />
                <div
                  className="absolute h-[80px] w-[80px] rounded-full animate-spin"
                  style={{ animationDuration: '18s', border: '1px solid rgba(251,191,36,0.45)' }}
                />
                <div
                  className="relative flex h-[60px] w-[60px] items-center justify-center rounded-full border-2 border-amber-400/65"
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, rgba(11,127,134,0.16) 0%, rgba(2,17,23,0.96) 68%)',
                    boxShadow: '0 0 28px rgba(251,191,36,0.45), 0 0 55px rgba(11,127,134,0.20), inset 0 0 16px rgba(251,191,36,0.12)',
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="Logo SigmaAuto"
                    className="h-[30px] w-[30px] object-contain"
                    style={{ filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.68))' }}
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
