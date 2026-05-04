import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL || 'sigmaauto@sigmaauto.com.br';
  const superAdminName = process.env.SEED_SUPERADMIN_NAME || 'Sigma Auto Super Admin';
  const tenantOwnerEmail = process.env.SEED_TENANT_OWNER_EMAIL || 'assine@sigmaauto.com.br';
  const tenantOwnerName = process.env.SEED_TENANT_OWNER_NAME || 'Master Sigma Auto';
  const tenantOwnerContactEmail = process.env.SEED_TENANT_OWNER_CONTACT_EMAIL || tenantOwnerEmail;

  // ─── Planos (preços alinhados com a landing page) ─────────────────────────
  const startPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'START' },
    update: { price: 149.00 },
    create: {
      name: 'START',
      description: 'Para oficinas iniciando com controle total da operação.',
      price: 149.00,
      features: JSON.stringify({
        customers: true,
        vehicles: true,
        serviceOrders: true,
        manualFinancial: true,
        serviceApprovalLink: false,
        inventory: false,
        whatsappNotifications: false,
        checklist: false,
        kanban: false,
        mechanicCommission: false,
        maintenanceReminder: false,
        dre: false,
        multiUnit: false,
        nfe: false,
        clientPortal: false,
        aiAssist: false,
        nps: false,
      }),
      limits: JSON.stringify({ serviceOrdersPerMonth: 50, users: 3, storage: '2GB' }),
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'PRO' },
    update: { price: 299.00 },
    create: {
      name: 'PRO',
      description: 'Aceleração com financeiro, estoque e produtividade em tempo real.',
      price: 299.00,
      features: JSON.stringify({
        customers: true,
        vehicles: true,
        serviceOrders: true,
        manualFinancial: true,
        serviceApprovalLink: true,
        inventory: true,
        whatsappNotifications: true,
        checklist: true,
        kanban: true,
        mechanicCommission: true,
        maintenanceReminder: true,
        dre: false,
        multiUnit: false,
        nfe: false,
        clientPortal: false,
        aiAssist: false,
        nps: true,
      }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: 10, storage: '20GB' }),
    },
  });

  const redePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'REDE' },
    update: { price: 599.00 },
    create: {
      name: 'REDE',
      description: 'Para grupos de oficinas com governança, escala e padronização.',
      price: 599.00,
      features: JSON.stringify({
        customers: true,
        vehicles: true,
        serviceOrders: true,
        manualFinancial: true,
        serviceApprovalLink: true,
        inventory: true,
        whatsappNotifications: true,
        checklist: true,
        kanban: true,
        mechanicCommission: true,
        maintenanceReminder: true,
        dre: true,
        multiUnit: true,
        nfe: true,
        clientPortal: true,
        aiAssist: true,
        nps: true,
      }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: -1, storage: '100GB' }),
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'RETIFICA_PRO' },
    update: { price: 499.00 },
    create: {
      name: 'RETIFICA_PRO',
      description: 'Modo Retifica de Motores para operacao PRO com oficina e retifica integradas.',
      price: 499.00,
      features: JSON.stringify({
        customers: true,
        vehicles: true,
        serviceOrders: true,
        manualFinancial: true,
        serviceApprovalLink: true,
        inventory: true,
        whatsappNotifications: true,
        checklist: true,
        kanban: true,
        mechanicCommission: true,
        maintenanceReminder: true,
        dre: false,
        multiUnit: false,
        nfe: false,
        clientPortal: false,
        aiAssist: false,
        nps: true,
        retificaMode: true,
      }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: 15, storage: '40GB' }),
    },
  });

  await prisma.subscriptionPlan.upsert({
    where: { name: 'RETIFICA_REDE' },
    update: { price: 899.00 },
    create: {
      name: 'RETIFICA_REDE',
      description: 'Modo Retifica de Motores com multiunidade e governanca de rede.',
      price: 899.00,
      features: JSON.stringify({
        customers: true,
        vehicles: true,
        serviceOrders: true,
        manualFinancial: true,
        serviceApprovalLink: true,
        inventory: true,
        whatsappNotifications: true,
        checklist: true,
        kanban: true,
        mechanicCommission: true,
        maintenanceReminder: true,
        dre: true,
        multiUnit: true,
        nfe: true,
        clientPortal: true,
        aiAssist: true,
        nps: true,
        retificaMode: true,
      }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: -1, storage: '150GB' }),
    },
  });

  console.log('✅ Planos criados: START R$149 / PRO R$299 / REDE R$599');

  // ─── SuperAdmin ───────────────────────────────────────────────────────────
  const superAdminPwd = process.env.SEED_SUPERADMIN_PASSWORD || 'SygmaAdmin@2026!';
  await prisma.superAdmin.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      email: superAdminEmail,
      name: superAdminName,
      passwordHash: await bcrypt.hash(superAdminPwd, 12),
    },
  });

  console.log(`✅ SuperAdmin criado: ${superAdminEmail}`);

  // ─── Tenant Owner (conta do dono do produto, plano PRO ativo) ─────────────
  const ownerPwd = process.env.SEED_MASTER_PASSWORD || 'SygmaMaster@2026!';
  const periodEnd = new Date();
  periodEnd.setFullYear(periodEnd.getFullYear() + 1); // 1 ano ativo

  const ownerTenant = await prisma.tenant.upsert({
    where: { document: '00.000.000/0001-00' },
    update: {},
    create: {
      name: 'Sygma Auto',
      document: '00.000.000/0001-00',
      email: tenantOwnerContactEmail,
    },
  });

  await prisma.subscription.upsert({
    where: { tenantId: ownerTenant.id },
    update: { status: 'ACTIVE', currentPeriodEnd: periodEnd },
    create: {
      tenantId: ownerTenant.id,
      planId: proPlan.id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: periodEnd,
    },
  });

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: ownerTenant.id, email: tenantOwnerEmail } },
    update: {},
    create: {
      tenantId: ownerTenant.id,
      email: tenantOwnerEmail,
      passwordHash: await bcrypt.hash(ownerPwd, 10),
      name: tenantOwnerName,
      role: 'MASTER',
    },
  });

  console.log(`✅ Tenant owner criado: ${tenantOwnerEmail} (MASTER / PRO ativo)`);

  // ─── Tenant Demo (para testes de fluxo com múltiplos papéis) ─────────────
  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 30);

  const demoTenant = await prisma.tenant.upsert({
    where: { document: '12.345.678/0001-90' },
    update: {},
    create: {
      name: 'Oficina Demo',
      document: '12.345.678/0001-90',
      address: 'Av. Principal, 1234 - São Paulo, SP',
      phone: '(11) 99999-9999',
      email: 'contato@oficina-demo.com.br',
    },
  });

  await prisma.subscription.upsert({
    where: { tenantId: demoTenant.id },
    update: {},
    create: {
      tenantId: demoTenant.id,
      planId: proPlan.id,
      status: 'TRIALING',
      trialEndsAt: trialEnds,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEnds,
    },
  });

  const [masterPwd, adminPwd, tecPwd, finPwd] = await Promise.all([
    bcrypt.hash('master123', 10),
    bcrypt.hash('admin123', 10),
    bcrypt.hash('tecnico123', 10),
    bcrypt.hash('financeiro123', 10),
  ]);

  await Promise.all([
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: demoTenant.id, email: 'master@demo.com' } },
      update: {},
      create: { tenantId: demoTenant.id, email: 'master@demo.com', passwordHash: masterPwd, name: 'Master Demo', role: 'MASTER' },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: demoTenant.id, email: 'admin@demo.com' } },
      update: {},
      create: { tenantId: demoTenant.id, email: 'admin@demo.com', passwordHash: adminPwd, name: 'Admin Demo', role: 'ADMIN' },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: demoTenant.id, email: 'tecnico@demo.com' } },
      update: {},
      create: { tenantId: demoTenant.id, email: 'tecnico@demo.com', passwordHash: tecPwd, name: 'Técnico Demo', role: 'PRODUTIVO' },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: demoTenant.id, email: 'financeiro@demo.com' } },
      update: {},
      create: { tenantId: demoTenant.id, email: 'financeiro@demo.com', passwordHash: finPwd, name: 'Financeiro Demo', role: 'FINANCEIRO' },
    }),
  ]);

  console.log('✅ Tenant demo criado com 4 usuários');

  console.log(`
╔══════════════════════════════════════════════════════════╗
║            🚀  SYGMA AUTO — SEED OK  🚀                 ║
╠══════════════════════════════════════════════════════════╣
║  PLANOS:                                                 ║
║  • START  — R$ 149/mês                                  ║
║  • PRO    — R$ 299/mês   ← demo e owner usam este       ║
║  • REDE   — R$ 599/mês                                  ║
╠══════════════════════════════════════════════════════════╣
║  SUPERADMIN (painel /superadmin):                        ║
║  • ${superAdminEmail.padEnd(30, ' ')} /  SygmaAdmin@2026!       ║
╠══════════════════════════════════════════════════════════╣
║  OWNER — Tenant "Sygma Auto" (PRO ativo, 1 ano):        ║
║  • ${tenantOwnerEmail.padEnd(30, ' ')} /  SygmaMaster@2026!      ║
╠══════════════════════════════════════════════════════════╣
║  DEMO — Oficina Demo (PRO trial 30 dias):                ║
║  • master@demo.com       /  master123    (MASTER)        ║
║  • admin@demo.com        /  admin123     (ADMIN)         ║
║  • tecnico@demo.com      /  tecnico123   (PRODUTIVO)     ║
║  • financeiro@demo.com   /  financeiro123 (FINANCEIRO)   ║
╚══════════════════════════════════════════════════════════╝
  `);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
