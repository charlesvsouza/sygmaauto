// Limpeza de O.S. criadas por código (seeds) em uma oficina, preservando as criadas à mão pelo sistema.
// Roda DENTRO do container da API (o banco só tem rede interna):
//
//   1) Listar (só leitura):
//      node cleanup-seeded-orders.js <tenantId|nome da oficina>
//   2) Apagar (destrutivo), só os ids escolhidos:
//      node cleanup-seeded-orders.js <tenantId|nome da oficina> --apply --ids=id1,id2,...
//   2b) Apagar tudo da oficina EXCETO os números informados (primeiro sem --apply, para ver o que seria apagado):
//      node cleanup-seeded-orders.js <tenantId|nome da oficina> --all-except=43
//      node cleanup-seeded-orders.js <tenantId|nome da oficina> --all-except=43 --apply
//   2c) Igual ao 2b, mas pelos IDS das O.S. a manter (mais seguro que o numero):
//      node cleanup-seeded-orders.js <tenantId|nome da oficina> --all-except-ids=id1,id2,...  [--apply]
//
// Antes de apagar, copia as linhas para tabelas de backup no próprio banco (backup_os_<data>_*),
// e faz tudo em uma transação. Nada é apagado sem --apply e sem a lista explícita de ids.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const [tenantArg, ...flags] = process.argv.slice(2);
const apply = flags.includes('--apply');
const idsArg = (flags.find((f) => f.startsWith('--ids=')) || '').slice(6);
const exceptArg = (flags.find((f) => f.startsWith('--all-except=')) || '').slice(13);
const exceptIdsArg = (flags.find((f) => f.startsWith('--all-except-ids=')) || '').slice(17);

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

  // Modo "apagar tudo menos estes IDS": os ids a manter vêm da tabela conferida pelo usuário.
  let exceptIds = null;
  if (exceptIdsArg) {
    const keepIds = exceptIdsArg.split(',').map((x) => x.trim()).filter(Boolean);
    const keptRows = rows.filter((r) => keepIds.includes(r.id));
    const absent = keepIds.filter((id) => !rows.some((r) => r.id === id));
    console.log(`Oficina: ${tenant.name} (${tenantId}) - ${rows.length} O.S. hoje`);
    console.log(`MANTIDAS (${keptRows.length} de ${keepIds.length} pedidas):`);
    console.table(keptRows);
    if (absent.length) console.log('IDs pedidos que NAO existem mais (ignorados): ' + absent.join(', '));
    const gone = orders.filter((o) => !keepIds.includes(o.id));
    exceptIds = gone.map((o) => o.id);
    console.log(`SERIAM APAGADAS: ${gone.length} de ${orders.length} O.S. (numeros: ${gone.map((o) => o.number).join(', ')})`);
    if (!apply) {
      console.log('Nada foi apagado. Para apagar, rode o mesmo comando com --apply no final.');
      return;
    }
  }

  // Modo "apagar tudo menos estes números": os ids saem do banco, não de uma lista digitada.
  if (exceptArg && !exceptIdsArg) {
    const keep = exceptArg.split(',').map((n) => Number(n.trim())).filter((n) => Number.isInteger(n));
    if (keep.length === 0) throw new Error('--all-except precisa de numeros de O.S., ex.: --all-except=43');
    const kept = orders.filter((o) => keep.includes(o.number));
    const missing = keep.filter((n) => !kept.some((o) => o.number === n));
    if (missing.length) {
      console.log('Numeros que existem hoje nesta oficina: ' + orders.map((o) => o.number).join(', '));
      throw new Error('Nao existe O.S. com o numero: ' + missing.join(', '));
    }
    exceptIds = orders.filter((o) => !keep.includes(o.number)).map((o) => o.id);
    console.log(`Oficina: ${tenant.name} (${tenantId})`);
    console.log(`MANTIDAS (${kept.length}):`);
    console.table(rows.filter((r) => keep.includes(r.numero)));
    console.log(`SERIAM APAGADAS: ${exceptIds.length} de ${orders.length} O.S. (numeros: ${orders.filter((o) => !keep.includes(o.number)).map((o) => o.number).join(', ')})`);
    if (!apply) {
      console.log('Nada foi apagado. Para apagar, rode o mesmo comando com --apply no final.');
      return;
    }
  }

  if (!apply) {
    console.log(`Oficina: ${tenant.name} (${tenantId}) - ${rows.length} O.S.`);
    console.table(rows);
    const code = rows.filter((r) => r.sugestao === 'CODIGO').length;
    console.log(`\nSugestao: ${code} por codigo, ${rows.length - code} manuais.`);
    console.log('IDs sugeridos como CODIGO (copie se concordar):');
    console.log(rows.filter((r) => r.sugestao === 'CODIGO').map((r) => r.id).join(','));
    return;
  }

  const ids = exceptIds || idsArg.split(',').map((s) => s.trim()).filter(Boolean);
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
