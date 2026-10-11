import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { subscriptionsApi } from '../api/client';
import { type PlanName } from '../lib/planAccess';
import { useAuthStore } from '../store/authStore';

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
  { name: 'REDE', label: 'Rede', monthlyPrice: 599, description: 'Governança de unidades e operação padronizada em escala.' },
  { name: 'RETIFICA_PRO', label: 'Modo Retífica Pro', monthlyPrice: 499, description: 'Operação completa de oficina com fluxo técnico de retífica de motores.' },
  { name: 'RETIFICA_REDE', label: 'Modo Retífica Rede', monthlyPrice: 899, description: 'Retífica de motores com multiunidade, padronização e gestão em rede.' },
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

const isPlanName = (value: string | null): value is PlanName =>
  value === 'START' || value === 'PRO' || value === 'REDE' || value === 'RETIFICA_PRO' || value === 'RETIFICA_REDE';

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
          throw new Error('Checkout indisponível para este plano');
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
        throw new Error('Checkout indisponível para este plano');
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
    <div className="min-h-screen bg-app text-surface-50">
      <div className="pointer-events-none fixed inset-0 z-0">
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-surface-500 hover:text-surface-50 transition-colors">
          <ArrowLeft size={16} />
          Voltar para a landing
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-6"
        >
          <p className="text-xs uppercase tracking-wide text-accent-ink font-bold">Assinatura</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-bold">Escolha a modalidade do seu plano</h1>
          <p className="mt-3 text-surface-500 text-sm md:text-base max-w-2xl">
            Selecione o plano e o ciclo de cobrança. No anual, você recebe 15% de desconto automaticamente.
          </p>
        </motion.div>

        <div className="mt-9 grid lg:grid-cols-2 gap-6">
          <div className="rounded-xl border border-line bg-ink/5 p-6">
            <p className="text-xs uppercase tracking-wide text-surface-500">1. Plano</p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              {plans.map((plan) => {
                const active = selectedPlan === plan.name;
                return (
                  <button
                    key={plan.name}
                    type="button"
                    onClick={() => setSelectedPlan(plan.name)}
                    className={`rounded-lg border p-4 text-left transition-all ${
 active
 ? 'border-accent/30 bg-accent-soft shadow-sm'
 : 'border-line bg-ink/5 hover:border-line'
 }`}
                  >
                    <p className="text-[12px] uppercase tracking-wide text-surface-500">{plan.name}</p>
                    <p className="mt-1 text-lg font-bold">{plan.label}</p>
                    <p className="mt-1 text-sm text-surface-500">{formatBrl(plan.monthlyPrice)}/mes</p>
                  </button>
                );
              })}
            </div>

            <p className="mt-7 text-xs uppercase tracking-wide text-surface-500">2. Modalidade</p>
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
                    className={`rounded-lg border p-4 text-left transition-all ${
 active
 ? 'border-accent/30 bg-accent-soft shadow-sm'
 : 'border-line bg-ink/5 hover:border-line'
 }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{cycle.label}</p>
                      {cycle.badge && (
                        <span className="text-[11px] font-semibold uppercase tracking-wide bg-emerald-500/20 text-emerald-700 border border-emerald-400/30 rounded-full px-2 py-1">
                          {cycle.badge}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-base font-bold">{formatBrl(finalValue)}</p>
                    <p className="text-xs text-surface-500">{cycle.months}x de {formatBrl(finalValue / cycle.months)}</p>
                  </button>
                );
              })}
            </div>

            {!isAuthenticated && (
              <div className="mt-7 grid gap-4">
                <p className="text-xs uppercase tracking-wide text-surface-500">3. Dados para ativação</p>
                <label className="text-sm text-surface-500">
                  Nome da oficina
                  <input
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-ink/5 border border-line px-3.5 py-2.5 text-surface-50 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Ex.: Oficina Almeida"
                  />
                </label>

                <label className="text-sm text-surface-500">
                  Email para convite do MASTER
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-ink/5 border border-line px-3.5 py-2.5 text-surface-50 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="responsavel@empresa.com"
                  />
                </label>

                <label className="text-sm text-surface-500">
                  CPF do pagador (opcional, recomendado para cartao)
                  <input
                    value={document}
                    onChange={(e) => setDocument(e.target.value)}
                    className="mt-1.5 w-full rounded-xl bg-ink/5 border border-line px-3.5 py-2.5 text-surface-50 placeholder:text-surface-500 focus:outline-none focus:ring-2 focus:ring-accent"
                    placeholder="Ex.: 123.456.789-00"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-accent/30 bg-accent-soft p-6 h-fit">
            <p className="text-xs uppercase tracking-wide text-accent-ink font-bold">Resumo</p>
            <h2 className="mt-2 text-2xl font-bold">Plano {selectedPlanDef.label}</h2>
            <p className="mt-2 text-sm text-surface-500 leading-relaxed">{selectedPlanDef.description}</p>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex items-center justify-between text-surface-500">
                <span>Periodicidade</span>
                <span className="font-bold text-surface-50">{selectedCycle.label}</span>
              </div>
              <div className="flex items-center justify-between text-surface-500">
                <span>Subtotal</span>
                <span>{formatBrl(gross)}</span>
              </div>
              {selectedCycle.discountRate > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Desconto</span>
                  <span>- {formatBrl(annualDiscountValue)}</span>
                </div>
              )}
              <div className="h-px bg-ink/5" />
              <div className="flex items-center justify-between">
                <span className="text-surface-500">Total</span>
                <span className="text-2xl font-bold">{formatBrl(discountedTotal)}</span>
              </div>
              <div className="flex items-center justify-between text-surface-500">
                <span>Equivalente mensal</span>
                <span>{formatBrl(monthlyEquivalent)}/mes</span>
              </div>
            </div>

            {error && (
              <p className="mt-5 text-sm text-red-700 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={startCheckout}
              disabled={loading || (!isAuthenticated && !isPublicFormValid)}
              className="mt-6 h-12 w-full rounded-xl bg-accent text-white font-bold hover:bg-accent-hover disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
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

            <ul className="mt-5 space-y-2 text-sm text-surface-500">
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-accent-ink mt-0.5 flex-shrink-0" />
                Checkout oficial do Mercado Pago
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 size={16} className="text-accent-ink mt-0.5 flex-shrink-0" />
                Convite de ativação do MASTER enviado após confirmação
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
