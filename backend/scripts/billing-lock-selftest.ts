// Autoteste da trava de faturamento e do estorno em 12 h. Uso: npx ts-node scripts/billing-lock-selftest.ts
import assert from 'assert';
import { ServiceOrdersService } from '../src/service-orders/service-orders.service';

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000);
const base: any = {
  id: 'o1', tenantId: 't1', number: 5, createdAt: hoursAgo(80), orderType: 'ORDEM_SERVICO', totalCost: 100,
  status: 'FATURADO', paidAt: hoursAgo(2), asaasPaymentId: null, asaasPaidAt: null, asaasChargeStatus: null, items: [],
};
let current: any = { ...base };
const calls: string[] = [];
const tx: any = {
  financialTransaction: { deleteMany: async () => { calls.push('receita removida'); } },
  commission: { deleteMany: async () => { calls.push('comissoes removidas'); } },
  serviceOrder: { update: async ({ data }: any) => { calls.push('os ' + data.status); } },
  auditLog: { create: async () => { calls.push('auditoria'); } },
};
const prisma: any = {
  serviceOrder: { findFirst: async () => current },
  commission: { count: async () => 0 },
  serviceOrderTimeline: { create: async () => {} },
  $transaction: async (fn: any) => fn(tx),
};
const svc = new ServiceOrdersService(prisma, {} as any, {} as any, {} as any);

(async () => {
  // Faturada: nenhuma mudança de status (nem para trás, nem cancelar), só FATURADO -> ENTREGUE.
  for (const to of ['PRONTO_ENTREGA', 'CANCELADO', 'EM_EXECUCAO']) {
    await assert.rejects(() => svc.updateStatus('t1', 'o1', { status: to, adminOverride: true } as any, 'u1'), /já foi faturada/, to);
  }
  await assert.rejects(() => svc.delete('t1', 'o1', 'u1', 'x'), /já foi faturada/);

  // Estorno exige motivo.
  await assert.rejects(() => svc.reverseBilling('t1', 'o1', '  ', 'u1'), /motivo/);

  // Dentro de 12 h: estorna.
  await svc.reverseBilling('t1', 'o1', 'Pagamento lançado por engano', 'u1');
  assert.deepStrictEqual(calls, ['receita removida', 'comissoes removidas', 'os PRONTO_ENTREGA', 'auditoria']);

  // Depois de 12 h: recusa e manda seguir os procedimentos legais.
  current = { ...base, paidAt: hoursAgo(13) };
  await assert.rejects(() => svc.reverseBilling('t1', 'o1', 'tarde', 'u1'), /procedimentos legais/);

  // Pago pelo Asaas: só estorna depois que o Asaas avisar o estorno.
  current = { ...base, asaasPaymentId: 'pay_1', asaasPaidAt: hoursAgo(1), asaasChargeStatus: 'RECEIVED' };
  await assert.rejects(() => svc.reverseBilling('t1', 'o1', 'motivo', 'u1'), /Asaas/);

  // Não faturada: nada a estornar.
  current = { ...base, paidAt: null, status: 'PRONTO_ENTREGA' };
  await assert.rejects(() => svc.reverseBilling('t1', 'o1', 'motivo', 'u1'), /faturada/);
  console.log('billing lock selftest OK');
})().catch((e) => { console.error(e); process.exit(1); });
