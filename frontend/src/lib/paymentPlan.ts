// Cópia de backend/src/service-orders/payment-plan.ts, só para pré-visualizar o
// parcelamento na tela. O backend recalcula e valida — mantenha os dois iguais.

export const PAYMENT_PLAN_METHODS = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de Crédito',
  CARTAO_DEBITO: 'Cartão de Débito',
  DINHEIRO: 'Dinheiro',
  BOLETO: 'Boleto',
  TRANSFERENCIA: 'Transferência Bancária',
  CHEQUE: 'Cheque',
} as const;
export type PaymentPlanMethod = keyof typeof PAYMENT_PLAN_METHODS;

export type PaymentPlanScope = 'TOTAL' | 'PECAS' | 'SERVICOS';
export const PAYMENT_PLAN_SCOPE_LABEL: Record<PaymentPlanScope, string> = {
  TOTAL: 'Total',
  PECAS: 'Peças',
  SERVICOS: 'Serviços',
};

export const MAX_INSTALLMENTS = 12;
export const DEFAULT_INTERVAL_DAYS = 30;

export interface PaymentPlanGroup {
  scope: PaymentPlanScope;
  method: PaymentPlanMethod;
  // Quantidade total de parcelas, contando a entrada.
  installments: number;
  // true: a 1ª parcela é paga no ato (à vista); as demais vencem a cada intervalo.
  // false: a 1ª parcela já vence após um intervalo.
  downPayment: boolean;
  intervalDays: number;
}

export interface PaymentPlan {
  // false: um grupo TOTAL. true: um grupo PECAS e um SERVICOS.
  split: boolean;
  groups: PaymentPlanGroup[];
}

export interface ScheduledInstallment {
  scope: PaymentPlanScope;
  method: PaymentPlanMethod;
  number: number;
  of: number;
  amount: number;
  dueDate: Date;
  upfront: boolean;
}

export class PaymentPlanError extends Error {}

const isMethod = (m: unknown): m is PaymentPlanMethod =>
  typeof m === 'string' && Object.prototype.hasOwnProperty.call(PAYMENT_PLAN_METHODS, m);

// Valida e normaliza o que vem do cliente. null/undefined = sem plano.
export function parsePaymentPlan(raw: unknown): PaymentPlan | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw !== 'object') throw new PaymentPlanError('Plano de pagamento inválido.');
  const { split, groups } = raw as any;
  if (!Array.isArray(groups)) throw new PaymentPlanError('Plano de pagamento sem grupos.');

  const expected: PaymentPlanScope[] = split ? ['PECAS', 'SERVICOS'] : ['TOTAL'];
  const normalized = expected.map((scope) => {
    const g = groups.find((x: any) => x?.scope === scope);
    if (!g) throw new PaymentPlanError(`Plano de pagamento sem a parte "${PAYMENT_PLAN_SCOPE_LABEL[scope]}".`);
    if (!isMethod(g.method)) throw new PaymentPlanError('Forma de pagamento inválida no plano.');
    const installments = Number(g.installments);
    if (!Number.isInteger(installments) || installments < 1 || installments > MAX_INSTALLMENTS) {
      throw new PaymentPlanError(`Número de parcelas deve ser de 1 a ${MAX_INSTALLMENTS}.`);
    }
    const intervalDays = g.intervalDays === undefined ? DEFAULT_INTERVAL_DAYS : Number(g.intervalDays);
    if (!Number.isInteger(intervalDays) || intervalDays < 1 || intervalDays > 120) {
      throw new PaymentPlanError('Intervalo entre parcelas deve ser de 1 a 120 dias.');
    }
    return { scope, method: g.method, installments, downPayment: g.downPayment !== false, intervalDays };
  });
  return { split: !!split, groups: normalized };
}

// Há algo pago depois do ato? (parcelas ou 1x a prazo) — nesse caso não cabe desconto.
export function planHasInstallments(plan: PaymentPlan | null | undefined): boolean {
  return !!plan?.groups.some((g) => g.installments > 1 || !g.downPayment);
}

function groupLabel(g: PaymentPlanGroup): string {
  const method = PAYMENT_PLAN_METHODS[g.method];
  if (g.installments === 1) return g.downPayment ? `${method} à vista` : `${method} em ${g.intervalDays} dias`;
  if (g.downPayment) return `${method} ${g.installments}x (1 à vista + ${g.installments - 1} a cada ${g.intervalDays} dias)`;
  return `${method} ${g.installments}x a cada ${g.intervalDays} dias`;
}

// Texto curto gravado em ServiceOrder.paymentMethod (listas, relatórios, documentos antigos).
export function describePaymentPlan(plan: PaymentPlan): string {
  if (!plan.split) return groupLabel(plan.groups[0]);
  return plan.groups.map((g) => `${PAYMENT_PLAN_SCOPE_LABEL[g.scope]}: ${groupLabel(g)}`).join(' · ');
}

const toCents = (v: number) => Math.round(Number(v || 0) * 100);

// Quanto do total da O.S. cabe a peças e a serviços. Peças levam o próprio desconto %;
// serviços ficam com o resto (inclui mão de obra e crédito de diagnóstico), de modo que
// as duas partes sempre somam exatamente o total.
export function splitOrderTotal(order: {
  totalParts?: number | null;
  totalCost?: number | null;
  discountPartsPercent?: number | null;
}): { total: number; parts: number; services: number } {
  const totalCents = Math.max(0, toCents(order.totalCost ?? 0));
  const partsNet = Number(order.totalParts || 0) * (1 - Number(order.discountPartsPercent || 0) / 100);
  const partsCents = Math.min(totalCents, Math.max(0, toCents(partsNet)));
  return { total: totalCents / 100, parts: partsCents / 100, services: (totalCents - partsCents) / 100 };
}

const addDays = (d: Date, days: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

// Divide o valor de cada grupo em parcelas iguais; os centavos que sobram vão na 1ª.
export function buildInstallments(
  plan: PaymentPlan,
  order: { totalParts?: number | null; totalCost?: number | null; discountPartsPercent?: number | null },
  baseDate: Date = new Date(),
): ScheduledInstallment[] {
  const { total, parts, services } = splitOrderTotal(order);
  const amountOf: Record<PaymentPlanScope, number> = { TOTAL: total, PECAS: parts, SERVICOS: services };
  const out: ScheduledInstallment[] = [];
  for (const g of plan.groups) {
    const cents = toCents(amountOf[g.scope]);
    const each = Math.floor(cents / g.installments);
    const first = cents - each * (g.installments - 1);
    for (let i = 0; i < g.installments; i++) {
      const offset = (g.downPayment ? i : i + 1) * g.intervalDays;
      out.push({
        scope: g.scope,
        method: g.method,
        number: i + 1,
        of: g.installments,
        amount: (i === 0 ? first : each) / 100,
        dueDate: addDays(baseDate, offset),
        upfront: offset === 0,
      });
    }
  }
  return out;
}

// Parte já quitada no faturamento: o que vence no ato e todo o cartão de crédito
// (a operadora paga a oficina; quem parcela é o cliente com o cartão).
export function settledAtBilling(installments: ScheduledInstallment[]): number {
  const cents = installments
    .filter((i) => i.upfront || i.method === 'CARTAO_CREDITO')
    .reduce((s, i) => s + toCents(i.amount), 0);
  return cents / 100;
}
