'use client'

import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpenText, Mail, MessageCircle, ChevronRight, Clock, Shield } from 'lucide-react'

const channels = [
  {
    icon: BookOpenText,
    title: 'Manual do Usuário',
    description: 'Guia completo com passo a passo de ordens de serviço, clientes, financeiro, estoque, retífica e usuários.',
    href: '/manual',
    cta: 'Abrir manual',
    external: false,
    accent: true,
  },
  {
    icon: Mail,
    title: 'E-mail de Suporte',
    description: 'Fale com a equipe pelo e-mail suporte@sigmaauto.com.br com retorno em até 4 horas úteis.',
    href: 'mailto:suporte@sigmaauto.com.br',
    cta: 'Enviar e-mail',
    external: true,
    accent: false,
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description: 'Atendimento comercial e operacional de segunda a sexta, das 9h às 18h.',
    href: 'https://wa.me/5521979330093',
    cta: 'Chamar no WhatsApp',
    external: true,
    accent: false,
  },
]

const faq = [
  {
    question: 'Posso acessar pelo celular?',
    answer: 'Sim. O SigmaAuto é responsivo e funciona em qualquer navegador mobile, sem precisar instalar nada.',
  },
  {
    question: 'Preciso instalar algum programa?',
    answer: 'Não. É 100% na nuvem, basta um navegador e conexão com a internet.',
  },
  {
    question: 'Meus dados estão seguros?',
    answer: 'Sim. Cada oficina opera com dados isolados, criptografia SSL e rotinas de backup automático diário.',
  },
  {
    question: 'Como adiciono outro mecânico?',
    answer: 'Acesse Usuários no menu, envie um convite por e-mail e selecione o perfil Mecânico.',
  },
  {
    question: 'O SigmaAuto funciona para retífica de motores?',
    answer: 'Sim. Temos um módulo dedicado de Retífica com fluxo de desmontagem, metrologia em 2 etapas, laudo técnico e Kanban especializado.',
  },
  {
    question: 'Como cancelo minha assinatura?',
    answer: 'Pelo painel de Configurações > Assinatura, ou enviando e-mail para suporte@sigmaauto.com.br. Sem multa e sem burocracia.',
  },
]

export function SupportPage() {
  return (
    <main className="min-h-screen bg-[#060608] pt-16">
      {/* Hero */}
      <div className="relative py-20 overflow-hidden">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="relative max-w-7xl mx-auto px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-zinc-500 hover:text-white text-sm font-medium transition-colors mb-8">
            <ArrowLeft size={14} />
            Voltar ao site
          </Link>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block text-xs font-black uppercase tracking-widest text-amber-500 mb-4 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
                Suporte
              </span>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight mb-4">
                Central de{' '}
                <span className="gradient-text">ajuda e documentação</span>
              </h1>
              <p className="text-zinc-400 leading-relaxed">
                Acesse o manual completo, encontre respostas rápidas e fale com o time quando precisar de apoio operacional.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { icon: BookOpenText, value: '22', label: 'Capítulos', color: 'amber' },
                { icon: Clock, value: '< 4h', label: 'Resposta', color: 'orange' },
                { icon: Shield, value: '99.95%', label: 'Uptime', color: 'amber' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/[0.07] bg-[#0f0f12] p-5 text-center">
                  <s.icon size={20} className="text-amber-400 mx-auto mb-2" />
                  <p className="text-2xl font-black text-white">{s.value}</p>
                  <p className="text-zinc-600 text-xs mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Channels */}
      <div className="max-w-7xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-5 mb-16">
          {channels.map((ch, i) => {
            const Icon = ch.icon
            const Card = (
              <motion.div
                key={ch.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-3xl border p-7 flex flex-col h-full transition-all duration-300 ${
                  ch.accent
                    ? 'border-amber-500/30 bg-amber-500/[0.05] hover:border-amber-500/50'
                    : 'border-white/[0.07] bg-[#0f0f12] hover:border-white/15'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-5 ${
                  ch.accent ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5 border border-white/10'
                }`}>
                  <Icon size={22} className={ch.accent ? 'text-amber-400' : 'text-zinc-400'} />
                </div>
                <h2 className="text-lg font-black text-white mb-3">{ch.title}</h2>
                <p className="text-zinc-500 text-sm leading-relaxed flex-1">{ch.description}</p>
                <div className="mt-5 inline-flex items-center gap-1 text-xs font-bold text-amber-400">
                  {ch.cta} <ChevronRight size={13} />
                </div>
              </motion.div>
            )

            if (!ch.external) {
              return <Link to={ch.href} key={ch.title}>{Card}</Link>
            }
            return (
              <a href={ch.href} target="_blank" rel="noopener noreferrer" key={ch.title}>
                {Card}
              </a>
            )
          })}
        </div>

        {/* FAQ */}
        <div className="rounded-3xl border border-white/[0.07] bg-[#0f0f12] p-8 lg:p-10">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
          <h2 className="text-2xl font-black text-white mb-8">Perguntas frequentes</h2>
          <div className="grid md:grid-cols-2 gap-5">
            {faq.map((item, i) => (
              <motion.div
                key={item.question}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5"
              >
                <p className="font-bold text-white text-sm mb-2">{item.question}</p>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
