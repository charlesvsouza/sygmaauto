/**
 * RESET TOTAL DO BANCO + BOOTSTRAP MÍNIMO
 *
 * O script apaga TODAS as tabelas do schema public (exceto _prisma_migrations)
 * e recria somente:
 * - Planos START/PRO/REDE
 * - 1 Super Admin
 * - 1 Tenant owner com usuário MASTER
 * - Subscription ativa do tenant owner no plano PRO
 *
 * Segurança:
 * - Exige CONFIRM_RESET=YES_I_UNDERSTAND
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function truncateAllPublicTables() {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
    ORDER BY tablename
  `;

  if (!rows.length) {
    console.log('ℹ️ Nenhuma tabela para truncar no schema public.');
    return;
  }

  const targets = rows.map((r) => `"public"."${r.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${targets} RESTART IDENTITY CASCADE`);
  console.log(`🧹 Tabelas truncadas: ${rows.length}`);
}

async function bootstrapAdmins() {
  const superAdminEmail = process.env.SA_EMAIL || 'sigmaauto@sigmaauto.com.br';
  const superAdminName = process.env.SA_NAME || 'Sigma Auto Super Admin';
  const superAdminPassword = process.env.SA_PASSWORD || 'SygmaAdmin@2026!';

  const masterEmail = process.env.MASTER_EMAIL || 'assine@sigmaauto.com.br';
  const masterName = process.env.MASTER_NAME || 'Master Sigma Auto';
  const masterPassword = process.env.MASTER_PASSWORD || 'SygmaMaster@2026!';
  const tenantName = process.env.MASTER_TENANT_NAME || 'Sygma Auto';
  const tenantDocument = process.env.MASTER_TENANT_DOCUMENT || '00.000.000/0001-00';

  const [startPlan, proPlan] = await Promise.all([
    prisma.subscriptionPlan.create({
      data: {
        name: 'START',
        description: 'Plano inicial',
        price: 149,
        features: JSON.stringify({}),
        limits: JSON.stringify({ serviceOrdersPerMonth: 50, users: 3 }),
      },
    }),
    prisma.subscriptionPlan.create({
      data: {
        name: 'PRO',
        description: 'Plano profissional',
        price: 299,
        features: JSON.stringify({}),
        limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: 10 }),
      },
    }),
  ]);

  await prisma.subscriptionPlan.create({
    data: {
      name: 'REDE',
      description: 'Plano rede',
      price: 599,
      features: JSON.stringify({}),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: -1 }),
    },
  });

  const superAdminHash = await bcrypt.hash(superAdminPassword, 12);
  await prisma.superAdmin.create({
    data: {
      email: superAdminEmail,
      name: superAdminName,
      passwordHash: superAdminHash,
      isActive: true,
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      document: tenantDocument,
      email: masterEmail,
      status: 'ACTIVE',
    },
  });

  const masterHash = await bcrypt.hash(masterPassword, 10);
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: masterEmail,
      passwordHash: masterHash,
      name: masterName,
      role: 'MASTER',
      isActive: true,
    },
  });

  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1);

  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
  });

  console.log('✅ Bootstrap concluído');
  console.log(`   Super Admin: ${superAdminEmail}`);
  console.log(`   Master: ${masterEmail}`);
  console.log(`   Tenant: ${tenant.name}`);
  console.log(`   Planos: ${startPlan.name}, ${proPlan.name}, REDE`);
}

async function main() {
  const confirm = process.env.CONFIRM_RESET;
  if (confirm !== 'YES_I_UNDERSTAND') {
    throw new Error(
      'Operação bloqueada. Defina CONFIRM_RESET=YES_I_UNDERSTAND para executar o reset total.',
    );
  }

  console.log('⚠️ RESET TOTAL autorizado. Iniciando...');
  await truncateAllPublicTables();
  await bootstrapAdmins();
  console.log('🎉 Banco resetado com sucesso.');
}

main()
  .catch((e) => {
    console.error('❌ Erro no reset:', e.message || e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
