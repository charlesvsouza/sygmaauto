import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { subscriptionsApi } from '../api/client';
import { useAuthStore } from '../store/authStore';

type PlanName = 'START' | 'PRO' | 'REDE';
type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUAL' | 'ANNUAL';

type PlanDef = {
  name: PlanName;
  label: string;
  monthlyPrice: number;
  description: string;
};

const plans: PlanDef[] = [
  { name: 'START', label: 'Start', monthlyPrice: 149, description: 'Ideal para oficinas iniciando com controle completo.' },
  { name: 'PRO', label: 'Pro', monthlyPrice: 299, description: 'Financeiro, estoque e produtividade para crescer com previsibilidade.' },
  { name: 'REDE', label: 'Rede', monthlyPrice: 599, description: 'Governanca de unidades e operacao padronizada em escala.' },
];

const cycleOptions: Array<{ value: BillingCycle; label: string; months: number; discountRate: number; badge?: string }> = [
  { value: 'MONTHLY', label: 'Mensal', months: 1, discountRate: 0 },
  { value: 'QUARTERLY', label: 'Trimestral', months: 3, discountRate: 0 },
  { value: 'SEMIANNUAL', label: 'Semestral', months: 6, discountRate: 0 },
  { value: 'ANNUAL', label: 'Anual', months: 12, discountRate: 0.15, badge: '15% OFF' },
];

const formatBrl = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 2,
  }).format(value);

const isPlanName = (value: string | null): value is PlanName => value === 'START' || value === 'PRO' || value === 'REDE';

export function PlansCheckoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const initialPlanParam = searchParams.get('plan');
  const [selectedPlan, setSelectedPlan] = useState<PlanName>(isPlanName(initialPlanParam) ? initialPlanParam : 'PRO');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [tenantName, setTenantName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [document, setDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedPlanDef = useMemo(() => plans.find((plan) => plan.name === selectedPlan) || plans[1], [selectedPlan]);
  const selectedCycle = useMemo(
    () => cycleOptions.find((cycle) => cycle.value === billingCycle) || cycleOptions[0],
    [billingCycle]
  );

  const gross = selectedPlanDef.monthlyPrice * selectedCycle.months;
  const discountedTotal = gross * (1 - selectedCycle.discountRate);
  const monthlyEquivalent = discountedTotal / selectedCycle.months;
  const annualDiscountValue = gross - discountedTotal;

  const isPublicFormValid = tenantName.trim().length > 1 && inviteEmail.trim().includes('@');

  const startCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const origin = window.location.origin;

      if (isAuthenticated) {
        const successUrl = `${origin}/settings?checkout=success&plan=${selectedPlan}`;
        const cancelUrl = `${origin}/settings?checkout=cancel`;
        const response = await subscriptionsApi.createCheckout(selectedPlan, successUrl, cancelUrl, billingCycle);
        const checkoutUrl = response.data?.checkoutUrl;

        if (!checkoutUrl) {
          throw new Error('Checkout indisponivel para este plano');
        }

        window.location.href = checkoutUrl;
        return;
      }

      const successUrl = `${origin}/checkout/success?plan=${selectedPlan}`;
      const cancelUrl = `${origin}/checkout/cancel`;
      const response = await subscriptionsApi.createPublicCheckout({
        plan: selectedPlan,
        billingCycle,
        tenantName: tenantName.trim(),
        inviteEmail: inviteEmail.trim().toLowerCase(),
        document: document.trim() || undefined,
        successUrl,
        cancelUrl,
      });

      const checkoutUrl = response.data?.checkoutUrl;
      if (!checkoutUrl) {
        throw new Error('Checkout indisponivel para este plano');
      }

      window.location.href = checkoutUrl;
    } catch (err: any) {
      if (err?.response?.status === 401) {
        const next = `/planos?plan=${selectedPlan}`;
        useAuthStore.getState().logout();
        navigate(`/login?next=${encodeURIComponent(next)}`);
        return;
      }

      const msg = err?.response?.data?.message || err?.message || 'Falha ao iniciar checkout';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090e17] text-white" style={{ fontFamily: '"Space Grotesk", "Manrope", sans-serif' }}>
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-[-10rem] left-1/2 -translate-x-1/2 w-[60rem] h-[30rem] rounded-full bg-[#ff7b2f]/10 blur-[120px]" />
        <div className="absolute bottom-[-8rem] right-[-8rem] w-[28rem] h-[28rem] rounded-full bg-[#1f4fd3]/12 blur-[110px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/65 hover:text-white transition-colors">
          <ArrowLeft size={16} />
          Voltar para a landing
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-6"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-[#ff7b2f]/80 font-bold">Assinatura</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-black">Escolha a modalidade do seu plano</h1>
          <p className="mt-3 text-white/60 text-sm md:text-base max-w-2xl">
            Selecione o plano e o ciclo de cobranca. No anual, voce recebe 15% de desconto automaticamente.
          </p>
        </motion.div>

        <div className="mt-9 grid lg:grid-cols-2 gap-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-widest text-white/50">1. Plano</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              {plans.map((plan) => {
                const active = selectedPlan === plan.name;
                return (
                  <button
                    key={plan.name}
                    type="button"
                    onClick={() => setSelectedPlan(plan.name)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? 'border-[#ff7b2f]/70 bg-[#ff7b2f]/10 shadow-[0_0_20px_rgba(255,123,47,0.25)]'
                        : 'border-white/12 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <p className="text-[11px] uppercase tracking-widest text-white/45">{plan.name}</p>
                    <p className="mt-1 text-lg font-black">{plan.label}</p>
                    <p className="mt-1 text-sm text-white/70">{formatBrl(plan.monthlyPrice)}/mes</p>
                  </button>
                );
              })}
            </div>

            <p className="mt-7 text-xs uppercase tracking-widest text-white/50">2. Modalidade</p>
            <div className="mt-4 grid sm:grid-cols-2 gap-3">
              {cycleOptions.map((cycle) => {
                const active = billingCycle === cycle.value;
                const grossValue = selectedPlanDef.monthlyPrice * cycle.months;
                const finalValue = grossValue * (1 - cycle.discountRate);
                return (
                  <button
                    key={cycle.value}
                    type="button"
                    onClick={() => setBillingCycle(cycle.value)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? 'border-[#ff7b2f]/70 bg-[#ff7b2f]/10 shadow-[0_0_20px_rgba(255,123,47,0.25)]'
                        : 'border-white/12 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{cycle.label}</p>
                      {cycle.badge && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full px-2 py-1">
                          {cycle.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-base font-black">{formatBrl(finalValue)}</p>
                    <p className="text-xs text-white/55">{cycle.months}x de {formatBrl(finalValue / cycle.months)}</p>
                  </button>
                );
              })}
            </div>

            {!isAuthenticated && (
              <div className="mt-7 grid gap-4">
                <p className="text-xs uppercase tracking-widest text-white/50">3. Dados para ativacao</p>
                <label className="text-sm text-white/80">
                  Nome da oficina
                  <input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#ff7b2f]/40"
                    placeholder="Ex.: Oficina Almeida"
                  />
                </label>

                <label className="text-sm text-white/80">
                  Email para convite do MASTER
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#ff7b2f]/40"
                    placeholder="responsavel@empresa.com"
                  />
                </label>

                <label className="text-sm text-white/80">
                  CPF do pagador (opcional, recomendado para cartao)
                  <input
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5 text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#ff7b2f]/40"
                    placeholder="Ex.: 123.456.789-00"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-[#ff7b2f]/30 bg-[#ff7b2f]/10 p-6 h-fit">
            <p className="text-xs uppercase tracking-[0.2em] text-[#ffccaa] font-bold">Resumo</p>
            <h2 className="mt-2 text-2xl font-black">Plano {selectedPlanDef.label}</h2>
            <p className="mt-2 text-sm text-white/75 leading-relaxed">{selectedPlanDef.description}</p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between text-white/70">
                <span>Periodicidade</span>
                <span className="font-bold text-white">{selectedCycle.label}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span>Subtotal</span>
                <span>{formatBrl(gross)}</span>
              </div>
              {selectedCycle.discountRate > 0 && (
                <div className="flex items-center justify-between text-emerald-300">
                  <span>Desconto</span>
                  <span>- {formatBrl(annualDiscountValue)}</span>
                </div>
              )}
              <div className="h-px bg-white/15" />
              <div className="flex items-center justify-between">
                <span className="text-white/80">Total</span>
                <span className="text-2xl font-black">{formatBrl(discountedTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span>Equivalente mensal</span>
                <span>{formatBrl(monthlyEquivalent)}/mes</span>
              </div>
            </div>

            {error && (
              <p className="mt-5 text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={startCheckout}
              disabled={loading || (!isAuthenticated && !isPublicFormValid)}
              className="mt-6 h-12 w-full rounded-xl bg-[#ff7b2f] text-white font-black hover:bg-[#f06820] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Abrindo checkout...
                </>
              ) : (
                <>
                  Ir para Mercado Pago
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <ul className="mt-5 space-y-2 text-sm text-white/75">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#ff7b2f] mt-0.5 flex-shrink-0" />
                Checkout oficial do Mercado Pago
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-[#ff7b2f] mt-0.5 flex-shrink-0" />
                Convite de ativacao do MASTER enviado apos confirmacao
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
