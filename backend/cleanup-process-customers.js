// Apaga os clientes de teste "Cliente Processo NNN" (criados por script) de UMA oficina, com os veículos e as
// O.S. deles. Roda DENTRO do container da API. Só altera dados com --apply.
//
//   1) Simular (só leitura, padrão):
//      node cleanup-process-customers.js <tenantId> --from=1 --to=45
//   2) Apagar, informando QUANTOS clientes você espera apagar (trava contra erro de argumento):
//      node cleanup-process-customers.js <tenantId> --from=1 --to=45 --expect=45 --apply
//
// Não use vírgulas nos argumentos (o PowerShell as corta). Antes de apagar, copia TODAS as linhas afetadas para
// tabelas bkp_cli_<data>_* no schema os_backups (inclui comissões, checklists, fotos, metrologia e NPS).
// Só apaga clientes cujo nome é exatamente "Cliente Processo " + 3 dígitos dentro de [from, to].
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const [tenantId, ...flags] = process.argv.slice(2);
const arg = (n) => (flags.find((f) => f.startsWith(`--${n}=`)) || '').slice(n.length + 3);
const apply = flags.includes('--apply');
const from = Number(arg('from') || 1);
const to = Number(arg('to') || 45);
const expect = arg('expect') === '' ? null : Number(arg('expect'));
const q = (sql) => prisma.$queryRawUnsafe(sql);
const list = (ids) => ids.map((i) => `'${String(i).replace(/'/g, '')}'`).join(',');

(async () => {
  if (!tenantId) throw new Error('Informe o tenantId da oficina.');
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) throw new Error('Use --from=1 --to=45 (numeros inteiros).');
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true } });
  if (!tenant) throw new Error('Oficina nao encontrada (use o id exato).');

  const all = await prisma.customer.findMany({ where: { tenantId, name: { startsWith: 'Cliente Processo ' } } });
  const targets = all
    .map((c) => ({ c, m: /^Cliente Processo (\d{3})$/.exec(c.name) }))
    .filter((x) => x.m && Number(x.m[1]) >= from && Number(x.m[1]) <= to)
    .map((x) => x.c)
    .sort((a, b) => a.name.localeCompare(b.name));
  const cIds = targets.map((c) => c.id);

  const vehicles = cIds.length ? await prisma.vehicle.findMany({ where: { customerId: { in: cIds } }, select: { id: true } }) : [];
  const vIds = vehicles.map((v) => v.id);
  const orders = cIds.length ? await prisma.serviceOrder.findMany({ where: { tenantId, customerId: { in: cIds } }, select: { id: true, number: true, status: true, customerId: true, totalCost: true } }) : [];
  const oIds = orders.map((o) => o.id);

  // Proteção: nenhuma O.S. de OUTRO cliente pode usar um veículo que vai ser apagado.
  const foreign = vIds.length ? await prisma.serviceOrder.findMany({ where: { vehicleId: { in: vIds }, customerId: { notIn: cIds } }, select: { number: true } }) : [];
  if (foreign.length) throw new Error('Veiculo de cliente de teste usado em O.S. de outro cliente (numeros ' + foreign.map((o) => o.number).join(', ') + '). Nada apagado.');

  console.log(`Oficina: ${tenant.name} (${tenant.id})`);
  console.log(`Clientes "Cliente Processo ${String(from).padStart(3, '0')}" a "${String(to).padStart(3, '0')}" encontrados: ${targets.length}`);
  console.table(targets.map((c) => {
    const os = orders.filter((o) => o.customerId === c.id);
    return { cliente: c.name, id: c.id, os: os.length, numerosOS: os.map((o) => o.number).join(' ') };
  }));
  const counts = await Promise.all([
    q(`SELECT count(*)::int n FROM service_order_items WHERE "serviceOrderId" IN (${oIds.length ? list(oIds) : "''"})`),
    q(`SELECT count(*)::int n FROM service_order_timeline WHERE "serviceOrderId" IN (${oIds.length ? list(oIds) : "''"})`),
    q(`SELECT count(*)::int n FROM vehicle_checklists WHERE "serviceOrderId" IN (${oIds.length ? list(oIds) : "''"})`),
    q(`SELECT count(*)::int n FROM commissions WHERE "serviceOrderId" IN (${oIds.length ? list(oIds) : "''"})`),
    q(`SELECT count(*)::int n FROM financial_transactions WHERE "referenceType" = 'service_order' AND "referenceId" IN (${oIds.length ? list(oIds) : "''"})`),
  ]);
  console.log(`Seriam apagados: ${targets.length} clientes, ${vIds.length} veiculos, ${oIds.length} O.S. (${counts[0][0].n} itens, ${counts[1][0].n} historicos, ${counts[2][0].n} checklists, ${counts[3][0].n} comissoes, ${counts[4][0].n} lancamentos financeiros)`);

  if (!apply) {
    console.log('\nNada foi apagado. Para apagar: acrescente --expect=' + targets.length + ' --apply (a contagem precisa bater).');
    return;
  }
  if (expect === null) throw new Error('Informe --expect=<quantos clientes espera apagar> junto com --apply.');
  if (expect !== targets.length) throw new Error(`Voce esperava ${expect} clientes, mas ha ${targets.length}. Nada apagado.`);
  if (targets.length === 0) throw new Error('Nada a apagar.');

  const stamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
  await prisma.$executeRawUnsafe('CREATE SCHEMA IF NOT EXISTS os_backups');
  const O = oIds.length ? list(oIds) : "''";
  const bk = [
    ['customers', `SELECT * FROM customers WHERE id IN (${list(cIds)})`],
    ['vehicles', `SELECT * FROM vehicles WHERE id IN (${vIds.length ? list(vIds) : "''"})`],
    ['service_orders', `SELECT * FROM service_orders WHERE id IN (${O})`],
    ['service_order_items', `SELECT * FROM service_order_items WHERE "serviceOrderId" IN (${O})`],
    ['service_order_timeline', `SELECT * FROM service_order_timeline WHERE "serviceOrderId" IN (${O})`],
    ['vehicle_checklists', `SELECT * FROM vehicle_checklists WHERE "serviceOrderId" IN (${O})`],
    ['checklist_items', `SELECT * FROM checklist_items WHERE "checklistId" IN (SELECT id FROM vehicle_checklists WHERE "serviceOrderId" IN (${O}))`],
    ['checklist_photos', `SELECT * FROM checklist_photos WHERE "itemId" IN (SELECT id FROM checklist_items WHERE "checklistId" IN (SELECT id FROM vehicle_checklists WHERE "serviceOrderId" IN (${O})))`],
    ['commissions', `SELECT * FROM commissions WHERE "serviceOrderId" IN (${O})`],
    ['engine_metrology', `SELECT * FROM engine_metrology WHERE "serviceOrderId" IN (${O})`],
    ['nps_responses', `SELECT * FROM nps_responses WHERE "serviceOrderId" IN (${O}) OR "customerId" IN (${list(cIds)})`],
    ['financial_transactions', `SELECT * FROM financial_transactions WHERE "referenceType" = 'service_order' AND "referenceId" IN (${O})`],
  ];
  for (const [name, select] of bk) await prisma.$executeRawUnsafe(`CREATE TABLE os_backups.bkp_cli_${stamp}_${name} AS ${select}`);
  console.log(`Backup completo no schema os_backups: bkp_cli_${stamp}_* (${bk.length} tabelas)`);

  await prisma.$transaction(async (t) => {
    await t.commission.deleteMany({ where: { serviceOrderId: { in: oIds } } });
    await t.financialTransaction.deleteMany({ where: { tenantId, referenceType: 'service_order', referenceId: { in: oIds } } });
    await t.engineMetrology.deleteMany({ where: { serviceOrderId: { in: oIds } } });
    await t.npsResponse.deleteMany({ where: { OR: [{ serviceOrderId: { in: oIds } }, { customerId: { in: cIds } }] } });
    await t.serviceOrderItem.deleteMany({ where: { serviceOrderId: { in: oIds } } });
    await t.serviceOrderTimeline.deleteMany({ where: { serviceOrderId: { in: oIds } } });
    await t.vehicleChecklist.deleteMany({ where: { serviceOrderId: { in: oIds } } });
    const os = await t.serviceOrder.deleteMany({ where: { id: { in: oIds }, tenantId } });
    const ve = await t.vehicle.deleteMany({ where: { id: { in: vIds }, tenantId } });
    const cu = await t.customer.deleteMany({ where: { id: { in: cIds }, tenantId } });
    console.log(`Apagados: ${cu.count} clientes, ${ve.count} veiculos, ${os.count} O.S.`);
  });
})()
  .catch((e) => { console.error('ERRO:', e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
