// Troca de plano SEM depender do schema gerado: usa SQL direto.
//
// Por que existe: o banco de produção está atrás do schema.prisma (falta, por exemplo,
// tenants."orderSequence"), então o Prisma Client recusa findMany de tenant. Aqui só se
// usa o que existe de fato: tenants, subscriptions ("tenantId"/"planId"), subscription_plans, parts.
//
//   node fix-tenant-plan-raw.js "Power Train"
//   node fix-tenant-plan-raw.js "Power Train" --plan RETIFICA_REDE --apply
//
// Roda com DATABASE_URL apontando para produção.

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const args = process.argv.slice(2);
const apply = args.includes('--apply');
const pi = args.indexOf('--plan');
const target = pi > -1 ? args[pi + 1] : null;
const termo = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--plan').join(' ').trim();

const limiteDe = (plano) => ({ START: 100, PRO: 1000, RETIFICA_PRO: 10000, REDE: -1, RETIFICA_REDE: -1 }[plano] ?? 100);
const fmt = (n) => (n < 0 ? 'ilimitado' : String(n));

(async () => {
  if (!termo) {
    console.error('Uso: node fix-tenant-plan-raw.js "<nome>" [--plan RETIFICA_REDE --apply]');
    process.exit(2);
  }

  const tenants = await prisma.$queryRaw`
    SELECT id, name, status FROM tenants WHERE name ILIKE ${'%' + termo + '%'} ORDER BY name
  `;
  if (tenants.length === 0) {
    console.error(`Nenhuma oficina com "${termo}". Oficinas no banco:`);
    const todas = await prisma.$queryRaw`SELECT name FROM tenants ORDER BY name`;
    for (const t of todas) console.error(`  - ${t.name}`);
    process.exit(1);
  }

  for (const t of tenants) {
    const sub = await prisma.$queryRaw`
      SELECT p.name AS plano, s.status
      FROM subscriptions s JOIN subscription_plans p ON p.id = s."planId"
      WHERE s."tenantId" = ${t.id}
    `;
    const partes = await prisma.$queryRaw`
      SELECT count(*)::int AS total FROM parts WHERE "tenantId" = ${t.id} AND "isActive" = true
    `;
    const plano = sub[0]?.plano ?? null;
    console.log(`\n${t.name}`);
    console.log(`  id: ${t.id}`);
    console.log(`  status: ${t.status}`);
    console.log(`  plano: ${plano ?? '(sem assinatura)'} | assinatura: ${sub[0]?.status ?? '-'} | limite de peças hoje: ${fmt(limiteDe(plano))}`);
    console.log(`  peças ativas: ${partes[0]?.total ?? 0}`);
  }

  if (tenants.length > 1) {
    console.error('\nMais de uma oficina casa com o termo. Use o nome completo.');
    process.exit(1);
  }
  if (!target) {
    console.log('\nInforme --plan <NOME_DO_PLANO> (e --apply para gravar).');
    return;
  }

  const plano = await prisma.$queryRaw`SELECT id, name FROM subscription_plans WHERE name = ${target}`;
  if (plano.length === 0) {
    console.error(`\nPlano "${target}" não existe. Planos no banco:`);
    const todos = await prisma.$queryRaw`SELECT name FROM subscription_plans ORDER BY name`;
    for (const p of todos) console.error(`  - ${p.name}`);
    process.exit(1);
  }

  const antes = await prisma.$queryRaw`
    SELECT s."planId", p.name AS plano FROM subscriptions s
    JOIN subscription_plans p ON p.id = s."planId" WHERE s."tenantId" = ${tenants[0].id}
  `;
  console.log(`\nAlvo: ${tenants[0].name} -> ${target} (plano atual: ${antes[0]?.plano ?? 'nenhum'}; limite vai para ${fmt(limiteDe(target))})`);

  if (antes.length === 0) {
    console.error('\nEsta oficina não tem assinatura; trocar o plano exige criá-la primeiro.');
    process.exit(1);
  }
  if (!apply) {
    console.log('SIMULAÇÃO. Nada gravado. Use --apply para trocar.');
    return;
  }

  const backup = path.join('C:\\tmp', `sigmaauto-plano-${tenants[0].id}-${Date.now()}.json`);
  fs.writeFileSync(backup, JSON.stringify({ tenant: tenants[0], antes }, null, 2), 'utf8');
  console.log(`Backup: ${backup}`);

  const upd = await prisma.$executeRaw`
    UPDATE subscriptions SET "planId" = ${plano[0].id}, "updatedAt" = now() WHERE "tenantId" = ${tenants[0].id}
  `;
  console.log(`Linhas atualizadas: ${upd}`);

  const depois = await prisma.$queryRaw`
    SELECT p.name AS plano FROM subscriptions s
    JOIN subscription_plans p ON p.id = s."planId" WHERE s."tenantId" = ${tenants[0].id}
  `;
  console.log(`Agora: ${depois[0]?.plano} (limite de peças: ${fmt(limiteDe(depois[0]?.plano))})`);
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
