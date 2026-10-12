// Lista e restaura O.S. dos backups gravados pelo cleanup-seeded-orders.js (tabelas backup_os_<data>_*).
// Roda DENTRO do container da API:
//
//   1) Listar os backups e as O.S. que há em cada um (só leitura):
//      node restore-os-backup.js
//   2) Ver o que seria restaurado (só leitura):
//      node restore-os-backup.js --stamp=<data> --numbers=45,46,47
//   3) Restaurar de fato:
//      node restore-os-backup.js --stamp=<data> --numbers=45,46,47 --apply
//
// Restaura a O.S., os itens, o histórico e o lançamento financeiro (receita). NÃO restaura o que o backup não
// guardou: comissões, checklists (com fotos), metrologia e pesquisa NPS dessas O.S.
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const flags = process.argv.slice(2);
const arg = (name) => (flags.find((f) => f.startsWith(`--${name}=`)) || '').slice(name.length + 3);
const apply = flags.includes('--apply');
const stamp = arg('stamp');
const numbers = arg('numbers').split(',').map((n) => Number(n.trim())).filter((n) => Number.isInteger(n));

const q = (sql) => prisma.$queryRawUnsafe(sql);

async function listBackups() {
  const t = await q(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'backup_os_%_orders' ORDER BY table_name`);
  if (t.length === 0) {
    console.log('Nenhum backup encontrado (tabelas backup_os_*_orders).');
    return;
  }
  for (const { table_name } of t) {
    const s = table_name.replace('backup_os_', '').replace('_orders', '');
    const rows = await q(`SELECT b.id, b.number, b.status, b."tenantId", b."createdAt", c.name AS cliente, v.plate AS placa, b."totalCost"
      FROM "${table_name}" b LEFT JOIN customers c ON c.id = b."customerId" LEFT JOIN vehicles v ON v.id = b."vehicleId" ORDER BY b.number`);
    const live = await q(`SELECT id FROM service_orders WHERE id IN (SELECT id FROM "${table_name}")`);
    console.log(`\n=== backup ${s}: ${rows.length} O.S. (${live.length} ja existem de volta) ===`);
    console.table(rows.map((r) => ({ numero: r.number, status: r.status, criada: new Date(r.createdAt).toISOString().slice(0, 16), cliente: r.cliente, placa: r.placa, total: Number(r.totalCost), restaurada: live.some((l) => l.id === r.id) })));
  }
}

// Colunas em comum entre o backup e a tabela atual (o schema pode ter ganho colunas depois do backup).
async function commonColumns(live, backup) {
  const cols = async (t) => (await q(`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='${t}'`)).map((c) => c.column_name);
  const b = new Set(await cols(backup));
  return (await cols(live)).filter((c) => b.has(c));
}

async function restore() {
  if (!/^\d{14}$/.test(stamp)) throw new Error('Informe --stamp=<14 digitos> (veja a listagem).');
  if (numbers.length === 0) throw new Error('Informe --numbers=45,46,... com as O.S. a restaurar.');
  const bk = (suffix) => `backup_os_${stamp}_${suffix}`;
  const ordersBk = await q(`SELECT id, number FROM "${bk('orders')}" WHERE number IN (${numbers.join(',')})`);
  const missing = numbers.filter((n) => !ordersBk.some((o) => o.number === n));
  if (missing.length) throw new Error('Nao estao neste backup: ' + missing.join(', '));
  const ids = ordersBk.map((o) => `'${o.id.replace(/'/g, '')}'`).join(',');
  const already = await q(`SELECT number FROM service_orders WHERE id IN (${ids})`);
  const clash = await q(`SELECT number FROM service_orders WHERE number IN (${numbers.join(',')}) AND "tenantId" = (SELECT "tenantId" FROM "${bk('orders')}" LIMIT 1) AND id NOT IN (${ids})`);
  console.log(`Restauraria ${ordersBk.length} O.S.: ${ordersBk.map((o) => o.number).join(', ')}`);
  if (already.length) console.log('Ja existem de volta (ignoradas): ' + already.map((a) => a.number).join(', '));
  if (clash.length) throw new Error('Ja existe OUTRA O.S. com o numero: ' + clash.map((c) => c.number).join(', '));
  if (!apply) {
    console.log('Nada foi restaurado. Para restaurar, rode o mesmo comando com --apply no final.');
    return;
  }

  const parts = [
    ['service_orders', bk('orders'), `id IN (${ids})`],
    ['service_order_items', bk('items'), `"serviceOrderId" IN (${ids})`],
    ['service_order_timeline', bk('timeline'), `"serviceOrderId" IN (${ids})`],
    ['financial_transactions', bk('finance'), `"referenceType" = 'service_order' AND "referenceId" IN (${ids})`],
  ];
  await prisma.$transaction(async (tx) => {
    for (const [live, backup, where] of parts) {
      const cols = (await commonColumns(live, backup)).map((c) => `"${c}"`).join(', ');
      const n = await tx.$executeRawUnsafe(`INSERT INTO "${live}" (${cols}) SELECT ${cols} FROM "${backup}" WHERE ${where} ON CONFLICT (id) DO NOTHING`);
      console.log(`${live}: ${n} linha(s) restauradas`);
    }
  });
  console.log('Restauracao concluida.');
}

(async () => {
  if (!stamp) await listBackups();
  else await restore();
})()
  .catch((e) => { console.error('ERRO:', e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
