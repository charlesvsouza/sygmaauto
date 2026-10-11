// Limpeza de O.S. criadas por código (seeds) em uma oficina, preservando as criadas à mão pelo sistema.
// Roda DENTRO do container da API (o banco só tem rede interna):
//
//   1) Listar (só leitura):
//      node cleanup-seeded-orders.js <tenantId|nome da oficina>
//   2) Apagar (destrutivo), só os ids escolhidos:
//      node cleanup-seeded-orders.js <tenantId|nome da oficina> --apply --ids=id1,id2,...
//
// Antes de apagar, copia as linhas para tabelas de backup no próprio banco (backup_os_<data>_*),
// e faz tudo em uma transação. Nada é apagado sem --apply e sem a lista explícita de ids.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const [tenantArg, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
const idsArg = (flags.find((f) => f.startsWith('--ids=')) || '').slice(6);

async function findTenant() {
  const all = await prisma.tenant.findMany({ select: { id: true, name: true } });
  if (!tenantArg) {
    console.log('Oficinas:');
    console.table(all);
    throw new Error('Informe o tenantId ou o nome da oficina.');
  }
  const hit = all.filter((t) => t.id === tenantArg || t.name.toLowerCase().includes(tenantArg.toLowerCase()));
  if (hit.length !== 1) {
    console.table(all);
    throw new Error(hit.length === 0 ? 'Oficina não encontrada.' : 'Mais de uma oficina combina: use o id.');
  }
  return hit[0];
}

(async () => {
  const tenant = await findTenant();
  const tenantId = tenant.id;

  const orders = await prisma.serviceOrder.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'asc' },
    include: {
      customer: { select: { name: true } },
      vehicle: { select: { plate: true } },
      timeline: { orderBy: { createdAt: 'asc' } },
    },
  });

  const rows = orders.map((o) => {
    const first = o.timeline[0];
    const createdBy = first ? first.createdBy : null;
    // Criada pelo sistema: a primeira linha do tempo nasce junto da O.S., com o usuário que a criou.
    const gapMin = first ? Math.abs(new Date(first.createdAt).getTime() - new Date(o.createdAt).getTime()) / 60000 : null;
    const manual = Boolean(createdBy) && gapMin !== null && gapMin < 5;
    return {
      id: o.id,
      numero: o.number,
      status: o.status,
      criada: o.createdAt.toISOString().slice(0, 16),
      cliente: o.customer ? o.customer.name : null,
      placa: o.vehicle ? o.vehicle.plate : null,
      total: Number(o.totalCost),
      historico: o.timeline.length,
      criadoPor: createdBy ? 'usuario' : 'ninguem',
      gapMin: gapMin === null ? null : Math.round(gapMin),
      sugestao: manual ? 'MANUAL' : 'CODIGO',
    };
  });

  if (!apply) {
    console.log(`Oficina: ${tenant.name} (${tenantId}) - ${rows.length} O.S.`);
    console.table(rows);
    const code = rows.filter((r) => r.sugestao === 'CODIGO').length;
    console.log(`\nSugestao: ${code} por codigo, ${rows.length - code} manuais.`);
    console.log('IDs sugeridos como CODIGO (copie se concordar):');
    console.log(rows.filter((r) => r.sugestao === 'CODIGO').map((r) => r.id).join(','));
    return;
  }

  const ids = idsArg.split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) throw new Error('Informe --ids=... com as O.S. a apagar.');
  const own = new Set(orders.map((o) => o.id));
  const foreign = ids.filter((id) => !own.has(id));
  if (foreign.length) throw new Error('Ids que nao pertencem a esta oficina: ' + foreign.join(','));

  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  const list = ids.map((id) => `'${id.replace(/'/g, '')}'`).join(',');
  const tx = [
    `CREATE TABLE backup_os_${stamp}_orders AS SELECT * FROM service_orders WHERE id IN (${list})`,
    `CREATE TABLE backup_os_${stamp}_items AS SELECT * FROM service_order_items WHERE "serviceOrderId" IN (${list})`,
    `CREATE TABLE backup_os_${stamp}_timeline AS SELECT * FROM service_order_timeline WHERE "serviceOrderId" IN (${list})`,
    `CREATE TABLE backup_os_${stamp}_finance AS SELECT * FROM financial_transactions WHERE "referenceType" = 'service_order' AND "referenceId" IN (${list})`,
  ];
  for (const sql of tx) await prisma.$executeRawUnsafe(sql);
  console.log(`Backup no banco: tabelas backup_os_${stamp}_orders / _items / _timeline / _finance`);

  await prisma.$transaction(async (t) => {
    await t.commission.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await t.financialTransaction.deleteMany({ where: { tenantId, referenceType: 'service_order', referenceId: { in: ids } } });
    await t.engineMetrology.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await t.npsResponse.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await t.serviceOrderItem.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await t.serviceOrderTimeline.deleteMany({ where: { serviceOrderId: { in: ids } } });
    await t.vehicleChecklist.deleteMany({ where: { serviceOrderId: { in: ids } } });
    const r = await t.serviceOrder.deleteMany({ where: { id: { in: ids }, tenantId } });
    console.log(`Apagadas ${r.count} O.S.`);
  });
})()
  .catch((e) => { console.error('ERRO:', e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
