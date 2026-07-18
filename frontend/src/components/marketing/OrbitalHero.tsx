import { useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';

/**
 * Hero orbital simplificado: 1 esfera central + 2 anéis elípticos finos.
 * Inspirado no padrão do sigmadiagnostics.com.br, recolorido em âmbar/dourado
 * para o sygmaauto. Substitui a versão anterior (3 anéis + halo duplicado).
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
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] rounded-full blur-3xl"
          style={{
            background: 'radial-gradient(circle, rgba(251,191,36,0.16) 0%, rgba(11,127,134,0.08) 60%, rgba(11,127,134,0) 100%)',
          }}
        />

        <div
          className="pointer-events-none absolute"
          style={{ left: 0, top: 0, transform: 'translate(-50%, -50%) rotateZ(20deg) rotateX(70deg)' }}
        >
          <div className="w-[248px] h-[248px] rounded-full border" style={{ borderColor: 'rgba(251,191,36,0.5)' }} />
          <motion.div
            className="absolute inset-0"
            animate={{ rotateZ: [0, 360] }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}>
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: 'radial-gradient(circle, #fbbf24 20%, rgba(251,191,36,0.15) 100%)',
                  boxShadow: '0 0 8px 3px rgba(251,191,36,0.9), 0 0 18px rgba(251,191,36,0.4)',
                }}
              />
            </div>
          </motion.div>
        </div>

        <div
          className="pointer-events-none absolute hidden sm:block"
          style={{ left: 0, top: 0, transform: 'translate(-50%, -50%) rotateZ(-22deg) rotateX(62deg)' }}
        >
          <div className="w-[360px] h-[360px] rounded-full border" style={{ borderColor: 'rgba(245,158,11,0.4)' }} />
          <motion.div
            className="absolute inset-0"
            animate={{ rotateZ: [120, 480] }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute" style={{ top: -6, left: '50%', transform: 'translateX(-50%)' }}>
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: 'radial-gradient(circle, #f59e0b 20%, rgba(245,158,11,0.15) 100%)',
                  boxShadow: '0 0 8px 3px rgba(245,158,11,0.9), 0 0 18px rgba(245,158,11,0.38)',
                }}
              />
            </div>
          </motion.div>
        </div>

        <div className="absolute z-10" style={{ left: 0, top: 0, transform: 'translate(-50%, -50%)' }}>
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 1.7 }}
            style={{ perspective: 900 }}
          >
            <motion.div initial={{ rotateY: 620, scale: 0.25, opacity: 0 }} animate={logoControls}>
              <div className="relative flex items-center justify-center">
                <div className="absolute w-[90px] h-[90px] rounded-full blur-2xl" style={{ background: 'rgba(251,191,36,0.2)' }} />
                <div
                  className="relative w-[62px] h-[62px] rounded-full flex items-center justify-center border"
                  style={{
                    borderColor: 'rgba(251,191,36,0.6)',
                    background: 'radial-gradient(circle at 35% 30%, rgba(11,127,134,0.16) 0%, rgba(2,17,23,0.96) 74%)',
                    boxShadow: '0 0 36px rgba(251,191,36,0.2), 0 0 60px rgba(11,127,134,0.14)',
                  }}
                >
                  <img
                    src="/logo.png"
                    alt="Logo SigmaAuto"
                    className="w-[30px] h-[30px] object-contain"
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
