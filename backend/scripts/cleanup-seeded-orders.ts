// Limpeza de O.S. criadas por código (seeds) em uma oficina, preservando as criadas à mão pelo sistema.
//
// Duas etapas, para nunca apagar no escuro:
//   1) Listar (padrão, só leitura):  npx ts-node scripts/cleanup-seeded-orders.ts <tenantId>
//      mostra cada O.S. com sinais de origem e a classificação sugerida (MANUAL ou CODIGO).
//   2) Apagar (destrutivo):           npx ts-node scripts/cleanup-seeded-orders.ts <tenantId> --apply --ids=id1,id2,...
//      só apaga os ids informados, grava backup JSON antes e roda tudo em uma transação.
//
// Sinais de que uma O.S. foi criada pelo sistema (à mão): histórico com quem criou (createdBy), número
// sequencial da oficina e linha do tempo gravada no mesmo instante da criação. Seeds costumam voltar o
// createdAt no tempo, não ter createdBy e/ou não ter linha do tempo.
import { writeFileSync } from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const [tenantId, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
const idsArg = flags.find((f) => f.startsWith('--ids='))?.slice(6);

if (!tenantId) {
  console.error('Informe o tenantId.');
  process.exit(1);
}

(async () => {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } });
  if (!tenant) throw new Error('Oficina não encontrada.');

  const orders = await prisma.serviceOrder.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    include: {
      customer: { select: { name: true } },
      vehicle: { select: { plate: true } },
      timeline: { orderBy: { createdAt: 'asc' } },
      _count: { select: { items: true } },
    },
  });

  const rows = orders.map((o) => {
    const first = o.timeline[0];
    const createdBy = first?.createdBy ?? null;
    // Gravada pelo sistema: a primeira linha do tempo nasce junto da O.S. (diferença de segundos).
    const gapMin = first ? Math.abs(new Date(first.createdAt).getTime() - new Date(o.createdAt).getTime()) / 60000 : null;
    const manual = Boolean(createdBy) && gapMin !== null && gapMin < 5;
    return {
      id: o.id,
      numero: o.number,
      status: o.status,
      criada: o.createdAt.toISOString().slice(0, 16),
      cliente: o.customer?.name,
      placa: o.vehicle?.plate,
      total: Number(o.totalCost),
      linhasTempo: o.timeline.length,
      criadoPor: createdBy ? 'usuario' : 'ninguem',
      gapPrimeiraLinhaMin: gapMin === null ? null : Math.round(gapMin),
      sugestao: manual ? 'MANUAL' : 'CODIGO',
    };
  });

  if (!apply) {
    console.log(`Oficina: ${tenant.name} (${tenant.id}) — ${rows.length} O.S.`);
    console.table(rows);
    const code = rows.filter((r) => r.sugestao === 'CODIGO');
    console.log(`\nSugestão: ${code.length} por código, ${rows.length - code.length} manuais.`);
    console.log('Confira a tabela. Para apagar, rode de novo com --apply --ids=<ids separados por vírgula>.');
    return;
  }

  const ids = (idsArg ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error('Informe --ids=... com as O.S. a apagar.');
  const targets = orders.filter((o) => ids.includes(o.id));
  if (targets.length !== ids.length) throw new Error('Algum id não pertence a esta oficina.');

  // Backup completo antes de qualquer exclusão.
  const full = await prisma.serviceOrder.findMany({
    where: { id: { in: ids }, tenantId },
    include: { items: true, timeline: true, commissions: true, checklists: { include: { items: true } } },
  });
  const file = `backup-os-${tenantId.slice(0, 8)}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  writeFileSync(file, JSON.stringify(full, null, 2));
  console.log(`Backup gravado em ${file} (${full.length} O.S.).`);

  await prisma.$transaction(async (tx) => {
    await tx.commission.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await tx.financialTransaction.deleteMany({ where: { tenantId, referenceType: 'service_order', referenceId: { in: ids } } });
    await tx.engineMetrology.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await tx.npsResponse.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await tx.serviceOrderItem.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await tx.serviceOrderTimeline.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await tx.vehicleChecklist.deleteMany({ where: { serviceOrderId: { in: ids } } });
    const r = await tx.serviceOrder.deleteMany({ where: { id: { in: ids }, tenantId } });
    console.log(`Apagadas ${r.count} O.S.`);
  });
})()
  .catch((e) => { console.error(e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());
