// Panorama de todas as oficinas (SOMENTE LEITURA): quanto cada uma tem e se há sinal de uso real ou de assinatura paga.
// Roda DENTRO do container da API:  node inspect-tenants.js
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const q = (sql) => prisma.$queryRawUnsafe(sql);

(async () => {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: 'asc' },
    include: { subscription: { include: { plan: true } } },
  });
  const rows = [];
  for (const t of tenants) {
    const [users, customers, vehicles, orders, tx, lastLogin, lastOrder, paidOrders] = await Promise.all([
      prisma.user.count({ where: { tenantId: t.id } }),
      prisma.customer.count({ where: { tenantId: t.id } }),
      prisma.vehicle.count({ where: { tenantId: t.id } }),
      prisma.serviceOrder.count({ where: { tenantId: t.id } }),
      prisma.financialTransaction.count({ where: { tenantId: t.id } }),
      prisma.user.findFirst({ where: { tenantId: t.id, lastLoginAt: { not: null } }, orderBy: { lastLoginAt: 'desc' }, select: { lastLoginAt: true } }),
      prisma.serviceOrder.findFirst({ where: { tenantId: t.id }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.serviceOrder.count({ where: { tenantId: t.id, paidAt: { not: null } } }),
    ]);
    const sub = t.subscription;
    rows.push({
      nome: t.name,
      id: t.id,
      criada: t.createdAt.toISOString().slice(0, 10),
      status: t.status,
      plano: sub && sub.plan ? sub.plan.name : '-',
      assinatura: sub ? sub.status : '-',
      ciclo: sub ? sub.billingCycle : '-',
      periodoAte: sub ? sub.currentPeriodEnd.toISOString().slice(0, 10) : '-',
      usuarios: users,
      clientes: customers,
      veiculos: vehicles,
      os: orders,
      osPagas: paidOrders,
      lancamentos: tx,
      ultimoLogin: lastLogin && lastLogin.lastLoginAt ? lastLogin.lastLoginAt.toISOString().slice(0, 10) : '-',
      ultimaOS: lastOrder ? lastOrder.createdAt.toISOString().slice(0, 10) : '-',
    });
  }
  console.table(rows.map(({ id, ...r }) => r));
  console.log('\nIDs:');
  rows.forEach((r) => console.log(`${r.id}  ${r.nome}`));

})()
  .catch((e) => { console.error('ERRO:', e.message || e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
