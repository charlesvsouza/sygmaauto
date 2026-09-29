import { cn } from '../lib/utils';
import {
  buildInstallments,
  DEFAULT_INTERVAL_DAYS,
  MAX_INSTALLMENTS,
  PAYMENT_PLAN_METHODS,
  PAYMENT_PLAN_SCOPE_LABEL,
  splitOrderTotal,
  type PaymentPlan,
  type PaymentPlanGroup,
  type PaymentPlanMethod,
  type PaymentPlanScope,
} from '../lib/paymentPlan';

// Forma de pagamento antiga (texto livre) → método do plano, para abrir O.S. legadas.
const LEGACY_METHOD: Record<string, PaymentPlanMethod> = {
  Dinheiro: 'DINHEIRO',
  PIX: 'PIX',
  'Cartao de Debito': 'CARTAO_DEBITO',
  'Cartao de Credito': 'CARTAO_CREDITO',
  'Transferencia Bancaria': 'TRANSFERENCIA',
  Boleto: 'BOLETO',
  Cheque: 'CHEQUE',
};

const newGroup = (scope: PaymentPlanScope, method: PaymentPlanMethod = 'PIX'): PaymentPlanGroup => ({
  scope,
  method,
  installments: 1,
  downPayment: true,
  intervalDays: DEFAULT_INTERVAL_DAYS,
});

export function initialPaymentPlan(order: { paymentPlan?: any; paymentMethod?: string | null }): PaymentPlan | null {
  if (order.paymentPlan && Array.isArray(order.paymentPlan.groups)) return order.paymentPlan as PaymentPlan;
  const legacy = order.paymentMethod ? LEGACY_METHOD[order.paymentMethod] : undefined;
  return legacy ? { split: false, groups: [newGroup('TOTAL', legacy)] } : null;
}

const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const DAY_MS = 86_400_000;

interface Props {
  plan: PaymentPlan | null;
  onChange: (plan: PaymentPlan) => void;
  order: { totalParts?: number; totalCost?: number; discountPartsPercent?: number; paidAt?: string | null };
  legacyMethod?: string | null;
  disabled?: boolean;
}

export function PaymentPlanEditor({ plan, onChange, order, legacyMethod, disabled }: Props) {
  const amounts = splitOrderTotal(order);
  const amountOf: Record<PaymentPlanScope, number> = { TOTAL: amounts.total, PECAS: amounts.parts, SERVICOS: amounts.services };

  const setSplit = (split: boolean) => {
    const method = plan?.groups[0]?.method ?? 'PIX';
    onChange(split
      ? { split: true, groups: [newGroup('PECAS', method), newGroup('SERVICOS', method)] }
      : { split: false, groups: [newGroup('TOTAL', method)] });
  };

  const updateGroup = (scope: PaymentPlanScope, patch: Partial<PaymentPlanGroup>) => {
    const base = plan ?? { split: false, groups: [newGroup('TOTAL')] };
    onChange({ ...base, groups: base.groups.map((g) => (g.scope === scope ? { ...g, ...patch } : g)) });
  };

  const groups = plan?.groups ?? [];
  const base = order.paidAt ? new Date(order.paidAt) : new Date();
  const schedule = plan ? buildInstallments(plan, order, base) : [];
  const dueLabel = (d: Date, upfront: boolean) => {
    if (upfront) return 'No ato';
    if (order.paidAt) return d.toLocaleDateString('pt-BR');
    return `${Math.round((d.getTime() - base.getTime()) / DAY_MS)} dias`;
  };

  const fieldCls = 'w-full px-2 py-1.5 rounded-lg border border-surface-800 bg-white text-[10px] font-bold text-surface-300 disabled:bg-surface-900 disabled:cursor-not-allowed';

  return (
    <div className="space-y-3">
      {!plan && legacyMethod && (
        <p className="text-[10px] font-bold text-surface-500">Registrado: {legacyMethod}. Escolha abaixo para montar o plano.</p>
      )}

      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-surface-900" role="group" aria-label="Dividir pagamento">
        {[
          { split: false, label: 'Valor total' },
          { split: true, label: 'Peças + Serviços' },
        ].map((opt) => (
          <button
            key={opt.label}
            type="button"
            disabled={disabled}
            aria-pressed={!!plan && plan.split === opt.split}
            onClick={() => setSplit(opt.split)}
            className={cn(
              'px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wide transition-all disabled:cursor-not-allowed',
              plan && plan.split === opt.split ? 'bg-white text-surface-100 shadow' : 'text-surface-500 hover:text-surface-300',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {(groups.length ? groups : [newGroup('TOTAL')]).map((g) => {
        const active = groups.length > 0;
        return (
          <div key={g.scope} className={cn('space-y-2', plan?.split && 'rounded-xl border border-surface-800 p-2.5')}>
            {plan?.split && (
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wide text-surface-400">
                <span>{PAYMENT_PLAN_SCOPE_LABEL[g.scope]}</span>
                <span>{brl(amountOf[g.scope])}</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(PAYMENT_PLAN_METHODS) as PaymentPlanMethod[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  disabled={disabled}
                  onClick={() => updateGroup(g.scope, { method: m })}
                  className={cn(
                    'px-2.5 py-2 rounded-xl text-[9px] font-bold uppercase tracking-wide transition-all border text-left leading-tight disabled:cursor-not-allowed',
                    active && g.method === m
                      ? 'bg-accent text-white border-accent shadow-lg'
                      : 'bg-white border-surface-800 text-surface-400 hover:border-surface-600',
                  )}
                >
                  {PAYMENT_PLAN_METHODS[m]}
                </button>
              ))}
            </div>

            {active && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="text-[9px] font-bold text-surface-500 uppercase">Parcelas</span>
                    <select
                      disabled={disabled}
                      value={g.installments}
                      onChange={(e) => updateGroup(g.scope, { installments: Number(e.target.value) })}
                      className={fieldCls}
                    >
                      {Array.from({ length: MAX_INSTALLMENTS }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>{n === 1 ? '1x (à vista)' : `${n}x`}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[9px] font-bold text-surface-500 uppercase">Intervalo</span>
                    <select
                      disabled={disabled || (g.installments === 1 && g.downPayment)}
                      value={g.intervalDays}
                      onChange={(e) => updateGroup(g.scope, { intervalDays: Number(e.target.value) })}
                      className={fieldCls}
                    >
                      {[7, 10, 14, 15, 20, 21, 28, 30, 45, 60].map((d) => (
                        <option key={d} value={d}>{d} dias</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label className="flex items-center gap-2 text-[10px] font-bold text-surface-400 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={disabled}
                    checked={g.downPayment}
                    onChange={(e) => updateGroup(g.scope, { downPayment: e.target.checked })}
                    className="rounded border-surface-700"
                  />
                  1ª parcela à vista (entrada no ato)
                </label>
              </>
            )}
          </div>
        );
      })}

      {schedule.length > 1 || schedule.some((i) => !i.upfront) ? (
        <div className="rounded-xl border border-surface-800 bg-white overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-surface-900 text-surface-500 uppercase">
              <tr>
                <th className="px-2 py-1.5 text-left font-bold">Parcela</th>
                <th className="px-2 py-1.5 text-left font-bold">{order.paidAt ? 'Vencimento' : 'Prazo'}</th>
                <th className="px-2 py-1.5 text-right font-bold">Valor</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((i) => (
                <tr key={`${i.scope}-${i.number}`} className="border-t border-surface-900 text-surface-300 font-bold">
                  <td className="px-2 py-1.5">
                    {plan?.split && <span className="text-surface-500">{PAYMENT_PLAN_SCOPE_LABEL[i.scope]} </span>}
                    {i.number}/{i.of}
                    <span className="block text-[9px] font-medium text-surface-500">{PAYMENT_PLAN_METHODS[i.method]}</span>
                  </td>
                  <td className="px-2 py-1.5">{dueLabel(i.dueDate, i.upfront)}</td>
                  <td className="px-2 py-1.5 text-right tabular-nums">{brl(i.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!order.paidAt && (
            <p className="px-2 py-1.5 text-[9px] text-surface-500 border-t border-surface-900">Prazos contados a partir do faturamento.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
