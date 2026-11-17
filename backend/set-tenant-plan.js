// Troca o plano de assinatura de uma oficina, porque o limite de peças do SigmaAuto
// vem do NOME do plano (src/inventory/inventory.service.ts: START 100 / PRO 1000 /
// REDE 1000000 / qualquer outro 100).
//
// SOMENTE LEITURA por padrão. Só grava com --apply, e antes grava um backup do
// registro atual da assinatura em C:\tmp.
//
//   node set-tenant-plan.js "Power Train"
//   node set-tenant-plan.js "Power Train" --plan REDE --apply
//
// Roda com a DATABASE_URL do backend/.env (é a MESMA que a API usa).

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Espelho do mapa do código. Se mudar lá, muda aqui.
const PARTS_LIMIT_BY_PLAN = { START: 100, PRO: 1000, REDE: 1000000 };
const limitForPlan = (name) => PARTS_LIMIT_BY_PLAN[name] ?? 100;
const fmt = (n) => (n >= 1000000 ? '1.000.000 (efetivamente ilimitado)' : String(n));

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const planFlag = args.indexOf('--plan');
const targetPlan = planFlag > -1 ? args[planFlag + 1] : null;
const termo = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--plan').join(' ').trim();

(async () => {
  if (!termo) {
    console.error('Uso: node set-tenant-plan.js "<parte do nome da oficina>" [--plan REDE --apply]');
    process.exit(2);
  }

  const tenants = await prisma.tenant.findMany({
    where: { name: { contains: termo, mode: 'insensitive' } },
    include: { subscription: { include: { plan: true } } },
    orderBy: { createdAt: 'asc' },
  });

  if (tenants.length === 0) {
    console.error(`Nenhuma oficina com "${termo}" no nome.`);
    process.exit(1);
  }
  if (tenants.length > 1) {
    console.error(`"${termo}" casa com ${tenants.length} oficinas. Use o nome mais completo:`);
    for (const t of tenants) console.error(`  - ${t.name}  (${t.id})`);
    process.exit(1);
  }

  const t = tenants[0];
  const planoAtual = t.subscription?.plan?.name ?? '(sem assinatura, cai em START)';
  const pecas = await prisma.part.count({ where: { tenantId: t.id, isActive: true } });

  console.log(`\nOficina: ${t.name}`);
  console.log(`  id: ${t.id}`);
  console.log(`  status: ${t.status}`);
  console.log(`  plano atual: ${planoAtual}  (limite de peças: ${fmt(limitForPlan(planoAtual))})`);
  console.log(`  peças ativas hoje: ${pecas}`);

  if (!targetPlan) {
    console.log('\n(simulação) informe --plan REDE para ver o efeito, e --apply para gravar.');
    return;
  }

  const alvo = await prisma.subscriptionPlan.findUnique({ where: { name: targetPlan } });
  if (!alvo) {
    console.error(`\nPlano "${targetPlan}" não existe. Planos no banco:`);
    const planos = await prisma.subscriptionPlan.findMany({ orderBy: { name: 'asc' } });
    for (const p of planos) console.error(`  - ${p.name}`);
    process.exit(1);
  }

  console.log(`\nAlvo: ${alvo.name} (limite de peças: ${fmt(limitForPlan(alvo.name))})`);

  if (!apply) {
    console.log('\nSIMULAÇÃO. Nada foi gravado. Repita com --apply para trocar.');
    return;
  }
  if (!t.subscription) {
    console.error('\nEsta oficina não tem registro de assinatura; trocar o plano exige criá-la primeiro.');
    process.exit(1);
  }

  const backupDir = 'C:\\tmp';
  fs.mkdirSync(backupDir, { recursive: true });
  const backupFile = path.join(backupDir, `sigmaauto-assinatura-${t.id}-${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify({ tenant: { id: t.id, name: t.name }, subscription: t.subscription, planoAnterior: planoAtual }, null, 2), 'utf8');
  console.log(`\nBackup do registro atual: ${backupFile}`);

  const atualizada = await prisma.subscription.update({
    where: { tenantId: t.id },
    data: { planId: alvo.id },
    include: { plan: true },
  });

  console.log(`Gravado: plano ${planoAtual} -> ${atualizada.plan.name} (limite de peças agora: ${fmt(limitForPlan(atualizada.plan.name))})`);
  console.log('Falta só confirmar no app: criar uma peça acima da posição 100 deve passar.');
})()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
