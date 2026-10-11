// Autoteste do modo Asaas sem banco nem rede: cofre de segredo + webhook (token, idempotência, faturamento).
// Uso: npx ts-node scripts/asaas-selftest.ts
import assert from 'assert';
import { decryptSecret, encryptSecret } from '../src/common/secret-box';
import { AsaasService } from '../src/asaas/asaas.service';

const enc = encryptSecret('chave-secreta');
assert.notStrictEqual(enc, 'chave-secreta');
assert.strictEqual(decryptSecret(enc), 'chave-secreta');

const order: any = { id: 'o1', tenantId: 't1', status: 'PRONTO_ENTREGA', asaasPaymentId: 'pay_1', asaasBillingType: 'PIX', asaasPaidAt: null };
const calls: string[] = [];
const prisma: any = {
  asaasAccount: { findUnique: async () => ({ webhookToken: 'tok' }) },
  serviceOrder: {
    findFirst: async () => ({ ...order }),
    update: async ({ data }: any) => { Object.assign(order, data); calls.push('update:' + Object.keys(data).join(',')); },
  },
  serviceOrderTimeline: { create: async () => { calls.push('timeline'); } },
};
const serviceOrders: any = { updateStatus: async (_t: string, _id: string, dto: any) => { calls.push('status:' + dto.status); order.status = dto.status; } };
const svc = new AsaasService(prisma, { get: () => undefined } as any, serviceOrders);

(async () => {
  await assert.rejects(() => svc.handleWebhook('t1', 'errado', {}), /não autorizado/);
  await svc.handleWebhook('t1', 'tok', { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', status: 'RECEIVED', billingType: 'PIX' } });
  assert.ok(calls.includes('status:FATURADO'), 'deve faturar a O.S.');
  assert.strictEqual(order.paymentMethod, 'PIX');
  const faturou = calls.filter((c) => c === 'status:FATURADO').length;
  // reentrega do mesmo evento não fatura de novo
  await svc.handleWebhook('t1', 'tok', { event: 'PAYMENT_RECEIVED', payment: { id: 'pay_1', status: 'RECEIVED', billingType: 'PIX' } });
  assert.strictEqual(calls.filter((c) => c === 'status:FATURADO').length, faturou, 'idempotente');
  console.log('asaas selftest OK');
})().catch((e) => { console.error(e); process.exit(1); });
