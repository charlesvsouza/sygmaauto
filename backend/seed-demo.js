/**
 * Seed demo — popula OS, executores e comissões para análise de KPI.
 * Ativado pelo release.js quando SEED_DEMO=true.
 */
'use strict';
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (d) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt; };

const EXECUTORES = [
  { name: 'Carlos Mecânico',    email: 'carlos.mec@demo.com',   role: 'MECANICO', jobFunction: 'MECANICO',               workshopArea: 'MECANICA' },
  { name: 'Roberto Mecânico',   email: 'roberto.mec@demo.com',  role: 'MECANICO', jobFunction: 'MECANICO',               workshopArea: 'MECANICA' },
  { name: 'André Elétrica',     email: 'andre.ele@demo.com',    role: 'MECANICO', jobFunction: 'ELETRICISTA',            workshopArea: 'ELETRICA' },
  { name: 'Paulo Elétrica',     email: 'paulo.ele@demo.com',    role: 'MECANICO', jobFunction: 'ELETRICISTA',            workshopArea: 'ELETRICA' },
  { name: 'Marcos Funileiro',   email: 'marcos.fun@demo.com',   role: 'MECANICO', jobFunction: 'FUNILEIRO',              workshopArea: 'FUNILARIA_PINTURA' },
  { name: 'Diego Pintor',       email: 'diego.pin@demo.com',    role: 'MECANICO', jobFunction: 'PINTOR',                 workshopArea: 'FUNILARIA_PINTURA' },
  { name: 'Felipe Preparador',  email: 'felipe.pre@demo.com',   role: 'MECANICO', jobFunction: 'PREPARADOR',             workshopArea: 'FUNILARIA_PINTURA' },
  { name: 'Lucas Lavador',      email: 'lucas.lav@demo.com',    role: 'MECANICO', jobFunction: 'LAVADOR',                workshopArea: 'LAVACAO' },
  { name: 'Mateus Lavador',     email: 'mateus.lav@demo.com',   role: 'MECANICO', jobFunction: 'LAVADOR',                workshopArea: 'LAVACAO' },
  { name: 'Rafael Embelezador', email: 'rafael.emb@demo.com',   role: 'MECANICO', jobFunction: 'EMBELEZADOR_AUTOMOTIVO', workshopArea: 'HIGIENIZACAO_EMBELEZAMENTO' },
];

const CLIENTES = [
  { name: 'João Silva',       phone: '21999990001', email: 'joao.demo@cliente.com' },
  { name: 'Maria Oliveira',   phone: '21999990002', email: 'maria.demo@cliente.com' },
  { name: 'Pedro Santos',     phone: '21999990003', email: 'pedro.demo@cliente.com' },
  { name: 'Ana Costa',        phone: '21999990004', email: 'ana.demo@cliente.com' },
  { name: 'Lucas Fernandes',  phone: '21999990005', email: 'lucas.demo@cliente.com' },
  { name: 'Fernanda Lima',    phone: '21999990006', email: 'fernanda.demo@cliente.com' },
  { name: 'Ricardo Alves',    phone: '21999990007', email: 'ricardo.demo@cliente.com' },
  { name: 'Juliana Rocha',    phone: '21999990008', email: 'juliana.demo@cliente.com' },
  { name: 'Thiago Carvalho',  phone: '21999990009', email: 'thiago.demo@cliente.com' },
  { name: 'Camila Pereira',   phone: '21999990010', email: 'camila.demo@cliente.com' },
  { name: 'Bruno Martins',    phone: '21999990011', email: 'bruno.demo@cliente.com' },
  { name: 'Larissa Gomes',    phone: '21999990012', email: 'larissa.demo@cliente.com' },
];

const VEICULOS = [
  { brand: 'Volkswagen', model: 'Gol',     year: 2018, color: 'Prata'    },
  { brand: 'Fiat',       model: 'Uno',      year: 2020, color: 'Branco'   },
  { brand: 'Chevrolet',  model: 'Onix',     year: 2021, color: 'Cinza'    },
  { brand: 'Toyota',     model: 'Corolla',  year: 2019, color: 'Preto'    },
  { brand: 'Honda',      model: 'Civic',    year: 2022, color: 'Azul'     },
  { brand: 'Ford',       model: 'Ka',       year: 2017, color: 'Vermelho' },
  { brand: 'Hyundai',    model: 'HB20',     year: 2020, color: 'Branco'   },
  { brand: 'Renault',    model: 'Kwid',     year: 2021, color: 'Laranja'  },
  { brand: 'Jeep',       model: 'Compass',  year: 2022, color: 'Prata'    },
  { brand: 'Nissan',     model: 'Kicks',    year: 2019, color: 'Cinza'    },
  { brand: 'Volkswagen', model: 'Polo',     year: 2023, color: 'Branco'   },
  { brand: 'Fiat',       model: 'Strada',   year: 2021, color: 'Preto'    },
];

const SERVICOS = [
  { name: 'Troca de Óleo e Filtro',       category: 'preventiva',  price: 120, area: 'MECANICA' },
  { name: 'Alinhamento e Balanceamento',  category: 'preventiva',  price: 160, area: 'MECANICA' },
  { name: 'Revisão de Freios',            category: 'seguranca',   price: 250, area: 'MECANICA' },
  { name: 'Diagnóstico Eletrônico',       category: 'diagnostico', price: 180, area: 'ELETRICA' },
  { name: 'Instalação de Som Automotivo', category: 'acessorios',  price: 350, area: 'ELETRICA' },
  { name: 'Reparo Elétrico Geral',        category: 'corretiva',   price: 300, area: 'ELETRICA' },
  { name: 'Funilaria - Amassado Pequeno', category: 'funilaria',   price: 400, area: 'FUNILARIA_PINTURA' },
  { name: 'Pintura Parcial (1 painel)',   category: 'pintura',     price: 600, area: 'FUNILARIA_PINTURA' },
  { name: 'Polimento Completo',           category: 'estetica',    price: 280, area: 'FUNILARIA_PINTURA' },
  { name: 'Lavagem Completa',             category: 'limpeza',     price:  80, area: 'LAVACAO' },
  { name: 'Lavagem Detalhada',            category: 'limpeza',     price: 140, area: 'LAVACAO' },
  { name: 'Higienizacao Interna',         category: 'limpeza',     price: 220, area: 'HIGIENIZACAO_EMBELEZAMENTO' },
  { name: 'Cristalizacao de Pintura',     category: 'estetica',    price: 350, area: 'FUNILARIA_PINTURA' },
  { name: 'Troca de Correia Dentada',     category: 'preventiva',  price: 480, area: 'MECANICA' },
  { name: 'Suspensao - Amortecedores',    category: 'corretiva',   price: 560, area: 'MECANICA' },
];

const PECAS = [
  { name: 'Filtro de Oleo',              code: 'FLT001D', price:  35 },
  { name: 'Oleo Motor 5W30 4L',          code: 'OLO001D', price: 120 },
  { name: 'Pastilha de Freio Dianteira', code: 'FRE001D', price: 160 },
  { name: 'Correia Dentada',             code: 'COR001D', price: 180 },
  { name: 'Amortecedor Dianteiro',       code: 'AMO001D', price: 320 },
  { name: 'Filtro de Ar',                code: 'FLT002D', price:  45 },
  { name: 'Vela de Ignicao jogo',        code: 'VEL001D', price:  95 },
  { name: 'Disco de Freio',              code: 'FRE003D', price: 210 },
  { name: 'Fluido de Freio DOT4',        code: 'FLU001D', price:  28 },
];

const OS_TEMPLATES = [
  { complaint: 'Troca de oleo',              area: 'MECANICA',                   services: ['Troca de Óleo e Filtro'],                               parts: ['Filtro de Oleo', 'Oleo Motor 5W30 4L'] },
  { complaint: 'Carro puxando para o lado',  area: 'MECANICA',                   services: ['Alinhamento e Balanceamento'],                           parts: [] },
  { complaint: 'Freios com chiado',           area: 'MECANICA',                   services: ['Revisão de Freios'],                                     parts: ['Pastilha de Freio Dianteira', 'Disco de Freio'] },
  { complaint: 'Check engine acesa',          area: 'ELETRICA',                   services: ['Diagnóstico Eletrônico'],                                parts: ['Vela de Ignicao jogo'] },
  { complaint: 'Radio com defeito',           area: 'ELETRICA',                   services: ['Instalação de Som Automotivo', 'Reparo Elétrico Geral'],  parts: [] },
  { complaint: 'Amassado no para-lama',       area: 'FUNILARIA_PINTURA',          services: ['Funilaria - Amassado Pequeno', 'Pintura Parcial (1 painel)'], parts: [] },
  { complaint: 'Polimento e cristalizacao',   area: 'FUNILARIA_PINTURA',          services: ['Polimento Completo', 'Cristalizacao de Pintura'],         parts: [] },
  { complaint: 'Lavagem pos-viagem',          area: 'LAVACAO',                    services: ['Lavagem Completa'],                                       parts: [] },
  { complaint: 'Higienizacao apos enchente',  area: 'HIGIENIZACAO_EMBELEZAMENTO', services: ['Higienizacao Interna', 'Lavagem Detalhada'],              parts: [] },
  { complaint: 'Correia dentada no limite',   area: 'MECANICA',                   services: ['Troca de Correia Dentada'],                              parts: ['Correia Dentada', 'Filtro de Ar'] },
  { complaint: 'Suspensao com barulho',       area: 'MECANICA',                   services: ['Suspensao - Amortecedores'],                             parts: ['Amortecedor Dianteiro'] },
  { complaint: 'Revisao preventiva geral',    area: 'MECANICA',                   services: ['Troca de Óleo e Filtro', 'Alinhamento e Balanceamento'], parts: ['Filtro de Oleo', 'Oleo Motor 5W30 4L', 'Fluido de Freio DOT4'] },
];

const STATUS_SEQ = ['ENTREGUE','ENTREGUE','ENTREGUE','FATURADO','PRONTO_ENTREGA','EM_EXECUCAO','APROVADO','ABERTA'];
const RATES_MAP = { MECANICO: 10, ELETRICISTA: 10, FUNILEIRO: 8, PINTOR: 8, PREPARADOR: 8, LAVADOR: 6, EMBELEZADOR_AUTOMOTIVO: 6 };

async function runSeed() {
  const tenant = await prisma.tenant.findFirst({ where: { status: 'ACTIVE' } });
  if (!tenant) { console.log('[seed] Nenhum tenant ativo encontrado.'); return; }
  const tenantId = tenant.id;
  console.log(`[seed] Tenant: ${tenant.name} (${tenantId})`);

  // Idempotência: verifica se já existe OS demo
  const existing = await prisma.vehicle.findFirst({ where: { tenantId, plate: 'DM0001' } });
  if (existing) { console.log('[seed] Dados demo já existem. Pulando.'); return; }

  const pw = await bcrypt.hash('Demo@2026', 10);
  const userMap = {};

  // Executores
  for (const ex of EXECUTORES) {
    let u = await prisma.user.findFirst({ where: { tenantId, email: ex.email } });
    if (!u) {
      u = await prisma.user.create({
        data: { tenantId, name: ex.name, email: ex.email, passwordHash: pw, role: ex.role, workshopArea: ex.workshopArea, jobFunction: ex.jobFunction, isActive: true, passwordUpdatedAt: new Date() },
      });
    } else {
      await prisma.user.update({ where: { id: u.id }, data: { workshopArea: ex.workshopArea, jobFunction: ex.jobFunction } });
    }
    userMap[ex.name] = u.id;
  }
  console.log(`[seed] ${EXECUTORES.length} executores prontos`);

  // Taxas de comissão
  for (const [role, rate] of Object.entries(RATES_MAP)) {
    const exists = await prisma.commissionRate.findFirst({ where: { tenantId, role } });
    if (!exists) await prisma.commissionRate.create({ data: { tenantId, role, rate } });
  }

  // Clientes + Veículos
  const pairs = [];
  for (let i = 0; i < CLIENTES.length; i++) {
    const c = CLIENTES[i];
    let cliente = await prisma.customer.findFirst({ where: { tenantId, email: c.email } });
    if (!cliente) cliente = await prisma.customer.create({ data: { tenantId, name: c.name, phone: c.phone, email: c.email } });
    const v = VEICULOS[i];
    const plate = `DM${String(i + 1).padStart(4, '0')}`;
    let vehicle = await prisma.vehicle.findFirst({ where: { tenantId, plate } });
    if (!vehicle) vehicle = await prisma.vehicle.create({ data: { tenantId, customerId: cliente.id, plate, brand: v.brand, model: v.model, year: v.year, color: v.color, km: rand(20000, 120000) } });
    pairs.push(`${cliente.id}|${vehicle.id}`);
  }
  console.log(`[seed] ${CLIENTES.length} clientes e veículos prontos`);

  // Catálogo serviços
  const svcMap = {};
  for (const s of SERVICOS) {
    let svc = await prisma.service.findFirst({ where: { tenantId, name: s.name } });
    if (!svc) svc = await prisma.service.create({ data: { tenantId, name: s.name, category: s.category, basePrice: s.price, isActive: true } });
    svcMap[s.name] = svc.id;
  }

  // Catálogo peças
  const partMap = {};
  for (const p of PECAS) {
    let part = await prisma.part.findFirst({ where: { tenantId, internalCode: p.code } });
    if (!part) part = await prisma.part.create({ data: { tenantId, name: p.name, internalCode: p.code, unitPrice: p.price, currentStock: rand(10, 50), isActive: true } });
    partMap[p.name] = part.id;
  }
  console.log('[seed] Catálogo de serviços e peças pronto');

  // 48 Ordens de Serviço
  let osCount = 0, commCount = 0;
  for (let i = 0; i < 48; i++) {
    const tpl = OS_TEMPLATES[i % OS_TEMPLATES.length];
    const [customerId, vehicleId] = pairs[i % pairs.length].split('|');
    const status = STATUS_SEQ[i % STATUS_SEQ.length];
    const createdAt = daysAgo(rand(1, 90));

    const executoresArea = EXECUTORES.filter(e => e.workshopArea === tpl.area);
    const executor = pick(executoresArea.length ? executoresArea : EXECUTORES);
    const executorId = userMap[executor.name];
    const execPeca = pick(EXECUTORES.filter(e => e.workshopArea === 'MECANICA'));
    const execPecaId = userMap[execPeca.name];

    const itemsData = [];
    for (const svcName of tpl.services) {
      const svc = SERVICOS.find(s => s.name === svcName);
      if (!svc || !svcMap[svcName]) continue;
      itemsData.push({ serviceId: svcMap[svcName], description: svcName, quantity: 1, unitPrice: svc.price, discount: 0, totalPrice: svc.price, type: 'service', applied: false, assignedUserId: executorId });
    }
    for (const partName of tpl.parts) {
      const p = PECAS.find(x => x.name === partName);
      if (!p || !partMap[partName]) continue;
      itemsData.push({ partId: partMap[partName], description: partName, quantity: 1, unitPrice: p.price, discount: 0, totalPrice: p.price, type: 'part', applied: ['FATURADO','ENTREGUE','PRONTO_ENTREGA'].includes(status), assignedUserId: execPecaId });
    }

    if (itemsData.length === 0) continue;

    const totalServices = itemsData.filter(x => x.type === 'service').reduce((s, x) => s + x.totalPrice, 0);
    const totalParts    = itemsData.filter(x => x.type === 'part').reduce((s, x) => s + x.totalPrice, 0);

    const os = await prisma.serviceOrder.create({
      data: {
        tenantId, customerId, vehicleId, orderType: 'ORDEM_SERVICO', status,
        complaint: tpl.complaint, totalServices, totalParts, totalLabor: 0, totalCost: totalServices + totalParts,
        kmEntrada: rand(20000, 120000), createdAt, updatedAt: createdAt,
        startedAt:   ['EM_EXECUCAO','PRONTO_ENTREGA','FATURADO','ENTREGUE'].includes(status) ? createdAt : null,
        completedAt: ['PRONTO_ENTREGA','FATURADO','ENTREGUE'].includes(status) ? daysAgo(rand(0, 30)) : null,
        paidAt:      ['FATURADO','ENTREGUE'].includes(status) ? daysAgo(rand(0, 20)) : null,
        deliveredAt: status === 'ENTREGUE' ? daysAgo(rand(0, 15)) : null,
        items: { create: itemsData },
      },
    });
    osCount++;

    if (['FATURADO','ENTREGUE'].includes(status)) {
      const items = await prisma.serviceOrderItem.findMany({
        where: { serviceOrderId: os.id, assignedUserId: { not: null } },
        include: { assignedUser: true, commission: true },
      });
      for (const item of items) {
        if (!item.assignedUserId || item.commission) continue;
        const jf = item.assignedUser && item.assignedUser.jobFunction;
        const rate = jf ? (RATES_MAP[jf] || 10) : 10;
        const base = Number(item.totalPrice);
        const isPaid = Math.random() > 0.5;
        await prisma.commission.create({
          data: {
            tenantId, serviceOrderId: os.id, serviceOrderItemId: item.id,
            userId: item.assignedUserId,
            baseValue: base, commissionPercent: rate,
            commissionValue: parseFloat(((base * rate) / 100).toFixed(2)),
            status: isPaid ? 'PAGO' : 'PENDENTE',
            paidAt: isPaid ? daysAgo(rand(0, 10)) : null,
            createdAt: os.createdAt,
          },
        });
        commCount++;
      }
    }
  }

  console.log(`[seed] CONCLUÍDO — ${osCount} OS + ${commCount} comissões criadas.`);
}

module.exports = { runSeed };

if (require.main === module) {
  runSeed()
    .catch(e => { console.error('[seed] Erro:', e.message); process.exit(1); })
    .finally(() => prisma.$disconnect());
}
