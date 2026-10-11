// Gera o HTML do documento de uma O.S. paga de exemplo (marca d'água + sinete) em /tmp para conferência visual.
// Uso: npx ts-node scripts/paid-doc-preview.ts <os|entrega> <saida.html>
import { writeFileSync } from 'fs';
import { OrderDocumentsService } from '../src/service-orders/order-documents.service';

const kind = (process.argv[2] || 'os') as any;
const out = process.argv[3] || 'preview.html';
const paid = process.argv[4] !== 'unpaid';

const order: any = {
  id: 'o1', tenantId: 't1', number: 123, createdAt: new Date('2026-10-01T12:00:00Z'), approvedAt: new Date('2026-10-02T12:00:00Z'),
  completedAt: new Date('2026-10-08T12:00:00Z'), deliveredAt: new Date('2026-10-09T12:00:00Z'), deliveredTo: 'Charles Souza', deliveryAuthorizedBy: 'Charles Souza',
  status: 'FATURADO', orderType: 'ORDEM_SERVICO', paidAt: paid ? new Date('2026-10-08T15:00:00Z') : null,
  paymentMethod: 'PIX', asaasPaymentId: 'pay_1', asaasPaidAt: paid ? new Date('2026-10-08T15:00:00Z') : null,
  totalServices: 360, totalLabor: 0, totalParts: 250, totalDiscount: 0, totalCost: 610, complaint: 'Barulho na suspensão', diagnosis: 'Pivô gasto', technicalReport: 'Troca do pivô e alinhamento',
  customer: { name: 'Charles Vasconcelos de Souza', document: '123.456.789-09', phone: '(11) 98877-6600', email: 'c@x.com' },
  vehicle: { plate: 'ABC1D23', brand: 'VW', model: 'Gol 1.6', year: 2018, color: 'Prata' },
  tenant: { name: 'Auto Center Silva', phone: '(11) 3333-4444', email: 'contato@silva.com', taxId: '12.345.678/0001-90', address: 'Rua A, 100' },
  mechanic: { name: 'Rafael' },
  checklists: [],
  items: [
    { id: 'i1', type: 'service', description: 'Alinhamento e balanceamento', quantity: 1, unitPrice: 180, discount: 0, totalPrice: 180, createdAt: new Date(), assignedUser: { name: 'Rafael' } },
    { id: 'i2', type: 'service', description: 'Mão de obra pivô', quantity: 1, unitPrice: 180, discount: 0, totalPrice: 180, createdAt: new Date(), assignedUser: { name: 'Rafael' } },
    { id: 'i3', type: 'part', description: 'Pivô de suspensão (par)', quantity: 1, unitPrice: 250, discount: 0, totalPrice: 250, createdAt: new Date(), part: { supplier: { name: 'Auto Peças' } } },
  ],
};

const prisma: any = {
  serviceOrder: { findFirst: async () => order },
  user: { findFirst: async () => ({ name: 'Charles' }) },
  vehicleChecklist: { findFirst: async () => null },
};
const pdf: any = { renderHtml: async (html: string) => { writeFileSync(out, html); return Buffer.from('ok'); } };

new OrderDocumentsService(prisma, pdf).generate('t1', 'o1', kind, 'u1').then(() => console.log('html em', out)).catch((e) => { console.error(e); process.exit(1); });
