import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Gauge, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { useAuthStore } from '../store/authStore';

type Plan = {
  name: 'START' | 'PRO' | 'REDE';
  label: string;
  price: string;
  description: string;
  highlights: string[];
  featured?: boolean;
};

const plans: Plan[] = [
  {
    name: 'START',
    label: 'Start',
    price: 'R$ 149',
    description: 'Para oficinas iniciando com controle total da operacao.',
    highlights: ['Ordens de servico', 'Cadastro de clientes', 'Gestao de veiculos'],
  },
  {
    name: 'PRO',
    label: 'Pro',
    price: 'R$ 299',
    description: 'Aceleracao com financeiro, estoque e produtividade em tempo real.',
    highlights: ['Financeiro completo', 'Controle de estoque', 'Indicadores operacionais'],
    featured: true,
  },
  {
    name: 'REDE',
    label: 'Rede',
    price: 'R$ 599',
    description: 'Para grupos de oficinas com governanca, escala e padronizacao.',
    highlights: ['Multiplas unidades', 'Permissoes avancadas', 'Suporte prioritario'],
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const stats = useMemo(
    () => [
      { label: 'Disponibilidade', value: '99.95%' },
      { label: 'Tempo medio de O.S.', value: '-34%' },
      { label: 'Produtividade da equipe', value: '+52%' },
    ],
    []
  );

  const startPlanCheckout = (planName: Plan['name']) => {
    if (isAuthenticated) {
      navigate(`/settings?autocheckout=${planName}`);
      return;
    }

    const nextPath = encodeURIComponent(`/settings?autocheckout=${planName}`);
    navigate(`/login?next=${nextPath}`);
  };

  return (
    <div
      className="min-h-screen bg-[#f7f3ea] text-[#1c232e]"
      style={{ fontFamily: '"Space Grotesk", "Manrope", sans-serif' }}
    >
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-36 -left-24 w-[28rem] h-[28rem] rounded-full bg-[#ff7b2f]/20 blur-3xl" />
          <div className="absolute top-0 right-0 w-[26rem] h-[26rem] rounded-full bg-[#2ea89a]/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 w-[22rem] h-[22rem] rounded-full bg-[#2855d6]/15 blur-3xl" />
        </div>

        <header className="relative max-w-6xl mx-auto px-6 pt-8">
          <nav className="flex items-center justify-between rounded-2xl border border-[#1c232e]/10 bg-white/70 backdrop-blur-sm px-5 py-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1c232e] text-white flex items-center justify-center">
                <Wrench size={20} />
              </div>
              <div>
                <p className="font-black tracking-tight text-lg">SygmaAuto</p>
                <p className="text-xs text-[#1c232e]/60">Operating System para oficinas</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="h-10 px-4 rounded-xl border border-[#1c232e]/20 text-sm font-bold hover:bg-[#1c232e]/5 transition-colors"
              >
                Entrar
              </button>
              <button
                onClick={() => navigate('/register')}
                className="h-10 px-4 rounded-xl bg-[#1c232e] text-white text-sm font-bold hover:bg-[#111722] transition-colors"
              >
                Criar conta
              </button>
            </div>
          </nav>
        </header>

        <section className="relative max-w-6xl mx-auto px-6 pt-14 pb-14 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#1c232e]/15 bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-widest">
              <Sparkles size={14} /> Plataforma premium
            </p>
            <h1 className="mt-5 text-5xl md:text-6xl font-black leading-[0.95] tracking-tight">
              Gestao de oficina
              <span className="block text-[#2855d6]">com DNA de produto global</span>
            </h1>
            <p className="mt-5 text-lg text-[#1c232e]/75 max-w-xl">
              Controle ordens de servico, equipe, estoque e financeiro em uma experiencia unica. Sem planilhas, sem friccao, com performance real.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => startPlanCheckout('PRO')}
                className="h-12 px-6 rounded-2xl bg-[#ff7b2f] text-white font-black tracking-wide hover:bg-[#ea6820] transition-colors inline-flex items-center gap-2"
              >
                Assinar plano Pro
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="h-12 px-6 rounded-2xl border border-[#1c232e]/20 font-bold hover:bg-white/70 transition-colors"
              >
                Ver painel
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="rounded-3xl border border-[#1c232e]/10 bg-white/80 backdrop-blur-sm p-6 shadow-[0_30px_80px_-40px_rgba(28,35,46,0.5)]"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.map((item) => (
                <div key={item.label} className="rounded-2xl bg-[#f2f5ff] border border-[#2855d6]/10 p-4">
                  <p className="text-xs uppercase tracking-wide text-[#1c232e]/60">{item.label}</p>
                  <p className="text-2xl font-black mt-1">{item.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-[#1c232e] text-white p-4">
                <Gauge className="mb-3" size={20} />
                <p className="font-bold">Tempo de atendimento</p>
                <p className="text-sm text-white/70">Dashboards e metas operacionais.</p>
              </div>
              <div className="rounded-2xl bg-[#fdf3e8] p-4">
                <ShieldCheck className="mb-3 text-[#ff7b2f]" size={20} />
                <p className="font-bold">Seguranca por papel</p>
                <p className="text-sm text-[#1c232e]/70">Permissoes e auditoria por usuario.</p>
              </div>
              <div className="rounded-2xl bg-[#e9fbf8] p-4">
                <CheckCircle2 className="mb-3 text-[#2ea89a]" size={20} />
                <p className="font-bold">Assinatura online</p>
                <p className="text-sm text-[#1c232e]/70">Checkout em producao com webhook.</p>
              </div>
            </div>
          </motion.div>
        </section>
      </div>

      <section id="planos" className="max-w-6xl mx-auto px-6 pb-20">
        <div className="flex items-end justify-between gap-4 mb-7">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#1c232e]/50 font-bold">Planos</p>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight">Clique e va direto para o checkout</h2>
          </div>
          <p className="text-sm text-[#1c232e]/60 max-w-xs">Ao clicar no plano, o sistema ja abre o fluxo de assinatura.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <motion.article
              key={plan.name}
              whileHover={{ y: -6 }}
              className={`rounded-3xl border p-5 ${
                plan.featured
                  ? 'bg-[#1c232e] text-white border-[#1c232e]'
                  : 'bg-white border-[#1c232e]/15'
              }`}
            >
              <p className={`text-xs uppercase tracking-widest ${plan.featured ? 'text-white/60' : 'text-[#1c232e]/55'}`}>
                {plan.label}
              </p>
              <p className="mt-2 text-4xl font-black leading-none">{plan.price}</p>
              <p className={`mt-3 text-sm ${plan.featured ? 'text-white/80' : 'text-[#1c232e]/75'}`}>{plan.description}</p>

              <ul className="mt-5 space-y-2 text-sm">
                {plan.highlights.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <CheckCircle2 size={16} className={plan.featured ? 'text-[#2ea89a]' : 'text-[#2855d6]'} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startPlanCheckout(plan.name)}
                className={`mt-6 h-11 w-full rounded-xl text-sm font-black transition-colors ${
                  plan.featured
                    ? 'bg-[#ff7b2f] text-white hover:bg-[#ea6820]'
                    : 'bg-[#1c232e] text-white hover:bg-[#111722]'
                }`}
              >
                Assinar {plan.label}
              </button>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}
