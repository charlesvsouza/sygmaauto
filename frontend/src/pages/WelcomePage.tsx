'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Wrench, ArrowRight, ShieldCheck, BarChart3, Zap } from 'lucide-react'

const LOGIN_URL = 'https://sigmaauto.com.br/login'
const AUTO_REDIRECT_MS = 10000

const highlights = [
  {
    icon: Wrench,
    title: 'Gestão de O.S.',
    description: 'Fluxo completo desde o orçamento até a finalização da ordem de serviço.',
  },
  {
    icon: ShieldCheck,
    title: 'Segurança',
    description: 'Dados da sua oficina e clientes protegidos com criptografia SSL.',
  },
  {
    icon: BarChart3,
    title: 'Performance',
    description: 'Indicadores financeiros e de produção em tempo real no seu painel.',
  },
]

export default function WelcomePage() {
  const [seconds, setSeconds] = useState(Math.ceil(AUTO_REDIRECT_MS / 1000))
  const navigated = useRef(false)

  const goToLogin = () => {
    if (navigated.current) return
    navigated.current = true
    window.location.href = LOGIN_URL
  }

  useEffect(() => {
    const autoTimer = setTimeout(goToLogin, AUTO_REDIRECT_MS)
    const countdown = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000)
    return () => {
      clearTimeout(autoTimer)
      clearInterval(countdown)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-[#020408] text-white flex items-center justify-center overflow-hidden relative">

      {/* Glow center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <motion.div
          animate={{ scale: [1, 1.22, 1], opacity: [0.12, 0.3, 0.12] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="w-[440px] h-[440px] bg-amber-500/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{ scale: [0.85, 1.2, 1.35], opacity: [0, 0.15, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeOut', delay: 0.5 }}
          className="absolute w-[700px] h-[700px] rounded-full border border-amber-400/20 blur-[2px]"
        />
        <motion.div
          animate={{ scale: [0.9, 1.3, 0.9], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute w-4 h-4 rounded-full bg-amber-400/70 blur-[1px]"
        />
      </div>

      {/* BG blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-amber-600/10 rounded-full blur-[130px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-600/10 rounded-full blur-[130px]" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="z-10 w-full max-w-4xl px-6"
      >
        <div className="bg-white/[0.03] p-8 md:p-12 rounded-[2.5rem] border border-white/10 relative overflow-hidden backdrop-blur-3xl">
          {/* top line */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-3 mb-10"
          >
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Zap className="text-white" size={22} />
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-white">
                Sigma<span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Auto</span>
              </span>
              <p className="text-[11px] text-zinc-500 mt-0.5 tracking-wide uppercase">Sistema para Oficina Mecânica · ERP Automotivo</p>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
                className="text-4xl md:text-5xl font-black leading-tight mb-6"
              >
                Bem-vindo ao seu <br />
                <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Novo Escritório.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-zinc-400 text-lg mb-8 leading-relaxed"
              >
                Sua plataforma de gestão automotiva completa está pronta. Acesse agora e comece a operar.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
              >
                <button
                  onClick={goToLogin}
                  className="group flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-2xl hover:brightness-110 transition-all hover:scale-105 shadow-xl shadow-amber-500/20"
                >
                  Ir para o login
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            </div>

            <div className="grid gap-4">
              {highlights.map((item, idx) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  className="p-5 rounded-3xl bg-white/[0.04] border border-white/[0.06] flex items-start gap-4 hover:bg-white/[0.07] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                    <item.icon size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-white mb-1">{item.title}</h3>
                    <p className="text-sm text-zinc-500 leading-snug">{item.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-white/[0.05] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-zinc-600 uppercase tracking-widest">SigmaAuto Cloud Online</span>
            </div>

            <div className="flex flex-col md:items-end gap-2">
              <p className="text-xs text-zinc-500">
                Redirecionando em <span className="text-white font-black">{seconds}s</span>
              </p>
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-600"
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: AUTO_REDIRECT_MS / 1000, ease: 'linear' }}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
