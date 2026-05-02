import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Gauge, Loader2, ShieldCheck, X, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { subscriptionsApi } from '../api/client';

type Plan = {
  name: 'START' | 'PRO' | 'REDE';
  label: string;
  price: string;
  period: string;
  description: string;
  highlights: string[];
  featured?: boolean;
};

type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';

const plans: Plan[] = [
  {
    name: 'START',
    label: 'Start',
    price: 'R$ 149',
    period: '/mes',
    description: 'Para oficinas iniciando com controle total da operacao.',
    highlights: ['Ordens de servico ilimitadas', 'Cadastro de clientes e veiculos', 'Relatorios basicos'],
  },
  {
    name: 'PRO',
    label: 'Pro',
    price: 'R$ 299',
    period: '/mes',
    description: 'Aceleracao com financeiro, estoque e produtividade em tempo real.',
    highlights: ['Financeiro completo', 'Controle de estoque', 'Indicadores operacionais', 'Multi-usuario'],
    featured: true,
  },
  {
    name: 'REDE',
    label: 'Rede',
    price: 'R$ 599',
    period: '/mes',
    description: 'Para grupos de oficinas com governanca, escala e padronizacao.',
    highlights: ['Multiplas unidades', 'Dashboard consolidado', 'Permissoes avancadas', 'Suporte prioritario'],
  },
];

const features = [
  { icon: Gauge, title: 'Dashboard em tempo real', desc: 'Metas, indicadores e performance da equipe num unico painel.' },
  { icon: ShieldCheck, title: 'Permissoes por papel', desc: 'Controle total de acesso: admin, produtor e financeiro.' },
  { icon: CheckCircle2, title: 'O.S. digital completa', desc: 'Abertura, execucao, aprovacao e fechamento sem papel.' },
  { icon: Zap, title: 'Estoque inteligente', desc: 'Alertas de reposicao e rastreio de pecas por ordem.' },
];

const billingCycleOptions: Array<{ value: BillingCycle; label: string; months: number; badge?: string }> = [
  { value: 'MONTHLY', label: 'Mensal', months: 1 },
  { value: 'QUARTERLY', label: 'Trimestral', months: 3, badge: '3x mensal' },
  { value: 'SEMIANNUAL', label: 'Semestral', months: 6, badge: '6x mensal' },
  { value: 'ANNUAL', label: 'Anual', months: 12, badge: '12x mensal' },
];

export function LandingPage() {
  const navigate = useNavigate();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [publicCheckoutPlan, setPublicCheckoutPlan] = useState<Plan['name'] | null>(null);
  const [publicCheckoutOpen, setPublicCheckoutOpen] = useState(false);
  const [publicCheckoutLoading, setPublicCheckoutLoading] = useState(false);
  const [publicCheckoutError, setPublicCheckoutError] = useState<string | null>(null);
  const [publicForm, setPublicForm] = useState({
    tenantName: '',
    inviteEmail: '',
    document: '',
    billingCycle: 'MONTHLY' as BillingCycle,
  });

  const openPublicCheckout = (planName: Plan['name']) => {
    setPublicCheckoutPlan(planName);
    setPublicCheckoutError(null);
    setPublicCheckoutOpen(true);
  };

  const closePublicCheckout = () => {
    if (publicCheckoutLoading) return;
    setPublicCheckoutOpen(false);
    setPublicCheckoutError(null);
  };

  const submitPublicCheckout = async () => {
    if (!publicCheckoutPlan) return;
    setPublicCheckoutLoading(true);
    setPublicCheckoutError(null);

    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/checkout/success?plan=${publicCheckoutPlan}`;
      const cancelUrl = `${origin}/checkout/cancel`;
      const response = await subscriptionsApi.createPublicCheckout({
        plan: publicCheckoutPlan,
        billingCycle: publicForm.billingCycle,
        tenantName: publicForm.tenantName.trim(),
        inviteEmail: publicForm.inviteEmail.trim().toLowerCase(),
        document: publicForm.document.trim() || undefined,
        successUrl,
        cancelUrl,
      });

      const checkoutUrl = response.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Checkout indisponível para este plano');
      }
      window.location.href = checkoutUrl;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Falha ao iniciar checkout público';
      setPublicCheckoutError(msg);
      setPublicCheckoutLoading(false);
    }
  };

  const startPlanCheckout = async (planName: Plan['name']) => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated;

    if (!isAuthenticated) {
      openPublicCheckout(planName);
      return;
    }

    // Mantém compatibilidade para sessão expirada no fluxo autenticado:
    // se der 401 e redirecionar para login, o plano continua pendente.
    sessionStorage.setItem('pendingCheckoutPlan', planName);

    // Usuário logado: chama a API diretamente e redireciona para o MP
    setCheckoutLoading(planName);
    setCheckoutError(null);
    try {
      const origin = window.location.origin;
      const successUrl = `${origin}/settings?checkout=success&plan=${planName}`;
      const cancelUrl = `${origin}/settings?checkout=cancel`;
      const response = await subscriptionsApi.createCheckout(planName, successUrl, cancelUrl);
      const checkoutUrl = response.data?.checkoutUrl;
      if (!checkoutUrl) throw new Error('Checkout indisponível para este plano');
      // Sucesso: limpa o sessionStorage e vai para o MP
      sessionStorage.removeItem('pendingCheckoutPlan');
      window.location.href = checkoutUrl;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        // Token inválido sem refresh token → limpa estado e redireciona para login
        // pendingCheckoutPlan já está no sessionStorage (setado acima)
        useAuthStore.getState().logout();
        navigate('/login');
      } else {
        sessionStorage.removeItem('pendingCheckoutPlan');
        const msg = err?.response?.data?.message || err?.message || 'Falha ao iniciar checkout';
        setCheckoutError(msg);
      }
      setCheckoutLoading(null);
    }
  };

  const handleAccess = () => {
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  return (
    <div
      className="min-h-screen bg-[#090e17] text-white overflow-x-hidden"
      style={{ fontFamily: '"Space Grotesk", "Manrope", sans-serif' }}
    >
      {/* ── Glow ambiente ── */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10rem] left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full bg-[#ff7b2f]/10 blur-[120px]" />
        <div className="absolute top-[30%] left-[-8rem] w-[30rem] h-[30rem] rounded-full bg-[#ff7b2f]/6 blur-[100px]" />
        <div className="absolute top-[60%] right-[-6rem] w-[26rem] h-[26rem] rounded-full bg-[#2855d6]/8 blur-[100px]" />
      </div>

      {/* ── Nav ── */}
      <header className="relative z-10 max-w-5xl mx-auto px-6 pt-7 flex items-center justify-between">
        <span className="text-sm font-bold tracking-[0.18em] text-white/40 uppercase">sigmaauto.com.br</span>
        <button
          onClick={handleAccess}
          className="h-9 px-5 rounded-xl border border-white/15 text-sm font-bold text-white/80 hover:border-[#ff7b2f]/60 hover:text-white transition-all"
        >
          Acessar sistema
        </button>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-24 pb-20">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#ff7b2f]/30 bg-[#ff7b2f]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-[#ff7b2f] mb-10"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff7b2f] animate-pulse" />
          Plataforma para oficinas mecânicas
        </motion.div>

        {/* Marca com glow pulsante */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{
            opacity: 1,
            y: 0,
            textShadow: [
              '0 0 40px rgba(255,123,47,0.55), 0 0 80px rgba(255,123,47,0.25), 0 0 160px rgba(255,123,47,0.12)',
              '0 0 60px rgba(255,123,47,0.80), 0 0 120px rgba(255,123,47,0.45), 0 0 220px rgba(255,123,47,0.22)',
              '0 0 40px rgba(255,123,47,0.55), 0 0 80px rgba(255,123,47,0.25), 0 0 160px rgba(255,123,47,0.12)',
            ],
          }}
          transition={{
            opacity: { duration: 0.6, delay: 0.1 },
            y: { duration: 0.6, delay: 0.1 },
            textShadow: { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 0.8 },
          }}
          className="text-[clamp(3.5rem,10vw,7rem)] font-black leading-none tracking-[0.12em] uppercase"
          style={{ letterSpacing: '0.14em' }}
        >
          <span className="text-white">Sygma</span>
          <span className="text-[#ff7b2f]"> Auto</span>
        </motion.h1>

        {/* Slogan */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="mt-7 text-[clamp(1.1rem,2.5vw,1.5rem)] font-bold text-white/80 max-w-2xl leading-snug"
        >
          Do primeiro parafuso ao lucro no bolso —{' '}
          <span className="text-white">gestao completa da sua oficina.</span>
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-3 text-base text-white/45 max-w-xl"
        >
          Ordens de servico, financeiro, estoque e equipe em uma unica plataforma. Sem planilhas. Sem friccao.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="mt-10 flex flex-wrap gap-3 justify-center"
        >
          <button
            onClick={handleAccess}
            className="h-13 px-8 rounded-2xl bg-[#ff7b2f] text-white font-black text-base tracking-wide hover:bg-[#f06820] transition-all shadow-[0_0_30px_rgba(255,123,47,0.4)] hover:shadow-[0_0_50px_rgba(255,123,47,0.6)] inline-flex items-center gap-2"
            style={{ height: '52px' }}
          >
            Entrar no sistema
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => document.getElementById('planos')?.scrollIntoView({ behavior: 'smooth' })}
            className="h-13 px-8 rounded-2xl border border-white/15 text-white font-bold text-base hover:border-white/40 hover:bg-white/5 transition-all"
            style={{ height: '52px' }}
          >
            Ver planos
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-16 flex flex-wrap justify-center gap-8 text-center"
        >
          {[
            { value: '99.95%', label: 'Disponibilidade' },
            { value: '-34%', label: 'Tempo medio de O.S.' },
            { value: '+52%', label: 'Produtividade da equipe' },
          ].map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-black text-white">{s.value}</p>
              <p className="text-xs text-white/45 mt-1 uppercase tracking-widest">{s.label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Divisor ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* ── Features ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm p-5 hover:border-[#ff7b2f]/30 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#ff7b2f]/15 flex items-center justify-center mb-4">
                <Icon size={20} className="text-[#ff7b2f]" />
              </div>
              <p className="font-bold text-sm text-white">{title}</p>
              <p className="mt-1 text-xs text-white/50 leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Planos ── */}
      <section id="planos" className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-[0.25em] text-[#ff7b2f]/70 font-bold mb-3">Planos</p>
          <h2 className="text-3xl md:text-4xl font-black">Escolha e inicie sua assinatura</h2>
          <p className="mt-3 text-white/45 text-sm">Sem conta? voce conclui o pagamento e recebe convite de ativacao no email.</p>
        </div>

        {checkoutError && (
          <p className="text-center text-sm text-red-400 mb-4 bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3">
            {checkoutError}
          </p>
        )}

        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan, i) => (
            <motion.article
              key={plan.name}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -6 }}
              className={`relative rounded-3xl border p-6 flex flex-col ${
                plan.featured
                  ? 'bg-[#ff7b2f]/10 border-[#ff7b2f]/40 shadow-[0_0_60px_rgba(255,123,47,0.15)]'
                  : 'bg-white/4 border-white/10'
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest bg-[#ff7b2f] text-white px-3 py-1 rounded-full">
                  Mais popular
                </span>
              )}
              <p className="text-xs uppercase tracking-widest text-white/40">{plan.label}</p>
              <div className="mt-2 flex items-end gap-1">
                <p className="text-4xl font-black text-white">{plan.price}</p>
                <p className="text-sm text-white/40 mb-1">{plan.period}</p>
              </div>
              <p className="mt-3 text-sm text-white/60 leading-relaxed">{plan.description}</p>

              <ul className="mt-5 space-y-2.5 text-sm flex-1">
                {plan.highlights.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5">
                    <CheckCircle2 size={15} className="text-[#ff7b2f] flex-shrink-0" />
                    <span className="text-white/80">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => startPlanCheckout(plan.name)}
                disabled={checkoutLoading !== null}
                className={`mt-6 h-11 w-full rounded-xl text-sm font-black transition-all inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-wait ${
                  plan.featured
                    ? 'bg-[#ff7b2f] text-white hover:bg-[#f06820] shadow-[0_0_20px_rgba(255,123,47,0.4)]'
                    : 'bg-white/8 text-white border border-white/15 hover:bg-white/14'
                }`}
              >
                {checkoutLoading === plan.name ? (
                  <><Loader2 size={15} className="animate-spin" /> Aguarde...</>
                ) : (
                  `Assinar ${plan.label}`
                )}
              </button>
            </motion.article>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/8 py-8 text-center">
        <p className="text-xs text-white/25">
          © {new Date().getFullYear()} SygmaAuto · sigmaauto.com.br · Todos os direitos reservados
        </p>
      </footer>

      {publicCheckoutOpen && publicCheckoutPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75" onClick={closePublicCheckout} />
          <div className="relative w-full max-w-xl rounded-3xl border border-white/15 bg-[#101826] p-6 md:p-7 shadow-2xl">
            <button
              type="button"
              onClick={closePublicCheckout}
              className="absolute right-4 top-4 w-8 h-8 rounded-lg border border-white/15 text-white/70 hover:text-white hover:border-white/40 inline-flex items-center justify-center"
            >
              <X size={16} />
            </button>

            <p className="text-xs uppercase tracking-[0.22em] text-[#ff7b2f]/80 font-bold">Checkout publico</p>
            <h3 className="mt-2 text-2xl font-black">Plano {publicCheckoutPlan}</h3>
            <p className="mt-2 text-sm text-white/55">
              Informe os dados para pagamento. A ativacao do MASTER chega por email apos confirmacao do Mercado Pago.
            </p>

            {publicCheckoutError && (
              <p className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {publicCheckoutError}
              </p>
            )}

            <div className="mt-5 grid gap-4">
              <label className="text-sm text-white/80">
                Nome da oficina
                <input
                  value={publicForm.tenantName}
                  onChange={(e) => setPublicForm((prev) => ({ ...prev, tenantName: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#ff7b2f]/40"
                  placeholder="Ex.: Oficina Almeida"
                />
              </label>

              <label className="text-sm text-white/80">
                Email para convite do MASTER
                <input
                  type="email"
                  value={publicForm.inviteEmail}
                  onChange={(e) => setPublicForm((prev) => ({ ...prev, inviteEmail: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#ff7b2f]/40"
                  placeholder="responsavel@empresa.com"
                />
              </label>

              <label className="text-sm text-white/80">
                Documento (opcional)
                <input
                  value={publicForm.document}
                  onChange={(e) => setPublicForm((prev) => ({ ...prev, document: e.target.value }))}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#ff7b2f]/40"
                  placeholder="CNPJ/CPF"
                />
              </label>

              <label className="text-sm text-white/80">
                Periodicidade
                <select
                  value={publicForm.billingCycle}
                  onChange={(e) => setPublicForm((prev) => ({ ...prev, billingCycle: e.target.value as BillingCycle }))}
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#ff7b2f]/40"
                >
                  {billingCycleOptions.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0f172a] text-white">
                      {option.label} {option.badge ? `(${option.badge})` : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={submitPublicCheckout}
              disabled={
                publicCheckoutLoading ||
                !publicForm.tenantName.trim() ||
                !publicForm.inviteEmail.trim()
              }
              className="mt-6 h-12 w-full rounded-xl bg-[#ff7b2f] text-white font-black hover:bg-[#f06820] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {publicCheckoutLoading ? (
                <><Loader2 size={16} className="animate-spin" /> Abrindo checkout...</>
              ) : (
                <>
                  Ir para Mercado Pago
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
