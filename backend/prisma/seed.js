'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function calcTotals(items) {
  const price = (i) => (i.quantity || 0) * (i.unitPrice || 0);
  const tp = items.filter(i => i.type === 'PART').reduce((s, i) => s + price(i), 0);
  const ts = items.filter(i => i.type === 'SERVICE').reduce((s, i) => s + price(i), 0);
  const tl = items.filter(i => i.type === 'LABOR').reduce((s, i) => s + price(i), 0);
  return { totalParts: tp, totalServices: ts, totalLabor: tl, totalCost: tp + ts + tl };
}

// ─── Catálogo de Peças ────────────────────────────────────────────────────────
const PARTS_CATALOG = [
  { name: 'Pastilha de Freio Dianteira',           internalCode: 'FRE-001', category: 'FRE', unit: 'jg',  unitPrice: 189.90, costPrice: 95.00 },
  { name: 'Pastilha de Freio Traseira',            internalCode: 'FRE-002', category: 'FRE', unit: 'jg',  unitPrice: 149.90, costPrice: 75.00 },
  { name: 'Disco de Freio Dianteiro (par)',         internalCode: 'FRE-003', category: 'FRE', unit: 'par', unitPrice: 320.00, costPrice: 160.00 },
  { name: 'Disco de Freio Traseiro (par)',          internalCode: 'FRE-004', category: 'FRE', unit: 'par', unitPrice: 280.00, costPrice: 140.00 },
  { name: 'Fluido de Freio DOT4 500ml',            internalCode: 'FRE-005', category: 'FRE', unit: 'un',  unitPrice: 38.90,  costPrice: 18.00 },
  { name: 'Cilindro de Roda Traseiro',             internalCode: 'FRE-006', category: 'FRE', unit: 'un',  unitPrice: 89.90,  costPrice: 42.00 },
  { name: 'Lona de Freio (jogo)',                  internalCode: 'FRE-007', category: 'FRE', unit: 'jg',  unitPrice: 119.90, costPrice: 55.00 },
  { name: 'Bomba de Freio Principal',              internalCode: 'FRE-008', category: 'FRE', unit: 'un',  unitPrice: 245.00, costPrice: 120.00 },
  { name: 'Óleo Motor 5W30 Sintético 1L',          internalCode: 'MOT-001', category: 'MOT', unit: 'L',   unitPrice: 49.90,  costPrice: 28.00 },
  { name: 'Óleo Motor 10W40 Semissintético 1L',    internalCode: 'MOT-002', category: 'MOT', unit: 'L',   unitPrice: 32.90,  costPrice: 17.00 },
  { name: 'Filtro de Óleo (rosca)',                internalCode: 'MOT-003', category: 'MOT', unit: 'un',  unitPrice: 39.90,  costPrice: 18.00 },
  { name: 'Filtro de Ar do Motor',                 internalCode: 'MOT-004', category: 'MOT', unit: 'un',  unitPrice: 59.90,  costPrice: 28.00 },
  { name: 'Filtro de Combustível',                 internalCode: 'MOT-005', category: 'MOT', unit: 'un',  unitPrice: 69.90,  costPrice: 32.00 },
  { name: 'Vela de Ignição (unidade)',             internalCode: 'MOT-006', category: 'MOT', unit: 'un',  unitPrice: 45.00,  costPrice: 20.00 },
  { name: 'Correia Dentada + Tensionador (kit)',   internalCode: 'MOT-007', category: 'MOT', unit: 'kt',  unitPrice: 380.00, costPrice: 180.00 },
  { name: 'Correia Poly-V',                        internalCode: 'MOT-008', category: 'MOT', unit: 'un',  unitPrice: 95.00,  costPrice: 45.00 },
  { name: 'Bomba D\'Água',                         internalCode: 'MOT-009', category: 'MOT', unit: 'un',  unitPrice: 210.00, costPrice: 100.00 },
  { name: 'Tampa de Válvulas (junta)',             internalCode: 'MOT-010', category: 'MOT', unit: 'un',  unitPrice: 85.00,  costPrice: 38.00 },
  { name: 'Amortecedor Dianteiro (unidade)',       internalCode: 'SUS-001', category: 'SUS', unit: 'un',  unitPrice: 320.00, costPrice: 155.00 },
  { name: 'Amortecedor Traseiro (unidade)',        internalCode: 'SUS-002', category: 'SUS', unit: 'un',  unitPrice: 280.00, costPrice: 135.00 },
  { name: 'Pivô de Suspensão Dianteiro',           internalCode: 'SUS-003', category: 'SUS', unit: 'un',  unitPrice: 145.00, costPrice: 68.00 },
  { name: 'Barra Estabilizadora (bucha)',          internalCode: 'SUS-004', category: 'SUS', unit: 'un',  unitPrice: 42.90,  costPrice: 18.00 },
  { name: 'Rolamento de Roda Dianteiro',           internalCode: 'SUS-005', category: 'SUS', unit: 'un',  unitPrice: 189.00, costPrice: 88.00 },
  { name: 'Rolamento de Roda Traseiro',            internalCode: 'SUS-006', category: 'SUS', unit: 'un',  unitPrice: 175.00, costPrice: 82.00 },
  { name: 'Terminal de Direção',                   internalCode: 'SUS-007', category: 'SUS', unit: 'un',  unitPrice: 98.00,  costPrice: 45.00 },
  { name: 'Bieleta de Suspensão',                  internalCode: 'SUS-008', category: 'SUS', unit: 'un',  unitPrice: 79.90,  costPrice: 35.00 },
  { name: 'Coxim do Amortecedor',                 internalCode: 'SUS-009', category: 'SUS', unit: 'un',  unitPrice: 110.00, costPrice: 50.00 },
  { name: 'Bateria 60Ah Selada',                   internalCode: 'ELE-001', category: 'ELE', unit: 'un',  unitPrice: 520.00, costPrice: 280.00 },
  { name: 'Bateria 45Ah Selada',                   internalCode: 'ELE-002', category: 'ELE', unit: 'un',  unitPrice: 420.00, costPrice: 220.00 },
  { name: 'Alternador Remanufaturado',             internalCode: 'ELE-003', category: 'ELE', unit: 'un',  unitPrice: 680.00, costPrice: 320.00 },
  { name: 'Motor de Partida (arranque)',           internalCode: 'ELE-004', category: 'ELE', unit: 'un',  unitPrice: 590.00, costPrice: 280.00 },
  { name: 'Lâmpada Farol H7 55W (par)',            internalCode: 'ELE-005', category: 'ELE', unit: 'par', unitPrice: 58.90,  costPrice: 25.00 },
  { name: 'Lâmpada Farol LED H4 (par)',            internalCode: 'ELE-006', category: 'ELE', unit: 'par', unitPrice: 149.90, costPrice: 70.00 },
  { name: 'Fusível Automotivo (caixa 100un)',      internalCode: 'ELE-007', category: 'ELE', unit: 'cx',  unitPrice: 38.00,  costPrice: 15.00 },
  { name: 'Cabo de Vela (jogo)',                   internalCode: 'ELE-008', category: 'ELE', unit: 'jg',  unitPrice: 185.00, costPrice: 88.00 },
  { name: 'Sensor de Temperatura do Motor',        internalCode: 'SEN-001', category: 'SEN', unit: 'un',  unitPrice: 145.00, costPrice: 68.00 },
  { name: 'Sensor MAP (pressão coletor)',          internalCode: 'SEN-002', category: 'SEN', unit: 'un',  unitPrice: 210.00, costPrice: 98.00 },
  { name: 'Sensor de Oxigênio (Lambda)',           internalCode: 'SEN-003', category: 'SEN', unit: 'un',  unitPrice: 320.00, costPrice: 150.00 },
  { name: 'Sensor ABS Dianteiro',                  internalCode: 'SEN-004', category: 'SEN', unit: 'un',  unitPrice: 248.00, costPrice: 115.00 },
  { name: 'Sensor ABS Traseiro',                   internalCode: 'SEN-005', category: 'SEN', unit: 'un',  unitPrice: 228.00, costPrice: 108.00 },
  { name: 'Sensor de Nível de Combustível',        internalCode: 'SEN-006', category: 'SEN', unit: 'un',  unitPrice: 185.00, costPrice: 85.00 },
  { name: 'Sensor de Rotação (CKP)',               internalCode: 'SEN-007', category: 'SEN', unit: 'un',  unitPrice: 175.00, costPrice: 80.00 },
  { name: 'Fluido Radiador Concentrado 1L',        internalCode: 'REF-001', category: 'REF', unit: 'L',   unitPrice: 32.90,  costPrice: 15.00 },
  { name: 'Radiador (alumínio)',                   internalCode: 'REF-002', category: 'REF', unit: 'un',  unitPrice: 580.00, costPrice: 280.00 },
  { name: 'Mangueira Superior do Radiador',        internalCode: 'REF-003', category: 'REF', unit: 'un',  unitPrice: 78.90,  costPrice: 35.00 },
  { name: 'Mangueira Inferior do Radiador',        internalCode: 'REF-004', category: 'REF', unit: 'un',  unitPrice: 68.90,  costPrice: 30.00 },
  { name: 'Termostato + Junta',                   internalCode: 'REF-005', category: 'REF', unit: 'kt',  unitPrice: 95.00,  costPrice: 42.00 },
  { name: 'Reservatório de Água (Expansão)',       internalCode: 'REF-006', category: 'REF', unit: 'un',  unitPrice: 128.00, costPrice: 58.00 },
  { name: 'Óleo de Câmbio ATF 1L',                internalCode: 'TRA-001', category: 'TRA', unit: 'L',   unitPrice: 42.90,  costPrice: 20.00 },
  { name: 'Óleo de Diferencial GL5 1L',           internalCode: 'TRA-002', category: 'TRA', unit: 'L',   unitPrice: 38.90,  costPrice: 18.00 },
  { name: 'Kit de Embreagem (disco + platô)',      internalCode: 'TRA-003', category: 'TRA', unit: 'kt',  unitPrice: 680.00, costPrice: 320.00 },
  { name: 'Rolamento de Embreagem (thrust)',       internalCode: 'TRA-004', category: 'TRA', unit: 'un',  unitPrice: 145.00, costPrice: 65.00 },
  { name: 'Cubo de Roda Dianteiro',               internalCode: 'TRA-005', category: 'TRA', unit: 'un',  unitPrice: 320.00, costPrice: 148.00 },
  { name: 'Filtro de Ar do Habitáculo (cabine)',   internalCode: 'REV-001', category: 'REV', unit: 'un',  unitPrice: 49.90,  costPrice: 22.00 },
  { name: 'Palheta Limpador Dianteiro (par)',      internalCode: 'REV-002', category: 'REV', unit: 'par', unitPrice: 68.90,  costPrice: 30.00 },
  { name: 'Fluido Limpador de Vidro 500ml',        internalCode: 'REV-003', category: 'REV', unit: 'un',  unitPrice: 18.90,  costPrice: 7.00 },
  { name: 'Kit Revisão 30.000 km',                internalCode: 'REV-004', category: 'REV', unit: 'kt',  unitPrice: 280.00, costPrice: 130.00 },
  { name: 'Vela de Ignição Iridium (unidade)',     internalCode: 'REV-005', category: 'REV', unit: 'un',  unitPrice: 89.00,  costPrice: 42.00 },
];

async function main() {
  console.log('🌱 Iniciando seed completo...');

  // ── Planos ─────────────────────────────────────────────────────────────────
  const proPlan = await prisma.subscriptionPlan.upsert({
    where: { name: 'PRO' }, update: { price: 197.00 },
    create: { name: 'PRO', description: 'Para oficinas estabelecidas.', price: 197.00,
      features: JSON.stringify({ customers: true, vehicles: true, serviceOrders: true, manualFinancial: true, serviceApprovalLink: true, inventory: true, whatsappNotifications: true, checklist: true, kanban: true, mechanicCommission: true, maintenanceReminder: true, dre: false, multiUnit: false, nfe: false, clientPortal: false, aiAssist: false, nps: true }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: 10, storage: '20GB' }) },
  });
  await prisma.subscriptionPlan.upsert({ where: { name: 'START' }, update: { price: 97 },
    create: { name: 'START', description: 'Para iniciar.', price: 97,
      features: JSON.stringify({ customers: true, vehicles: true, serviceOrders: true, manualFinancial: true, serviceApprovalLink: false, inventory: false, whatsappNotifications: false, checklist: false, kanban: false, mechanicCommission: false, maintenanceReminder: false, dre: false, multiUnit: false, nfe: false, clientPortal: false, aiAssist: false, nps: false }),
      limits: JSON.stringify({ serviceOrdersPerMonth: 50, users: 3, storage: '2GB' }) },
  });
  await prisma.subscriptionPlan.upsert({ where: { name: 'REDE' }, update: { price: 397 },
    create: { name: 'REDE', description: 'Para redes e franquias.', price: 397,
      features: JSON.stringify({ customers: true, vehicles: true, serviceOrders: true, manualFinancial: true, serviceApprovalLink: true, inventory: true, whatsappNotifications: true, checklist: true, kanban: true, mechanicCommission: true, maintenanceReminder: true, dre: true, multiUnit: true, nfe: true, clientPortal: true, aiAssist: true, nps: true }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: -1, storage: '100GB' }) },
  });
  await prisma.subscriptionPlan.upsert({ where: { name: 'RETIFICA_PRO' }, update: { price: 499 },
    create: { name: 'RETIFICA_PRO', description: 'Modo Retifica de Motores para operacao PRO com oficina e retifica integradas.', price: 499,
      features: JSON.stringify({ customers: true, vehicles: true, serviceOrders: true, manualFinancial: true, serviceApprovalLink: true, inventory: true, whatsappNotifications: true, checklist: true, kanban: true, mechanicCommission: true, maintenanceReminder: true, dre: false, multiUnit: false, nfe: false, clientPortal: false, aiAssist: false, nps: true, retificaMode: true }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: 15, storage: '40GB' }) },
  });
  await prisma.subscriptionPlan.upsert({ where: { name: 'RETIFICA_REDE' }, update: { price: 899 },
    create: { name: 'RETIFICA_REDE', description: 'Modo Retifica de Motores com multiunidade e governanca de rede.', price: 899,
      features: JSON.stringify({ customers: true, vehicles: true, serviceOrders: true, manualFinancial: true, serviceApprovalLink: true, inventory: true, whatsappNotifications: true, checklist: true, kanban: true, mechanicCommission: true, maintenanceReminder: true, dre: true, multiUnit: true, nfe: true, clientPortal: true, aiAssist: true, nps: true, retificaMode: true }),
      limits: JSON.stringify({ serviceOrdersPerMonth: -1, users: -1, storage: '150GB' }) },
  });
  console.log('✅ Planos criados');

  // ── Tenant Demo ────────────────────────────────────────────────────────────
  const demoTenant = await prisma.tenant.upsert({
    where: { document: '12.345.678/0001-90' }, update: {},
    create: { name: 'Oficina Demo', document: '12.345.678/0001-90', address: 'Av. Paulista, 1234 - São Paulo, SP', phone: '(11) 98765-4321', email: 'contato@oficina-demo.com.br', laborHourlyRate: 120.00 },
  });
  const trialEnds = new Date(); trialEnds.setDate(trialEnds.getDate() + 14);
  await prisma.subscription.upsert({ where: { tenantId: demoTenant.id }, update: {},
    create: { tenantId: demoTenant.id, planId: proPlan.id, status: 'TRIALING', trialEndsAt: trialEnds, currentPeriodStart: new Date(), currentPeriodEnd: trialEnds },
  });

  // ── Usuários (10 mecânicos/executores + admin + mestre) ──────────────────────
  const userPwd = await bcrypt.hash('mecanico123', 10);
  const [adminPwd, masterPwd] = await Promise.all([bcrypt.hash('admin123', 10), bcrypt.hash('SygmaMaster@2026!', 10)]);
  const adminUser = await prisma.user.upsert({ where: { tenantId_email: { tenantId: demoTenant.id, email: 'admin@demo.com' } }, update: {}, create: { tenantId: demoTenant.id, email: 'admin@demo.com', passwordHash: adminPwd, name: 'Admin Demo', role: 'MASTER' } });

  const executorData = [
    { id: 'usr-mec-01', name: 'Carlos Souza',      email: 'carlos@demo.com',   role: 'MECANICO', jobFunction: 'MECANICO',    workshopArea: 'MECANICA',           commissionPercent: 10 },
    { id: 'usr-mec-02', name: 'Roberto Lima',       email: 'roberto@demo.com',  role: 'MECANICO', jobFunction: 'ELETRICISTA',  workshopArea: 'ELETRICA',           commissionPercent: 10 },
    { id: 'usr-mec-03', name: 'Thiago Alves',       email: 'thiago@demo.com',   role: 'MECANICO', jobFunction: 'MECANICO',    workshopArea: 'MECANICA',           commissionPercent: 8  },
    { id: 'usr-mec-04', name: 'Anderson Ferreira',  email: 'anderson@demo.com', role: 'MECANICO', jobFunction: 'FUNILEIRO',   workshopArea: 'FUNILARIA_PINTURA',  commissionPercent: 8  },
    { id: 'usr-mec-05', name: 'Marcelo Costa',      email: 'marcelo@demo.com',  role: 'MECANICO', jobFunction: 'PINTOR',      workshopArea: 'FUNILARIA_PINTURA',  commissionPercent: 8  },
    { id: 'usr-mec-06', name: 'Diego Santos',       email: 'diego@demo.com',    role: 'MECANICO', jobFunction: 'APRENDIZ',    workshopArea: 'MECANICA',           commissionPercent: 5  },
    { id: 'usr-mec-07', name: 'Felipe Rodrigues',   email: 'felipe@demo.com',   role: 'MECANICO', jobFunction: 'MECANICO',    workshopArea: 'MECANICA',           commissionPercent: 10 },
    { id: 'usr-mec-08', name: 'Lucas Pereira',      email: 'lucas@demo.com',    role: 'MECANICO', jobFunction: 'LAVADOR',     workshopArea: 'LAVACAO',            commissionPercent: 6  },
    { id: 'usr-mec-09', name: 'Paulo Nascimento',   email: 'paulo@demo.com',    role: 'MECANICO', jobFunction: 'ELETRICISTA', workshopArea: 'ELETRICA',           commissionPercent: 10 },
    { id: 'usr-mec-10', name: 'Rafael Mendes',      email: 'rafael@demo.com',   role: 'MECANICO', jobFunction: 'MECANICO',    workshopArea: 'MECANICA',           commissionPercent: 9  },
  ];
  const executors = {};
  for (const u of executorData) {
    const { commissionPercent, ...rest } = u;
    executors[u.id] = await prisma.user.upsert({
      where: { tenantId_email: { tenantId: demoTenant.id, email: u.email } },
      update: {},
      create: { tenantId: demoTenant.id, passwordHash: userPwd, isActive: true, commissionPercent, ...rest },
    });
  }
  console.log(`✅ ${executorData.length} executores criados`);

  // ── Taxas de Comissão individuais ─────────────────────────────────────────
  for (const u of executorData) {
    await prisma.commissionRate.upsert({
      where: { userId: executors[u.id].id },
      update: { rate: u.commissionPercent },
      create: { tenantId: demoTenant.id, userId: executors[u.id].id, rate: u.commissionPercent },
    });
  }
  console.log('✅ Taxas de comissão configuradas');


  // ── Peças (Catálogo) ───────────────────────────────────────────────────────
  for (const part of PARTS_CATALOG) {
    await prisma.part.upsert({
      where: { tenantId_sku: { tenantId: demoTenant.id, sku: part.internalCode } }, update: { unitPrice: part.unitPrice },
      create: { tenantId: demoTenant.id, name: part.name, internalCode: part.internalCode, sku: part.internalCode, category: part.category, unit: part.unit, unitPrice: part.unitPrice, costPrice: part.costPrice, minStock: 5, currentStock: 20, isActive: true },
    });
  }
  // Buscar referências de peças usadas nas OS
  const pFreioDiant = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'FRE-001' } });
  const pFreioTras  = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'FRE-002' } });
  const pDiscoDiant = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'FRE-003' } });
  const pFluidoFre  = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'FRE-005' } });
  const pOleo5W30   = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'MOT-001' } });
  const pOleo10W40  = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'MOT-002' } });
  const pFiltroOleo = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'MOT-003' } });
  const pFiltroAr   = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'MOT-004' } });
  const pVela       = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'MOT-006' } });
  const pCorreia    = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'MOT-007' } });
  const pAmortDiant = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'SUS-001' } });
  const pAmortTras  = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'SUS-002' } });
  const pBateria60  = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'ELE-001' } });
  const pSensorLambda = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'SEN-003' } });
  const pKitEmbreagem = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'TRA-003' } });
  const pFiltroAb   = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: 'REV-001' } });
  console.log(`✅ ${PARTS_CATALOG.length} peças no catálogo`);

  // ── Serviços ───────────────────────────────────────────────────────────────
  const services = [
    { id: 'svc-001', name: 'Troca de Óleo e Filtro',              basePrice: 80.00,  category: 'Revisão',       tmo: 0.5 },
    { id: 'svc-002', name: 'Alinhamento e Balanceamento',          basePrice: 120.00, category: 'Suspensão',     tmo: 1.0 },
    { id: 'svc-003', name: 'Revisão de Freios Dianteiros',         basePrice: 150.00, category: 'Freios',        tmo: 1.5 },
    { id: 'svc-004', name: 'Revisão de Freios Traseiros',          basePrice: 130.00, category: 'Freios',        tmo: 1.0 },
    { id: 'svc-005', name: 'Troca de Correia Dentada',             basePrice: 200.00, category: 'Motor',         tmo: 2.0 },
    { id: 'svc-006', name: 'Diagnóstico Eletrônico (Scanner)',     basePrice: 100.00, category: 'Diagnóstico',   tmo: 1.0 },
    { id: 'svc-007', name: 'Higienização do Ar Condicionado',      basePrice: 180.00, category: 'Ar Condicionado', tmo: 1.5 },
    { id: 'svc-008', name: 'Troca de Velas de Ignição',            basePrice: 80.00,  category: 'Motor',         tmo: 0.5 },
    { id: 'svc-009', name: 'Regulagem de Motor',                   basePrice: 250.00, category: 'Motor',         tmo: 2.5 },
    { id: 'svc-010', name: 'Troca de Embreagem',                   basePrice: 300.00, category: 'Transmissão',   tmo: 4.0 },
    { id: 'svc-011', name: 'Troca de Amortecedores (par)',         basePrice: 220.00, category: 'Suspensão',     tmo: 2.0 },
    { id: 'svc-012', name: 'Substituição de Bateria',              basePrice: 60.00,  category: 'Elétrico',      tmo: 0.5 },
  ];
  for (const s of services) {
    await prisma.service.upsert({ where: { id: s.id }, update: {}, create: { id: s.id, tenantId: demoTenant.id, name: s.name, basePrice: s.basePrice, category: s.category, duration: Math.round(s.tmo * 60), hourlyRate: 120, tmo: s.tmo } });
  }
  console.log(`✅ ${services.length} serviços`);

  // ── Clientes ───────────────────────────────────────────────────────────────
  const customersData = [
    { id: 'cust-001', name: 'João Silva',           document: '123.456.789-00', phone: '(11) 99999-1111', email: 'joao.silva@email.com' },
    { id: 'cust-002', name: 'Maria Santos',         document: '987.654.321-00', phone: '(11) 99999-2222', email: 'maria.santos@email.com' },
    { id: 'cust-003', name: 'Carlos Ferreira',      document: '321.654.987-11', phone: '(21) 98888-3333', email: 'carlos.ferreira@gmail.com' },
    { id: 'cust-004', name: 'Ana Paula Rodrigues',  document: '456.789.123-22', phone: '(11) 97777-4444', email: 'anapaula.rodrigues@outlook.com' },
    { id: 'cust-005', name: 'Roberto Almeida',      document: '654.321.987-33', phone: '(21) 96666-5555', email: 'roberto.almeida@email.com' },
    { id: 'cust-006', name: 'Fernanda Costa',       document: '789.123.456-44', phone: '(11) 95555-6666', email: 'fernanda.costa@gmail.com' },
    { id: 'cust-007', name: 'Marcelo Oliveira',     document: '147.258.369-55', phone: '(21) 94444-7777', email: 'marcelo.oliveira@email.com' },
    { id: 'cust-008', name: 'Juliana Pereira',      document: '258.369.147-66', phone: '(11) 93333-8888', email: 'juliana.pereira@gmail.com' },
    { id: 'cust-009', name: 'Paulo Eduardo Santos', document: '369.147.258-77', phone: '(21) 92222-9999', email: 'paulo.santos@email.com' },
    { id: 'cust-010', name: 'Luciana Mendes',       document: '741.852.963-88', phone: '(11) 91111-0000', email: 'luciana.mendes@email.com' },
    { id: 'cust-011', name: 'Rafael Gomes',         document: '852.963.741-99', phone: '(21) 90000-1111', email: 'rafael.gomes@gmail.com' },
    { id: 'cust-012', name: 'Patrícia Lima',        document: '963.741.852-00', phone: '(11) 89999-2222', email: 'patricia.lima@email.com' },
  ];
  const customers = {};
  for (const c of customersData) {
    customers[c.id] = await prisma.customer.upsert({ where: { id: c.id }, update: {}, create: { id: c.id, tenantId: demoTenant.id, ...c } });
  }
  console.log(`✅ ${customersData.length} clientes`);

  // ── Veículos ───────────────────────────────────────────────────────────────
  const vehiclesData = [
    { id: 'veh-001', customerId: 'cust-001', plate: 'ABC-1234', brand: 'Volkswagen', model: 'Gol',      year: 2019, color: 'Prata',  km: 78000 },
    { id: 'veh-002', customerId: 'cust-002', plate: 'DEF-5678', brand: 'Chevrolet',  model: 'Onix',     year: 2022, color: 'Branco', km: 22000 },
    { id: 'veh-003', customerId: 'cust-003', plate: 'GHI-9012', brand: 'Fiat',       model: 'Argo',     year: 2021, color: 'Vermelho', km: 45000 },
    { id: 'veh-004', customerId: 'cust-003', plate: 'RIO1A23',  brand: 'Toyota',     model: 'Hilux',    year: 2020, color: 'Preto',  km: 95000 },
    { id: 'veh-005', customerId: 'cust-004', plate: 'JKL-3456', brand: 'Hyundai',    model: 'HB20',     year: 2023, color: 'Azul',   km: 12000 },
    { id: 'veh-006', customerId: 'cust-005', plate: 'MNO-7890', brand: 'Toyota',     model: 'Corolla',  year: 2020, color: 'Cinza',  km: 68000 },
    { id: 'veh-007', customerId: 'cust-006', plate: 'PQR-1234', brand: 'Volkswagen', model: 'T-Cross',  year: 2022, color: 'Branco', km: 35000 },
    { id: 'veh-008', customerId: 'cust-007', plate: 'STU-5678', brand: 'Jeep',       model: 'Renegade', year: 2021, color: 'Laranja', km: 52000 },
    { id: 'veh-009', customerId: 'cust-007', plate: 'SPO2B34',  brand: 'Honda',      model: 'Civic',    year: 2019, color: 'Preto',  km: 88000 },
    { id: 'veh-010', customerId: 'cust-008', plate: 'VWX-9012', brand: 'Renault',    model: 'Kwid',     year: 2023, color: 'Laranja', km: 8000 },
    { id: 'veh-011', customerId: 'cust-009', plate: 'YZA-3456', brand: 'Fiat',       model: 'Toro',     year: 2021, color: 'Preto',  km: 61000 },
    { id: 'veh-012', customerId: 'cust-010', plate: 'BCD-7890', brand: 'Chevrolet',  model: 'Tracker',  year: 2022, color: 'Cinza',  km: 28000 },
    { id: 'veh-013', customerId: 'cust-011', plate: 'EFG-1234', brand: 'Nissan',     model: 'Kicks',    year: 2020, color: 'Branco', km: 55000 },
    { id: 'veh-014', customerId: 'cust-012', plate: 'HIJ-5678', brand: 'Fiat',       model: 'Pulse',    year: 2023, color: 'Azul',   km: 14000 },
    { id: 'veh-015', customerId: 'cust-001', plate: 'KLM-9012', brand: 'Honda',      model: 'HR-V',     year: 2018, color: 'Prata',  km: 102000 },
  ];
  const vehicles = {};
  for (const v of vehiclesData) {
    vehicles[v.id] = await prisma.vehicle.upsert({
      where: { tenantId_plate: { tenantId: demoTenant.id, plate: v.plate } }, update: {},
      create: { id: v.id, tenantId: demoTenant.id, ...v },
    });
  }
  console.log(`✅ ${vehiclesData.length} veículos`);

  // ── Ordens de Serviço com Itens ────────────────────────────────────────────
  // Executor helpers
  const E = executors;
  const osData = [
    // ── BLOCO 1: ENTREGUE (90 → 46 dias atrás) ───────────────────────────────
    {
      id: 'os-001', customerId: 'cust-001', vehicleId: 'veh-001', status: 'ENTREGUE',
      complaint: 'Carro fazendo barulho ao frear e óleo vencido', kmEntrada: 77800,
      startedAt: daysAgo(90), completedAt: daysAgo(88), deliveredAt: daysAgo(88), paidAt: daysAgo(88),
      executorId: E['usr-mec-01'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',       quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-003', description: 'Revisão de Freios Dianteiros', quantity: 1, unitPrice: 150.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',        quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',            quantity: 1, unitPrice: 39.90 },
        { type: 'PART',    partId: pFreioDiant?.id, description: 'Pastilha de Freio Dianteira', quantity: 1, unitPrice: 189.90 },
        { type: 'PART',    partId: pFluidoFre?.id,  description: 'Fluido de Freio DOT4',      quantity: 1, unitPrice: 38.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-002', customerId: 'cust-003', vehicleId: 'veh-003', status: 'ENTREGUE',
      complaint: 'Carro superaquecendo e barulho no motor', kmEntrada: 44800,
      startedAt: daysAgo(85), completedAt: daysAgo(83), deliveredAt: daysAgo(83), paidAt: daysAgo(83),
      executorId: E['usr-mec-01'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-005', description: 'Troca de Correia Dentada', quantity: 1, unitPrice: 200.00 },
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Eletrônico',  quantity: 1, unitPrice: 100.00 },
        { type: 'PART',    partId: pCorreia?.id,   description: 'Kit Correia + Tensionador', quantity: 1, unitPrice: 380.00 },
        { type: 'LABOR',   description: 'Mão de obra — motor', quantity: 3, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-003', customerId: 'cust-005', vehicleId: 'veh-006', status: 'ENTREGUE',
      complaint: 'Carro balançando muito, barulho na suspensão', kmEntrada: 67500,
      startedAt: daysAgo(80), completedAt: daysAgo(78), deliveredAt: daysAgo(78), paidAt: daysAgo(78),
      executorId: E['usr-mec-07'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-011', description: 'Troca de Amortecedores', quantity: 1, unitPrice: 220.00 },
        { type: 'SERVICE', serviceId: 'svc-002', description: 'Alinhamento e Balanceamento', quantity: 1, unitPrice: 120.00 },
        { type: 'PART',    partId: pAmortDiant?.id, description: 'Amortecedor Dianteiro', quantity: 2, unitPrice: 320.00 },
        { type: 'PART',    partId: pAmortTras?.id,  description: 'Amortecedor Traseiro',  quantity: 2, unitPrice: 280.00 },
        { type: 'LABOR',   description: 'Mão de obra — suspensão', quantity: 3, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-004', customerId: 'cust-007', vehicleId: 'veh-008', status: 'ENTREGUE',
      complaint: 'Carro não liga, luzes fracas', kmEntrada: 51500,
      startedAt: daysAgo(75), completedAt: daysAgo(74), deliveredAt: daysAgo(74), paidAt: daysAgo(74),
      executorId: E['usr-mec-02'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Elétrico',   quantity: 1, unitPrice: 100.00 },
        { type: 'SERVICE', serviceId: 'svc-012', description: 'Substituição de Bateria', quantity: 1, unitPrice: 60.00 },
        { type: 'PART',    partId: pBateria60?.id, description: 'Bateria 60Ah Selada',  quantity: 1, unitPrice: 520.00 },
        { type: 'LABOR',   description: 'Mão de obra — elétrico', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-014', customerId: 'cust-002', vehicleId: 'veh-002', status: 'ENTREGUE',
      complaint: 'Revisão preventiva 20.000 km', kmEntrada: 21500,
      startedAt: daysAgo(72), completedAt: daysAgo(71), deliveredAt: daysAgo(71), paidAt: daysAgo(71),
      executorId: E['usr-mec-10'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',    quantity: 1, unitPrice: 80.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',     quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',          quantity: 1, unitPrice: 39.90 },
        { type: 'PART',    partId: pFiltroAb?.id,   description: 'Filtro de Cabine',        quantity: 1, unitPrice: 49.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-015', customerId: 'cust-004', vehicleId: 'veh-005', status: 'ENTREGUE',
      complaint: 'Freios raspando, pedal fundo', kmEntrada: 11500,
      startedAt: daysAgo(68), completedAt: daysAgo(67), deliveredAt: daysAgo(67), paidAt: daysAgo(67),
      executorId: E['usr-mec-03'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-003', description: 'Revisão de Freios Dianteiros', quantity: 1, unitPrice: 150.00 },
        { type: 'SERVICE', serviceId: 'svc-004', description: 'Revisão de Freios Traseiros',  quantity: 1, unitPrice: 130.00 },
        { type: 'PART',    partId: pFreioDiant?.id, description: 'Pastilha Dianteira', quantity: 1, unitPrice: 189.90 },
        { type: 'PART',    partId: pFreioTras?.id,  description: 'Pastilha Traseira',  quantity: 1, unitPrice: 149.90 },
        { type: 'PART',    partId: pFluidoFre?.id,  description: 'Fluido de Freio',    quantity: 1, unitPrice: 38.90 },
        { type: 'LABOR',   description: 'Mão de obra — freios', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-016', customerId: 'cust-006', vehicleId: 'veh-007', status: 'ENTREGUE',
      complaint: 'Luz do motor acesa — sensor de oxigênio', kmEntrada: 34500,
      startedAt: daysAgo(65), completedAt: daysAgo(64), deliveredAt: daysAgo(64), paidAt: daysAgo(64),
      executorId: E['usr-mec-09'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Eletrônico',       quantity: 1, unitPrice: 100.00 },
        { type: 'PART',    partId: pSensorLambda?.id, description: 'Sensor Lambda',           quantity: 1, unitPrice: 320.00 },
        { type: 'LABOR',   description: 'Mão de obra — sensores', quantity: 1.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-017', customerId: 'cust-009', vehicleId: 'veh-011', status: 'ENTREGUE',
      complaint: 'Embreagem patinando, dificuldade de engrenar', kmEntrada: 60500,
      startedAt: daysAgo(60), completedAt: daysAgo(58), deliveredAt: daysAgo(58), paidAt: daysAgo(58),
      executorId: E['usr-mec-07'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-010', description: 'Troca de Embreagem', quantity: 1, unitPrice: 300.00 },
        { type: 'PART',    partId: pKitEmbreagem?.id, description: 'Kit Embreagem completo', quantity: 1, unitPrice: 680.00 },
        { type: 'LABOR',   description: 'Mão de obra — transmissão', quantity: 5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-018', customerId: 'cust-010', vehicleId: 'veh-012', status: 'ENTREGUE',
      complaint: 'Revisão dos 30.000 km + troca de velas', kmEntrada: 29800,
      startedAt: daysAgo(55), completedAt: daysAgo(54), deliveredAt: daysAgo(54), paidAt: daysAgo(54),
      executorId: E['usr-mec-01'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',    quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-008', description: 'Troca de Velas de Ignição', quantity: 1, unitPrice: 80.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',     quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',          quantity: 1, unitPrice: 39.90 },
        { type: 'PART',    partId: pFiltroAr?.id,   description: 'Filtro de Ar Motor',     quantity: 1, unitPrice: 59.90 },
        { type: 'PART',    partId: pVela?.id,        description: 'Vela de Ignição',        quantity: 4, unitPrice: 45.00 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-019', customerId: 'cust-011', vehicleId: 'veh-013', status: 'ENTREGUE',
      complaint: 'Vibração no volante em alta velocidade', kmEntrada: 54500,
      startedAt: daysAgo(50), completedAt: daysAgo(49), deliveredAt: daysAgo(49), paidAt: daysAgo(49),
      executorId: E['usr-mec-03'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-002', description: 'Alinhamento e Balanceamento', quantity: 1, unitPrice: 120.00 },
        { type: 'LABOR',   description: 'Mão de obra — suspensão', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-020', customerId: 'cust-001', vehicleId: 'veh-015', status: 'ENTREGUE',
      complaint: 'Revisão 100.000 km — motor + freios + suspensão', kmEntrada: 101800,
      startedAt: daysAgo(47), completedAt: daysAgo(45), deliveredAt: daysAgo(45), paidAt: daysAgo(45),
      executorId: E['usr-mec-07'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',       quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-005', description: 'Troca de Correia Dentada',      quantity: 1, unitPrice: 200.00 },
        { type: 'SERVICE', serviceId: 'svc-003', description: 'Revisão de Freios Dianteiros', quantity: 1, unitPrice: 150.00 },
        { type: 'SERVICE', serviceId: 'svc-011', description: 'Troca de Amortecedores',       quantity: 1, unitPrice: 220.00 },
        { type: 'PART',    partId: pCorreia?.id,    description: 'Kit Correia + Tensionador',  quantity: 1, unitPrice: 380.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',        quantity: 5, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',            quantity: 1, unitPrice: 39.90 },
        { type: 'PART',    partId: pAmortDiant?.id, description: 'Amortecedor Dianteiro',     quantity: 2, unitPrice: 320.00 },
        { type: 'PART',    partId: pFreioDiant?.id, description: 'Pastilha Dianteira',        quantity: 1, unitPrice: 189.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão completa', quantity: 6, unitPrice: 120.00 },
      ],
    },
    // ── BLOCO 2: ENTREGUE recente (15 → 46 dias) ─────────────────────────────
    {
      id: 'os-021', customerId: 'cust-012', vehicleId: 'veh-014', status: 'ENTREGUE',
      complaint: 'Ar condicionado não refrigera bem', kmEntrada: 13900,
      startedAt: daysAgo(44), completedAt: daysAgo(43), deliveredAt: daysAgo(43), paidAt: daysAgo(43),
      executorId: E['usr-mec-09'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-007', description: 'Higienização do Ar Condicionado', quantity: 1, unitPrice: 180.00 },
        { type: 'LABOR',   description: 'Mão de obra — AC', quantity: 1.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-022', customerId: 'cust-003', vehicleId: 'veh-004', status: 'ENTREGUE',
      complaint: 'Revisão completa 90.000 km Hilux', kmEntrada: 94800,
      startedAt: daysAgo(42), completedAt: daysAgo(40), deliveredAt: daysAgo(40), paidAt: daysAgo(40),
      executorId: E['usr-mec-01'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',       quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-003', description: 'Revisão de Freios Dianteiros', quantity: 1, unitPrice: 150.00 },
        { type: 'SERVICE', serviceId: 'svc-004', description: 'Revisão de Freios Traseiros',  quantity: 1, unitPrice: 130.00 },
        { type: 'PART',    partId: pOleo10W40?.id,  description: 'Óleo 10W40 1L',             quantity: 7, unitPrice: 32.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',            quantity: 1, unitPrice: 39.90 },
        { type: 'PART',    partId: pFreioDiant?.id, description: 'Pastilha Dianteira',        quantity: 1, unitPrice: 189.90 },
        { type: 'PART',    partId: pFreioTras?.id,  description: 'Pastilha Traseira',         quantity: 1, unitPrice: 149.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão completa', quantity: 4, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-023', customerId: 'cust-008', vehicleId: 'veh-010', status: 'ENTREGUE',
      complaint: 'Batendo em frio, barulho no motor', kmEntrada: 7800,
      startedAt: daysAgo(38), completedAt: daysAgo(37), deliveredAt: daysAgo(37), paidAt: daysAgo(37),
      executorId: E['usr-mec-10'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Eletrônico', quantity: 1, unitPrice: 100.00 },
        { type: 'SERVICE', serviceId: 'svc-009', description: 'Regulagem de Motor',     quantity: 1, unitPrice: 250.00 },
        { type: 'PART',    partId: pVela?.id,        description: 'Vela de Ignição',   quantity: 4, unitPrice: 45.00 },
        { type: 'LABOR',   description: 'Mão de obra — motor', quantity: 2.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-024', customerId: 'cust-005', vehicleId: 'veh-006', status: 'ENTREGUE',
      complaint: 'Troca de pneus + alinhamento', kmEntrada: 68500,
      startedAt: daysAgo(34), completedAt: daysAgo(33), deliveredAt: daysAgo(33), paidAt: daysAgo(33),
      executorId: E['usr-mec-03'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-002', description: 'Alinhamento e Balanceamento', quantity: 1, unitPrice: 120.00 },
        { type: 'LABOR',   description: 'Mão de obra — pneus', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-025', customerId: 'cust-007', vehicleId: 'veh-009', status: 'ENTREGUE',
      complaint: 'Alternador com defeito', kmEntrada: 87800,
      startedAt: daysAgo(30), completedAt: daysAgo(28), deliveredAt: daysAgo(28), paidAt: daysAgo(28),
      executorId: E['usr-mec-02'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Elétrico',  quantity: 1, unitPrice: 100.00 },
        { type: 'PART',    partId: pBateria60?.id, description: 'Bateria 60Ah Selada', quantity: 1, unitPrice: 520.00 },
        { type: 'LABOR',   description: 'Mão de obra — elétrico', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-026', customerId: 'cust-009', vehicleId: 'veh-011', status: 'ENTREGUE',
      complaint: 'Higienização + limpeza interna', kmEntrada: 61500,
      startedAt: daysAgo(26), completedAt: daysAgo(25), deliveredAt: daysAgo(25), paidAt: daysAgo(25),
      executorId: E['usr-mec-08'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-007', description: 'Higienização do Ar Condicionado', quantity: 1, unitPrice: 180.00 },
        { type: 'LABOR',   description: 'Mão de obra — higienização', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-027', customerId: 'cust-012', vehicleId: 'veh-014', status: 'ENTREGUE',
      complaint: 'Freio de mão não segura na rampa', kmEntrada: 14100,
      startedAt: daysAgo(22), completedAt: daysAgo(21), deliveredAt: daysAgo(21), paidAt: daysAgo(21),
      executorId: E['usr-mec-03'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-004', description: 'Revisão de Freios Traseiros', quantity: 1, unitPrice: 130.00 },
        { type: 'PART',    partId: pFreioTras?.id, description: 'Pastilha Traseira', quantity: 1, unitPrice: 149.90 },
        { type: 'LABOR',   description: 'Mão de obra — freio de mão', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-028', customerId: 'cust-001', vehicleId: 'veh-001', status: 'ENTREGUE',
      complaint: 'Troca de filtro de combustível + filtro de ar', kmEntrada: 78200,
      startedAt: daysAgo(18), completedAt: daysAgo(17), deliveredAt: daysAgo(17), paidAt: daysAgo(17),
      executorId: E['usr-mec-10'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro', quantity: 1, unitPrice: 80.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',  quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',       quantity: 1, unitPrice: 39.90 },
        { type: 'PART',    partId: pFiltroAr?.id,   description: 'Filtro de Ar Motor',  quantity: 1, unitPrice: 59.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-029', customerId: 'cust-006', vehicleId: 'veh-007', status: 'ENTREGUE',
      complaint: 'Regulagem e troca de velas iridium', kmEntrada: 35200,
      startedAt: daysAgo(14), completedAt: daysAgo(13), deliveredAt: daysAgo(13), paidAt: daysAgo(13),
      executorId: E['usr-mec-01'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-008', description: 'Troca de Velas de Ignição', quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-009', description: 'Regulagem de Motor',        quantity: 1, unitPrice: 250.00 },
        { type: 'PART',    partId: pVela?.id, description: 'Vela Iridium',                 quantity: 4, unitPrice: 89.00 },
        { type: 'LABOR',   description: 'Mão de obra — motor', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-030', customerId: 'cust-002', vehicleId: 'veh-002', status: 'ENTREGUE',
      complaint: 'Revisão 22.000 km Onix', kmEntrada: 21800,
      startedAt: daysAgo(10), completedAt: daysAgo(9), deliveredAt: daysAgo(9), paidAt: daysAgo(9),
      executorId: E['usr-mec-07'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro', quantity: 1, unitPrice: 80.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L', quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',      quantity: 1, unitPrice: 39.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 0.5, unitPrice: 120.00 },
      ],
    },
    // ── BLOCO 3: FATURADO ─────────────────────────────────────────────────────
    {
      id: 'os-005', customerId: 'cust-009', vehicleId: 'veh-011', status: 'FATURADO',
      complaint: 'Embreagem patinando (retorno cliente)', kmEntrada: 62000,
      startedAt: daysAgo(8), completedAt: daysAgo(6), paidAt: daysAgo(6),
      executorId: E['usr-mec-07'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-010', description: 'Troca de Embreagem',          quantity: 1, unitPrice: 300.00 },
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Transmissão',     quantity: 1, unitPrice: 100.00 },
        { type: 'PART',    partId: pKitEmbreagem?.id, description: 'Kit Embreagem completo', quantity: 1, unitPrice: 680.00 },
        { type: 'LABOR',   description: 'Mão de obra — transmissão', quantity: 5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-006', customerId: 'cust-010', vehicleId: 'veh-012', status: 'FATURADO',
      complaint: 'Revisão preventiva dos 30.000 km', kmEntrada: 28000,
      startedAt: daysAgo(6), completedAt: daysAgo(5), paidAt: daysAgo(5),
      executorId: E['usr-mec-01'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',    quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-008', description: 'Troca de Velas de Ignição', quantity: 1, unitPrice: 80.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',     quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',          quantity: 1, unitPrice: 39.90 },
        { type: 'PART',    partId: pFiltroAr?.id,   description: 'Filtro de Ar Motor',     quantity: 1, unitPrice: 59.90 },
        { type: 'PART',    partId: pFiltroAb?.id,   description: 'Filtro Cabine',           quantity: 1, unitPrice: 49.90 },
        { type: 'PART',    partId: pVela?.id,        description: 'Vela de Ignição',        quantity: 4, unitPrice: 45.00 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-031', customerId: 'cust-004', vehicleId: 'veh-005', status: 'FATURADO',
      complaint: 'Suspensão desgastada — carro baixando', kmEntrada: 12400,
      startedAt: daysAgo(5), completedAt: daysAgo(4), paidAt: daysAgo(4),
      executorId: E['usr-mec-07'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-011', description: 'Troca de Amortecedores', quantity: 1, unitPrice: 220.00 },
        { type: 'PART',    partId: pAmortDiant?.id, description: 'Amortecedor Dianteiro', quantity: 2, unitPrice: 320.00 },
        { type: 'LABOR',   description: 'Mão de obra — suspensão', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-032', customerId: 'cust-011', vehicleId: 'veh-013', status: 'FATURADO',
      complaint: 'Diagnóstico — luz check engine', kmEntrada: 55500,
      startedAt: daysAgo(4), completedAt: daysAgo(3), paidAt: daysAgo(3),
      executorId: E['usr-mec-09'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Eletrônico', quantity: 1, unitPrice: 100.00 },
        { type: 'PART',    partId: pSensorLambda?.id, description: 'Sensor Lambda',     quantity: 1, unitPrice: 320.00 },
        { type: 'LABOR',   description: 'Mão de obra — elétrico', quantity: 1.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-033', customerId: 'cust-003', vehicleId: 'veh-003', status: 'FATURADO',
      complaint: 'Troca de bateria + revisão elétrica', kmEntrada: 45200,
      startedAt: daysAgo(3), completedAt: daysAgo(2), paidAt: daysAgo(2),
      executorId: E['usr-mec-02'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-012', description: 'Substituição de Bateria', quantity: 1, unitPrice: 60.00 },
        { type: 'PART',    partId: pBateria60?.id, description: 'Bateria 60Ah Selada',   quantity: 1, unitPrice: 520.00 },
        { type: 'LABOR',   description: 'Mão de obra — elétrico', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-034', customerId: 'cust-007', vehicleId: 'veh-008', status: 'FATURADO',
      complaint: 'Troca de palhetas + limpeza geral', kmEntrada: 52100,
      startedAt: daysAgo(2), completedAt: daysAgo(1), paidAt: daysAgo(1),
      executorId: E['usr-mec-08'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro', quantity: 1, unitPrice: 80.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L', quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',      quantity: 1, unitPrice: 39.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 0.5, unitPrice: 120.00 },
      ],
    },
    // ── BLOCO 4: PRONTO_ENTREGA ───────────────────────────────────────────────
    {
      id: 'os-007', customerId: 'cust-004', vehicleId: 'veh-005', status: 'PRONTO_ENTREGA',
      complaint: 'Freio traseiro raspando e pedal fundo', kmEntrada: 11800,
      startedAt: daysAgo(3), completedAt: daysAgo(1), executorId: E['usr-mec-03'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-004', description: 'Revisão de Freios Traseiros', quantity: 1, unitPrice: 130.00 },
        { type: 'PART',    partId: pFreioTras?.id,  description: 'Pastilha Traseira',        quantity: 1, unitPrice: 149.90 },
        { type: 'PART',    partId: pDiscoDiant?.id, description: 'Disco de Freio Traseiro',  quantity: 1, unitPrice: 280.00 },
        { type: 'LABOR',   description: 'Mão de obra — freios', quantity: 1.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-035', customerId: 'cust-008', vehicleId: 'veh-010', status: 'PRONTO_ENTREGA',
      complaint: 'Alinhamento + balanceamento', kmEntrada: 8100,
      startedAt: daysAgo(2), completedAt: daysAgo(1), executorId: E['usr-mec-03'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-002', description: 'Alinhamento e Balanceamento', quantity: 1, unitPrice: 120.00 },
        { type: 'LABOR',   description: 'Mão de obra', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-036', customerId: 'cust-012', vehicleId: 'veh-014', status: 'PRONTO_ENTREGA',
      complaint: 'Higienização do habitáculo', kmEntrada: 14300,
      startedAt: daysAgo(2), completedAt: daysAgo(1), executorId: E['usr-mec-08'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-007', description: 'Higienização do Ar Condicionado', quantity: 1, unitPrice: 180.00 },
        { type: 'LABOR',   description: 'Mão de obra — higienização', quantity: 1.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-037', customerId: 'cust-002', vehicleId: 'veh-002', status: 'PRONTO_ENTREGA',
      complaint: 'Revisão 22.500 km + troca de filtros', kmEntrada: 22400,
      startedAt: daysAgo(3), completedAt: daysAgo(1), executorId: E['usr-mec-10'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro', quantity: 1, unitPrice: 80.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L', quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',      quantity: 1, unitPrice: 39.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 1, unitPrice: 120.00 },
      ],
    },
    // ── BLOCO 5: EM_EXECUCAO ──────────────────────────────────────────────────
    {
      id: 'os-008', customerId: 'cust-006', vehicleId: 'veh-007', status: 'EM_EXECUCAO',
      complaint: 'Sensor de oxigênio com falha (luz amarela no painel)', kmEntrada: 34800,
      startedAt: daysAgo(1), executorId: E['usr-mec-09'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Eletrônico',        quantity: 1, unitPrice: 100.00 },
        { type: 'PART',    partId: pSensorLambda?.id, description: 'Sensor Lambda (Oxigênio)', quantity: 1, unitPrice: 320.00 },
        { type: 'LABOR',   description: 'Mão de obra — elétrico/sensores', quantity: 1.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-013', customerId: 'cust-003', vehicleId: 'veh-004', status: 'EM_EXECUCAO',
      complaint: 'Revisão completa 90.000 km + freios Hilux', kmEntrada: 94800,
      startedAt: daysAgo(2), executorId: E['usr-mec-01'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',       quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-003', description: 'Revisão de Freios Dianteiros', quantity: 1, unitPrice: 150.00 },
        { type: 'SERVICE', serviceId: 'svc-004', description: 'Revisão de Freios Traseiros',  quantity: 1, unitPrice: 130.00 },
        { type: 'PART',    partId: pOleo10W40?.id,  description: 'Óleo 10W40 1L',             quantity: 7, unitPrice: 32.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',            quantity: 1, unitPrice: 39.90 },
        { type: 'PART',    partId: pFreioDiant?.id, description: 'Pastilha Dianteira',        quantity: 1, unitPrice: 189.90 },
        { type: 'PART',    partId: pFreioTras?.id,  description: 'Pastilha Traseira',         quantity: 1, unitPrice: 149.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão completa', quantity: 4, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-038', customerId: 'cust-001', vehicleId: 'veh-015', status: 'EM_EXECUCAO',
      complaint: 'Correia dentada nova — preventivo 100.000 km', kmEntrada: 102100,
      startedAt: daysAgo(1), executorId: E['usr-mec-07'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-005', description: 'Troca de Correia Dentada',  quantity: 1, unitPrice: 200.00 },
        { type: 'PART',    partId: pCorreia?.id, description: 'Kit Correia + Tensionador', quantity: 1, unitPrice: 380.00 },
        { type: 'LABOR',   description: 'Mão de obra — motor', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-039', customerId: 'cust-010', vehicleId: 'veh-012', status: 'EM_EXECUCAO',
      complaint: 'Rolamento de roda barulhando', kmEntrada: 28600,
      startedAt: daysAgo(1), executorId: E['usr-mec-03'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-002', description: 'Alinhamento e Balanceamento', quantity: 1, unitPrice: 120.00 },
        { type: 'LABOR',   description: 'Mão de obra — rolamento', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-040', customerId: 'cust-011', vehicleId: 'veh-013', status: 'EM_EXECUCAO',
      complaint: 'Suspensão traseira com folga', kmEntrada: 56000,
      startedAt: daysAgo(2), executorId: E['usr-mec-07'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-011', description: 'Troca de Amortecedores', quantity: 1, unitPrice: 220.00 },
        { type: 'PART',    partId: pAmortTras?.id, description: 'Amortecedor Traseiro',  quantity: 2, unitPrice: 280.00 },
        { type: 'LABOR',   description: 'Mão de obra — suspensão', quantity: 2, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-041', customerId: 'cust-007', vehicleId: 'veh-009', status: 'EM_EXECUCAO',
      complaint: 'Civic — revisão dos 90.000 km', kmEntrada: 88200,
      startedAt: daysAgo(1), executorId: E['usr-mec-01'].id,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',    quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-005', description: 'Troca de Correia Dentada',   quantity: 1, unitPrice: 200.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',     quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pCorreia?.id,    description: 'Kit Correia + Tensionador', quantity: 1, unitPrice: 380.00 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',          quantity: 1, unitPrice: 39.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 3, unitPrice: 120.00 },
      ],
    },
    // ── BLOCO 6: AGUARDANDO_PECAS ─────────────────────────────────────────────
    {
      id: 'os-009', customerId: 'cust-011', vehicleId: 'veh-013', status: 'AGUARDANDO_PECAS',
      complaint: 'Carro vibrando — cubo de roda', kmEntrada: 54700,
      startedAt: daysAgo(4),
      items: [
        { type: 'SERVICE', serviceId: 'svc-002', description: 'Alinhamento e Balanceamento', quantity: 1, unitPrice: 120.00 },
        { type: 'LABOR',   description: 'Mão de obra — diagnóstico suspensão', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-042', customerId: 'cust-005', vehicleId: 'veh-006', status: 'AGUARDANDO_PECAS',
      complaint: 'Radiador com vazamento', kmEntrada: 69000,
      startedAt: daysAgo(5),
      items: [
        { type: 'LABOR', description: 'Diagnóstico — vazamento radiador', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-043', customerId: 'cust-009', vehicleId: 'veh-011', status: 'AGUARDANDO_PECAS',
      complaint: 'Bomba de combustível defeituosa', kmEntrada: 62800,
      startedAt: daysAgo(3),
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Eletrônico', quantity: 1, unitPrice: 100.00 },
        { type: 'LABOR',   description: 'Mão de obra — combustível', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-044', customerId: 'cust-003', vehicleId: 'veh-003', status: 'AGUARDANDO_PECAS',
      complaint: 'Bomba d\'água com vazamento', kmEntrada: 45800,
      startedAt: daysAgo(4),
      items: [
        { type: 'LABOR', description: 'Diagnóstico — sistema de arrefecimento', quantity: 1, unitPrice: 120.00 },
      ],
    },
    // ── BLOCO 7: AGUARDANDO_APROVACAO ────────────────────────────────────────
    {
      id: 'os-010', customerId: 'cust-012', vehicleId: 'veh-014', status: 'AGUARDANDO_APROVACAO',
      complaint: 'Revisão preventiva dos 15.000 km', kmEntrada: 14000,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',    quantity: 1, unitPrice: 80.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',     quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',          quantity: 1, unitPrice: 39.90 },
        { type: 'LABOR',   description: 'Mão de obra — revisão', quantity: 0.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-045', customerId: 'cust-004', vehicleId: 'veh-005', status: 'AGUARDANDO_APROVACAO',
      complaint: 'Suspensão dianteira completa', kmEntrada: 12800,
      items: [
        { type: 'SERVICE', serviceId: 'svc-011', description: 'Troca de Amortecedores',     quantity: 1, unitPrice: 220.00 },
        { type: 'SERVICE', serviceId: 'svc-002', description: 'Alinhamento e Balanceamento', quantity: 1, unitPrice: 120.00 },
        { type: 'PART',    partId: pAmortDiant?.id, description: 'Amortecedor Dianteiro',   quantity: 2, unitPrice: 320.00 },
        { type: 'LABOR',   description: 'Mão de obra — suspensão', quantity: 2.5, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-046', customerId: 'cust-008', vehicleId: 'veh-010', status: 'AGUARDANDO_APROVACAO',
      complaint: 'Sistema de arrefecimento — diagnóstico completo', kmEntrada: 8300,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Eletrônico', quantity: 1, unitPrice: 100.00 },
        { type: 'LABOR',   description: 'Mão de obra — diagnóstico', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-047', customerId: 'cust-006', vehicleId: 'veh-007', status: 'AGUARDANDO_APROVACAO',
      complaint: 'Caixa de câmbio com dificuldade de engrenar', kmEntrada: 35600,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Transmissão', quantity: 1, unitPrice: 100.00 },
        { type: 'LABOR',   description: 'Mão de obra — câmbio', quantity: 2, unitPrice: 120.00 },
      ],
    },
    // ── BLOCO 8: ORCAMENTO_PRONTO ─────────────────────────────────────────────
    {
      id: 'os-011', customerId: 'cust-002', vehicleId: 'veh-002', status: 'ORCAMENTO_PRONTO',
      complaint: 'Carro superaquecendo em trânsito lento', kmEntrada: 21900,
      items: [
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Superaquecimento', quantity: 1, unitPrice: 100.00 },
        { type: 'PART',    partId: pFiltroAb?.id,  description: 'Filtro de Cabine',           quantity: 1, unitPrice: 49.90 },
        { type: 'LABOR',   description: 'Mão de obra — diagnóstico', quantity: 1, unitPrice: 120.00 },
      ],
    },
    {
      id: 'os-048', customerId: 'cust-010', vehicleId: 'veh-012', status: 'ORCAMENTO_PRONTO',
      complaint: 'Revisão geral + check up completo', kmEntrada: 28900,
      items: [
        { type: 'SERVICE', serviceId: 'svc-001', description: 'Troca de Óleo e Filtro',    quantity: 1, unitPrice: 80.00 },
        { type: 'SERVICE', serviceId: 'svc-002', description: 'Alinhamento e Balanceamento', quantity: 1, unitPrice: 120.00 },
        { type: 'SERVICE', serviceId: 'svc-006', description: 'Diagnóstico Eletrônico',    quantity: 1, unitPrice: 100.00 },
        { type: 'PART',    partId: pOleo5W30?.id,   description: 'Óleo Motor 5W30 1L',    quantity: 4, unitPrice: 49.90 },
        { type: 'PART',    partId: pFiltroOleo?.id, description: 'Filtro de Óleo',         quantity: 1, unitPrice: 39.90 },
        { type: 'LABOR',   description: 'Mão de obra — check up', quantity: 1.5, unitPrice: 120.00 },
      ],
    },
    // ── BLOCO 9: ABERTA ───────────────────────────────────────────────────────
    {
      id: 'os-012', customerId: 'cust-008', vehicleId: 'veh-010', status: 'ABERTA',
      complaint: 'Barulho no motor ao ligar, batendo em frio', kmEntrada: 7900,
      items: [],
    },
    {
      id: 'os-049', customerId: 'cust-001', vehicleId: 'veh-001', status: 'ABERTA',
      complaint: 'Revisão dos 80.000 km', kmEntrada: 79100,
      items: [],
    },
  ];

  // ── Limpa comissões antigas para idempotência ────────────────────────────
  await prisma.commission.deleteMany({ where: { tenantId: demoTenant.id } });

  for (const os of osData) {
    const items = os.items || [];
    const t = calcTotals(items);
    const responsibleId = os.executorId || executors['usr-mec-01'].id;
    const osRecord = await prisma.serviceOrder.upsert({
      where: { id: os.id },
      update: {
        totalParts: t.totalParts, totalServices: t.totalServices,
        totalLabor: t.totalLabor, totalCost: t.totalCost,
        status: os.status,
        mechanicId: responsibleId,
      },
      create: {
        id: os.id, tenantId: demoTenant.id, customerId: customers[os.customerId].id,
        vehicleId: vehicles[os.vehicleId].id, orderType: 'OS', status: os.status,
        complaint: os.complaint, kmEntrada: os.kmEntrada || null,
        mechanicId: responsibleId,
        totalParts: t.totalParts, totalServices: t.totalServices,
        totalLabor: t.totalLabor, totalCost: t.totalCost,
        startedAt: os.startedAt || null, completedAt: os.completedAt || null,
        deliveredAt: os.deliveredAt || null, paidAt: os.paidAt || null,
        createdAt: os.startedAt || new Date(),
      },
    });

    // Garante idempotência: remove itens anteriores antes de recriar
    await prisma.serviceOrderItem.deleteMany({ where: { serviceOrderId: osRecord.id } });

    const isCompleted = ['ENTREGUE', 'FATURADO'].includes(os.status);

    // Acha o % de comissão do executor desta OS
    const execDef = executorData.find(e => executors[e.id]?.id === responsibleId);
    const commRate = execDef?.commissionPercent ?? 10;

    for (const item of items) {
      const total = item.quantity * item.unitPrice;
      const soItem = await prisma.serviceOrderItem.create({
        data: {
          serviceOrderId: osRecord.id,
          serviceId: item.serviceId || null,
          partId: item.partId || null,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: total,
          type: item.type,
          applied: ['ENTREGUE','FATURADO','PRONTO_ENTREGA'].includes(os.status),
        },
      });

      // Cria comissão para itens de serviço e mão de obra de OS concluídas
      if (isCompleted && ['SERVICE', 'LABOR'].includes(item.type)) {
        const commValue = parseFloat((total * commRate / 100).toFixed(2));
        await prisma.commission.create({
          data: {
            tenantId: demoTenant.id,
            serviceOrderId: osRecord.id,
            serviceOrderItemId: soItem.id,
            userId: responsibleId,
            baseValue: total,
            commissionPercent: commRate,
            commissionValue: commValue,
            status: os.status === 'ENTREGUE' && os.paidAt ? 'PAGO' : 'PENDENTE',
            paidAt: os.status === 'ENTREGUE' && os.paidAt ? os.paidAt : null,
          },
        });
      }
    }
  }
  console.log(`✅ ${osData.length} ordens de serviço com itens e comissões`);

  // ── Lançamentos Financeiros ────────────────────────────────────────────────
  // Limpa financeiro anterior do demo para garantir idempotência
  await prisma.financialTransaction.deleteMany({ where: { tenantId: demoTenant.id } });

  // Receitas (das OS pagas)
  const completedOS = osData.filter(o => ['ENTREGUE','FATURADO'].includes(o.status));
  for (const os of completedOS) {
    const t = calcTotals(os.items || []);
    if (t.totalCost > 0) {
      await prisma.financialTransaction.create({
        data: {
          tenantId: demoTenant.id, type: 'INCOME', amount: t.totalCost,
          description: `Pagamento OS #${os.id.toUpperCase()} — ${os.complaint?.substring(0, 40)}`,
          category: 'SERVIÇO', referenceId: os.id, referenceType: 'SERVICE_ORDER',
          date: os.paidAt || daysAgo(5),
        },
      });
    }
  }
  // Despesas operacionais — 3 meses de histórico
  const expenses = [
    // Mês 3 (mais antigo — 90 a 61 dias)
    { amount: 3800.00, description: 'Aluguel do imóvel — Fevereiro/2026',     category: 'ALUGUEL',       date: daysAgo(88) },
    { amount: 850.00,  description: 'Energia elétrica — Fevereiro/2026',      category: 'UTILIDADES',    date: daysAgo(85) },
    { amount: 420.00,  description: 'Água e saneamento — Fevereiro/2026',     category: 'UTILIDADES',    date: daysAgo(82) },
    { amount: 680.00,  description: 'Reposição de estoque — distribuidora',   category: 'ESTOQUE',       date: daysAgo(78) },
    { amount: 350.00,  description: 'Plano de internet + telefone',           category: 'TELECOM',       date: daysAgo(75) },
    { amount: 250.00,  description: 'Material de limpeza e EPI',              category: 'OPERACIONAL',   date: daysAgo(72) },
    { amount: 1500.00, description: 'Pró-labore proprietário — Fevereiro/2026', category: 'PESSOAL',     date: daysAgo(70) },
    { amount: 480.00,  description: 'Seguro do estabelecimento',              category: 'SEGUROS',       date: daysAgo(68) },
    { amount: 1200.00, description: 'Compra de ferramentas (scanner OBD)',    category: 'EQUIPAMENTOS',  date: daysAgo(65) },
    // Mês 2 (30 a 61 dias)
    { amount: 3800.00, description: 'Aluguel do imóvel — Março/2026',         category: 'ALUGUEL',       date: daysAgo(58) },
    { amount: 860.00,  description: 'Energia elétrica — Março/2026',          category: 'UTILIDADES',    date: daysAgo(55) },
    { amount: 420.00,  description: 'Água e saneamento — Março/2026',         category: 'UTILIDADES',    date: daysAgo(52) },
    { amount: 720.00,  description: 'Reposição de estoque — distribuidora',   category: 'ESTOQUE',       date: daysAgo(48) },
    { amount: 350.00,  description: 'Plano de internet + telefone',           category: 'TELECOM',       date: daysAgo(45) },
    { amount: 310.00,  description: 'Material de limpeza e EPI',              category: 'OPERACIONAL',   date: daysAgo(42) },
    { amount: 1500.00, description: 'Pró-labore proprietário — Março/2026',   category: 'PESSOAL',       date: daysAgo(40) },
    { amount: 890.00,  description: 'Uniforme equipe + Equipamentos EPI',     category: 'PESSOAL',       date: daysAgo(38) },
    // Mês 1 (últimos 30 dias)
    { amount: 3800.00, description: 'Aluguel do imóvel — Abril/2026',         category: 'ALUGUEL',       date: daysAgo(28) },
    { amount: 870.00,  description: 'Energia elétrica — Abril/2026',          category: 'UTILIDADES',    date: daysAgo(25) },
    { amount: 420.00,  description: 'Água e saneamento — Abril/2026',         category: 'UTILIDADES',    date: daysAgo(22) },
    { amount: 680.00,  description: 'Reposição de estoque — distribuidora',   category: 'ESTOQUE',       date: daysAgo(18) },
    { amount: 350.00,  description: 'Plano de internet + telefone',           category: 'TELECOM',       date: daysAgo(15) },
    { amount: 250.00,  description: 'Material de limpeza e EPI',              category: 'OPERACIONAL',   date: daysAgo(12) },
    { amount: 1500.00, description: 'Pró-labore proprietário — Abril/2026',   category: 'PESSOAL',       date: daysAgo(10) },
    { amount: 320.00,  description: 'Reposição óleo e fluidos — atacado',     category: 'ESTOQUE',       date: daysAgo(8) },
    { amount: 580.00,  description: 'Manutenção equipamento — elevador',      category: 'EQUIPAMENTOS',  date: daysAgo(5) },
  ];
  for (const exp of expenses) {
    await prisma.financialTransaction.create({
      data: { tenantId: demoTenant.id, type: 'EXPENSE', ...exp },
    });
  }
  console.log(`✅ ${completedOS.length} receitas + ${expenses.length} despesas lançadas`);

  // ── Movimentação de Estoque (para OS concluídas) ───────────────────────────
  // Reseta estoque e movimentações para o demo
  await prisma.inventoryMovement.deleteMany({ where: { tenantId: demoTenant.id } });
  await prisma.part.updateMany({ where: { tenantId: demoTenant.id }, data: { currentStock: 20 } });

  const stockExits = [
    { partSku: 'MOT-001', qty: 4 * 3 }, // óleo usado em 3 OS
    { partSku: 'MOT-003', qty: 3 },     // filtro de óleo
    { partSku: 'MOT-004', qty: 1 },     // filtro de ar
    { partSku: 'FRE-001', qty: 2 },     // pastilha dianteira
    { partSku: 'FRE-002', qty: 1 },     // pastilha traseira
    { partSku: 'FRE-005', qty: 1 },     // fluido de freio
    { partSku: 'MOT-007', qty: 1 },     // kit correia
    { partSku: 'SUS-001', qty: 2 },     // amortecedor dianteiro (par)
    { partSku: 'SUS-002', qty: 2 },     // amortecedor traseiro (par)
    { partSku: 'ELE-001', qty: 1 },     // bateria
    { partSku: 'TRA-003', qty: 1 },     // kit embreagem
    { partSku: 'MOT-006', qty: 4 },     // velas
    { partSku: 'REV-001', qty: 2 },     // filtro cabine
  ];
  for (const se of stockExits) {
    const part = await prisma.part.findFirst({ where: { tenantId: demoTenant.id, sku: se.partSku } });
    if (!part) continue;
    await prisma.inventoryMovement.create({
      data: { tenantId: demoTenant.id, partId: part.id, type: 'EXIT', quantity: se.qty, note: 'Baixa de estoque — OS concluídas' },
    });
    await prisma.part.update({ where: { id: part.id }, data: { currentStock: Math.max(0, (part.currentStock || 20) - se.qty) } });
  }
  console.log('✅ Movimentação de estoque aplicada');

  const totalRevenue = completedOS.reduce((s, os) => s + calcTotals(os.items || []).totalCost, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🚀  OFICINA360 — SEED COMPLETO  🚀              ║
╠═══════════════════════════════════════════════════════════╣
║  CLIENTES:  12  •  VEÍCULOS: 15  •  OS: 49               ║
║  EXECUTORES: 10 mecânicos + admin  (com comissões)        ║
║  PEÇAS: 57 itens no catálogo (estoque inicial: 20 un)     ║
║  FINANCEIRO: R$ ${totalRevenue.toFixed(2).padStart(9)} receita / R$ ${totalExpenses.toFixed(2).padStart(9)} despesa  ║
╠═══════════════════════════════════════════════════════════╣
║  LOGIN: admin@demo.com / admin123  (plano PRO, trial 14d) ║
║  MECÂNICOS: carlos@demo.com ... rafael@demo.com / mec123  ║
╚═══════════════════════════════════════════════════════════╝
  `);
}

main().catch(e => { console.error('❌ Seed error:', e); process.exit(1); }).finally(() => prisma.$disconnect());
