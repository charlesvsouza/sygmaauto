'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  const startPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'START' },
    update: { price: 97.00 },
    create: {
      name: 'START',
      description: 'Para oficinas que estão começando a se profissionalizar.',
      price: 97.00,
      features: JSON.stringify({
        customers: true, vehicles: true, serviceOrders: true, manualFinancial: true,
        serviceApprovalLink: false, inventory: false, whatsappNotifications: false,
        checklist: false, kanban: false, mechanicCommission: false,
        maintenanceReminder: false, dre: false, multiUnit: false,
        nfe: false, clientPortal: false, aiAssist: false, nps: false,
      }),
      limits: JSON.stringify({ serviceOrdersPerMonth: 50, users: 3, storage: '2GB' }),
    },
  });

  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'PRO' },
    update: { price: 197.00 },
    create: {
      name: 'PRO',
      description: 'Para oficinas estabelecidas que querem escalar com automação.',
      price: 197.00,
      features: JSON.stringify({
        customers: true, vehicles: true, serviceOrders: true, manualFinancial: true,
        serviceApprovalLink: true, inventory: true, whatsappNotifications: true,
        checklist: true, kanban: true, mechanicCommission: true,
        maintenanceReminder: true, dre: false, multiUnit: false,
        nfe: false, clientPortal: false, aiAssist: false, nps: true,
      }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: 10, storage: '20GB' }),
    },
  });

  const redePlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'REDE' },
    update: { price: 397.00 },
    create: {
      name: 'REDE',
      description: 'Para redes e franquias com múltiplas unidades e gestão avançada.',
      price: 397.00,
      features: JSON.stringify({
        customers: true, vehicles: true, serviceOrders: true, manualFinancial: true,
        serviceApprovalLink: true, inventory: true, whatsappNotifications: true,
        checklist: true, kanban: true, mechanicCommission: true,
        maintenanceReminder: true, dre: true, multiUnit: true,
        nfe: true, clientPortal: true, aiAssist: true, nps: true,
      }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: -1, storage: '100GB' }),
    },
  });

  console.log('✅ Plans created: START / PRO / REDE');

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

  const trialEnds = new Date();
  trialEnds.setDate(trialEnds.getDate() + 14);

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

  console.log('✅ Demo tenant + subscription created');

  const [adminPwd, mecPwd, recPwd] = await Promise.all([
    bcrypt.hash('admin123', 10),
    bcrypt.hash('mecanico123', 10),
    bcrypt.hash('recepcao123', 10),
  ]);

  await Promise.all([
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: demoTenant.id, email: 'admin@demo.com' } },
      update: {},
      create: { tenantId: demoTenant.id, email: 'admin@demo.com', passwordHash: adminPwd, name: 'Admin Demo', role: 'MASTER' },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: demoTenant.id, email: 'mecanico@demo.com' } },
      update: {},
      create: { tenantId: demoTenant.id, email: 'mecanico@demo.com', passwordHash: mecPwd, name: 'Mecânico Demo', role: 'PRODUTIVO' },
    }),
    prisma.user.upsert({
      where: { tenantId_email: { tenantId: demoTenant.id, email: 'recepcao@demo.com' } },
      update: {},
      create: { tenantId: demoTenant.id, email: 'recepcao@demo.com', passwordHash: recPwd, name: 'Recepção Demo', role: 'PRODUTIVO' },
    }),
  ]);

  console.log('✅ Demo users created');

  const [c1, c2] = await Promise.all([
    prisma.customer.upsert({
      where: { id: 'customer-demo-1' },
      update: {},
      create: { id: 'customer-demo-1', tenantId: demoTenant.id, name: 'João Silva', document: '123.456.789-00', email: 'joao@email.com', phone: '(11) 99999-1111' },
    }),
    prisma.customer.upsert({
      where: { id: 'customer-demo-2' },
      update: {},
      create: { id: 'customer-demo-2', tenantId: demoTenant.id, name: 'Maria Santos', document: '987.654.321-00', email: 'maria@email.com', phone: '(11) 99999-2222' },
    }),
  ]);

  await Promise.all([
    prisma.vehicle.upsert({
      where: { tenantId_plate: { tenantId: demoTenant.id, plate: 'ABC-1234' } },
      update: {},
      create: { id: 'vehicle-demo-1', tenantId: demoTenant.id, customerId: c1.id, plate: 'ABC-1234', brand: 'Volkswagen', model: 'Gol', year: 2020, color: 'Preto', km: 45000 },
    }),
    prisma.vehicle.upsert({
      where: { tenantId_plate: { tenantId: demoTenant.id, plate: 'DEF-5678' } },
      update: {},
      create: { id: 'vehicle-demo-2', tenantId: demoTenant.id, customerId: c2.id, plate: 'DEF-5678', brand: 'Chevrolet', model: 'Onix', year: 2022, color: 'Branco', km: 20000 },
    }),
  ]);

  console.log('✅ Demo customers + vehicles created');

  await Promise.all([
    prisma.service.upsert({ where: { id: 'service-demo-1' }, update: {}, create: { id: 'service-demo-1', tenantId: demoTenant.id, name: 'Troca de Óleo', basePrice: 150.00, category: 'Manutenção', duration: 30, hourlyRate: 120, tmo: 0.5 } }),
    prisma.service.upsert({ where: { id: 'service-demo-2' }, update: {}, create: { id: 'service-demo-2', tenantId: demoTenant.id, name: 'Alinhamento e Balanceamento', basePrice: 200.00, category: 'Suspensão', duration: 60, hourlyRate: 120, tmo: 1.0 } }),
    prisma.service.upsert({ where: { id: 'service-demo-3' }, update: {}, create: { id: 'service-demo-3', tenantId: demoTenant.id, name: 'Revisão de Freios', basePrice: 350.00, category: 'Freios', duration: 90, hourlyRate: 120, tmo: 1.5 } }),
  ]);

  await Promise.all([
    prisma.part.upsert({ where: { id: 'part-demo-1' }, update: {}, create: { id: 'part-demo-1', tenantId: demoTenant.id, name: 'Óleo Lubrax 5W30', sku: 'OLEO-5W30-1L', unitPrice: 45.00, unit: 'L', minStock: 10 } }),
    prisma.part.upsert({ where: { id: 'part-demo-2' }, update: {}, create: { id: 'part-demo-2', tenantId: demoTenant.id, name: 'Filtro de Óleo Universal', sku: 'FILTRO-OLEO-001', unitPrice: 35.00, unit: 'un', minStock: 5 } }),
    prisma.part.upsert({ where: { id: 'part-demo-3' }, update: {}, create: { id: 'part-demo-3', tenantId: demoTenant.id, name: 'Pastilha de Freio Dianteira', sku: 'PASTILHA-DT-001', unitPrice: 120.00, unit: 'jg', minStock: 3 } }),
  ]);

  console.log('✅ Demo services + parts created');

  console.log(`
╔══════════════════════════════════════════════════════╗
║             🚀  OFICINA360 — SEED OK  🚀             ║
╠══════════════════════════════════════════════════════╣
║  PLANOS:                                             ║
║  • START  — R$ 97/mês  (até 3 usuários, 50 OS/mês)  ║
║  • PRO    — R$ 197/mês (até 10 usuários, ilimitado)  ║
║  • REDE   — R$ 397/mês (ilimitado, multi-unidades)   ║
╠══════════════════════════════════════════════════════╣
║  ACESSO DEMO (plano PRO — trial 14 dias):            ║
║  • admin@demo.com     / admin123    (MASTER)         ║
║  • mecanico@demo.com  / mecanico123 (PRODUTIVO)      ║
║  • recepcao@demo.com  / recepcao123 (PRODUTIVO)      ║
╚══════════════════════════════════════════════════════╝
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
