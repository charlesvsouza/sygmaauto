import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Shield, Zap, Database, Cpu } from 'lucide-react';
import { EcgPulse } from '../components/marketing/EcgPulse';

const SPLASH_DURATION_MS = 10000;

const steps = [
  { id: 1, text: 'Iniciando sistema...', icon: Cpu },
  { id: 2, text: 'Carregando módulos...', icon: Wrench },
  { id: 3, text: 'Estabelecendo conexão segura...', icon: Shield },
  { id: 4, text: 'Sincronizando dados...', icon: Database },
  { id: 5, text: 'Preparando interface...', icon: Zap },
];

export function InitialSplash() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (complete) {
      const timer = window.setTimeout(() => {
        navigate('/login');
      }, 600);
      return () => window.clearTimeout(timer);
    }

    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const nextProgress = Math.min((performance.now() - startedAt) / SPLASH_DURATION_MS, 1);
      setProgress(nextProgress);
      setCurrentStep(Math.min(Math.floor(nextProgress * steps.length), steps.length));
      if (nextProgress >= 1) setComplete(true);
    }, 100);

    return () => window.clearInterval(interval);
  }, [complete, navigate]);

  return (
    <div
      className="min-h-screen bg-[#090e17] flex flex-col items-center justify-center relative overflow-hidden"
      style={{ fontFamily: '"Space Grotesk", "Manrope", sans-serif' }}
    >
      {/* Glow ambiente — mesmo da LandingPage */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10rem] left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full bg-[#ff7b2f]/10 blur-[120px]" />
        <div className="absolute top-[30%] left-[-8rem] w-[30rem] h-[30rem] rounded-full bg-[#ff7b2f]/6 blur-[100px]" />
        <div className="absolute top-[60%] right-[-6rem] w-[26rem] h-[26rem] rounded-full bg-[#2855d6]/8 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex flex-col items-center z-10 px-6"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="flex items-center gap-3 mb-14"
        >
          <div className="w-14 h-14 bg-gradient-to-br from-[#ff7b2f] to-[#e85d04] rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(255,123,47,0.3)]">
            <Wrench className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white leading-none">
              Sigma<span className="text-[#ff7b2f]">Auto</span>
            </h1>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] mt-0.5">
              Sistema para Oficina Mecânica
            </p>
          </div>
        </motion.div>

        {/* Mensagem central */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mb-14"
        >
          <p className="text-white/50 text-sm tracking-wide">
            {complete ? 'Tudo pronto. Redirecionando...' : 'Preparando seu ambiente de gestão'}
          </p>
        </motion.div>

        {/* Barra de progresso */}
        <div className="w-72 md:w-96">
          <EcgPulse
            className="h-7 w-full rounded-full border border-[#ff7b2f]/25 bg-[#0d1220]/45 overflow-hidden relative mb-3"
            lineColor="#fb923c"
            pointColor="#fdba74"
            waveDuration={2.6}
            travelDuration={3.6}
            pointProgress={progress}
          />
          <p className="text-[10px] text-white/35 uppercase tracking-[0.16em] text-center mb-4"></p>

          {/* Step atual */}
          <div className="h-5 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {currentStep < steps.length ? (
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center gap-2 text-white/30"
                >
                  {steps[currentStep] && (() => {
                    const StepIcon = steps[currentStep].icon;
                    return (
                      <>
                        <StepIcon size={12} className="text-[#ff7b2f]" />
                        <span className="text-[10px] uppercase tracking-widest">{steps[currentStep].text}</span>
                      </>
                    );
                  })()}
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 text-emerald-400/80 text-[10px] uppercase tracking-widest"
                >
                  <Shield size={12} /> Pronto
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Rodapé */}
      <div className="absolute bottom-8 flex flex-col items-center gap-1">
        <p className="text-[9px] text-white/15 uppercase tracking-widest">© 2026 SigmaAuto · sigmaauto.com.br</p>
      </div>
    </div>
  );
}
