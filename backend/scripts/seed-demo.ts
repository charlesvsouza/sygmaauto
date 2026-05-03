/**
 * Seed demo — cria dados realistas para análise de KPI/BI e comissões.
 * Uso: ts-node backend/scripts/seed-demo.ts
 * Env: DATABASE_URL deve estar configurado.
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt; };

// ─── dados mestres ─────────────────────────────────────────────────────────────

const EXECUTORES = [
  { name: 'Carlos Mecânico',     email: 'carlos.mec@demo.com',    role: 'MECANICO' as const, jobFunction: 'MECANICO',     workshopArea: 'MECANICA' },
  { name: 'Roberto Mecânico',    email: 'roberto.mec@demo.com',   role: 'MECANICO' as const, jobFunction: 'MECANICO',     workshopArea: 'MECANICA' },
  { name: 'André Elétrica',      email: 'andre.ele@demo.com',     role: 'MECANICO' as const, jobFunction: 'ELETRICISTA',  workshopArea: 'ELETRICA' },
  { name: 'Paulo Elétrica',      email: 'paulo.ele@demo.com',     role: 'MECANICO' as const, jobFunction: 'ELETRICISTA',  workshopArea: 'ELETRICA' },
  { name: 'Marcos Funileiro',    email: 'marcos.fun@demo.com',    role: 'MECANICO' as const, jobFunction: 'FUNILEIRO',    workshopArea: 'FUNILARIA_PINTURA' },
  { name: 'Diego Pintor',        email: 'diego.pin@demo.com',     role: 'MECANICO' as const, jobFunction: 'PINTOR',       workshopArea: 'FUNILARIA_PINTURA' },
  { name: 'Felipe Preparador',   email: 'felipe.pre@demo.com',    role: 'MECANICO' as const, jobFunction: 'PREPARADOR',   workshopArea: 'FUNILARIA_PINTURA' },
  { name: 'Lucas Lavador',       email: 'lucas.lav@demo.com',     role: 'MECANICO' as const, jobFunction: 'LAVADOR',      workshopArea: 'LAVACAO' },
  { name: 'Mateus Lavador',      email: 'mateus.lav@demo.com',    role: 'MECANICO' as const, jobFunction: 'LAVADOR',      workshopArea: 'LAVACAO' },
  { name: 'Rafael Embelezador',  email: 'rafael.emb@demo.com',    role: 'MECANICO' as const, jobFunction: 'EMBELEZADOR_AUTOMOTIVO', workshopArea: 'HIGIENIZACAO_EMBELEZAMENTO' },
];

const CLIENTES = [
  { name: 'João Silva',        phone: '21999990001', email: 'joao@cliente.com' },
  { name: 'Maria Oliveira',    phone: '21999990002', email: 'maria@cliente.com' },
  { name: 'Pedro Santos',      phone: '21999990003', email: 'pedro@cliente.com' },
  { name: 'Ana Costa',         phone: '21999990004', email: 'ana@cliente.com' },
  { name: 'Lucas Fernandes',   phone: '21999990005', email: 'lucas@cliente.com' },
  { name: 'Fernanda Lima',     phone: '21999990006', email: 'fernanda@cliente.com' },
  { name: 'Ricardo Alves',     phone: '21999990007', email: 'ricardo@cliente.com' },
  { name: 'Juliana Rocha',     phone: '21999990008', email: 'juliana@cliente.com' },
  { name: 'Thiago Carvalho',   phone: '21999990009', email: 'thiago@cliente.com' },
  { name: 'Camila Pereira',    phone: '21999990010', email: 'camila@cliente.com' },
  { name: 'Bruno Martins',     phone: '21999990011', email: 'bruno@cliente.com' },
  { name: 'Larissa Gomes',     phone: '21999990012', email: 'larissa@cliente.com' },
];

const VEICULOS = [
  { brand: 'Volkswagen', model: 'Gol',       year: 2018, color: 'Prata' },
  { brand: 'Fiat',       model: 'Uno',        year: 2020, color: 'Branco' },
  { brand: 'Chevrolet',  model: 'Onix',       year: 2021, color: 'Cinza' },
  { brand: 'Toyota',     model: 'Corolla',    year: 2019, color: 'Preto' },
  { brand: 'Honda',      model: 'Civic',      year: 2022, color: 'Azul' },
  { brand: 'Ford',       model: 'Ka',         year: 2017, color: 'Vermelho' },
  { brand: 'Hyundai',    model: 'HB20',       year: 2020, color: 'Branco' },
  { brand: 'Renault',    model: 'Kwid',       year: 2021, color: 'Laranja' },
  { brand: 'Jeep',       model: 'Compass',    year: 2022, color: 'Prata' },
  { brand: 'Nissan',     model: 'Kicks',      year: 2019, color: 'Cinza' },
  { brand: 'Volkswagen', model: 'Polo',       year: 2023, color: 'Branco' },
  { brand: 'Fiat',       model: 'Strada',     year: 2021, color: 'Preto' },
];

const SERVICOS_CATALOGO = [
  { name: 'Troca de Óleo e Filtro',         category: 'preventiva', price: 120,  area: 'MECANICA' },
  { name: 'Alinhamento e Balanceamento',    category: 'preventiva', price: 160,  area: 'MECANICA' },
  { name: 'Revisão de Freios',              category: 'seguranca',  price: 250,  area: 'MECANICA' },
  { name: 'Diagnóstico Eletrônico',         category: 'diagnostico',price: 180,  area: 'ELETRICA' },
  { name: 'Instalação de Som Automotivo',   category: 'acessorios', price: 350,  area: 'ELETRICA' },
  { name: 'Reparo Elétrico Geral',          category: 'corretiva',  price: 300,  area: 'ELETRICA' },
  { name: 'Funilaria — Amassado Pequeno',   category: 'funilaria',  price: 400,  area: 'FUNILARIA_PINTURA' },
  { name: 'Pintura Parcial (1 painel)',     category: 'pintura',    price: 600,  area: 'FUNILARIA_PINTURA' },
  { name: 'Polimento Completo',             category: 'estetica',   price: 280,  area: 'FUNILARIA_PINTURA' },
  { name: 'Lavagem Completa',               category: 'limpeza',    price: 80,   area: 'LAVACAO' },
  { name: 'Lavagem Detalhada',              category: 'limpeza',    price: 140,  area: 'LAVACAO' },
  { name: 'Higienização Interna',           category: 'limpeza',    price: 220,  area: 'HIGIENIZACAO_EMBELEZAMENTO' },
  { name: 'Cristalização de Pintura',       category: 'estetica',   price: 350,  area: 'FUNILARIA_PINTURA' },
  { name: 'Troca de Correia Dentada',       category: 'preventiva', price: 480,  area: 'MECANICA' },
  { name: 'Suspensão — Amortecedores',      category: 'corretiva',  price: 560,  area: 'MECANICA' },
];

const PECAS_CATALOGO = [
  { name: 'Filtro de Óleo',           code: 'FLT001', price: 35  },
  { name: 'Óleo Motor 5W30 (4L)',      code: 'OLO001', price: 120 },
  { name: 'Pastilha de Freio Dianteira', code: 'FRE001', price: 160 },
  { name: 'Pastilha de Freio Traseira', code: 'FRE002', price: 140 },
  { name: 'Correia Dentada',           code: 'COR001', price: 180 },
  { name: 'Amortecedor Dianteiro',     code: 'AMO001', price: 320 },
  { name: 'Filtro de Ar',              code: 'FLT002', price: 45  },
  { name: 'Vela de Ignição (jogo)',    code: 'VEL001', price: 95  },
  { name: 'Disco de Freio',            code: 'FRE003', price: 210 },
  { name: 'Fluido de Freio DOT4',      code: 'FLU001', price: 28  },
];

// OS templates: combinações de serviços + peças + executor por área
const OS_TEMPLATES = [
  {
    complaint: 'Troca de óleo em dia, motor com barulho',
    area: 'MECANICA',
    services: ['Troca de Óleo e Filtro'],
    parts: ['Filtro de Óleo', 'Óleo Motor 5W30 (4L)'],
  },
  {
    complaint: 'Carro puxando para o lado',
    area: 'MECANICA',
    services: ['Alinhamento e Balanceamento'],
    parts: [],
  },
  {
    complaint: 'Freios com chiado',
    area: 'MECANICA',
    services: ['Revisão de Freios'],
    parts: ['Pastilha de Freio Dianteira', 'Disco de Freio'],
  },
  {
    complaint: 'Luz do check engine acesa',
    area: 'ELETRICA',
    services: ['Diagnóstico Eletrônico'],
    parts: ['Vela de Ignição (jogo)'],
  },
  {
    complaint: 'Rádio e elétrica com problema',
    area: 'ELETRICA',
    services: ['Instalação de Som Automotivo', 'Reparo Elétrico Geral'],
    parts: [],
  },
  {
    complaint: 'Amassado no para-lama',
    area: 'FUNILARIA_PINTURA',
    services: ['Funilaria — Amassado Pequeno', 'Pintura Parcial (1 painel)'],
    parts: [],
  },
  {
    complaint: 'Pintura desbotada, solicita polimento',
    area: 'FUNILARIA_PINTURA',
    services: ['Polimento Completo', 'Cristalização de Pintura'],
    parts: [],
  },
  {
    complaint: 'Revisão com lavagem',
    area: 'LAVACAO',
    services: ['Lavagem Completa'],
    parts: [],
  },
  {
    complaint: 'Higienização após enchente',
    area: 'HIGIENIZACAO_EMBELEZAMENTO',
    services: ['Higienização Interna', 'Lavagem Detalhada'],
    parts: [],
  },
  {
    complaint: 'Correia dentada no limite',
    area: 'MECANICA',
    services: ['Troca de Correia Dentada'],
    parts: ['Correia Dentada', 'Filtro de Ar'],
  },
  {
    complaint: 'Suspensão com barulho',
    area: 'MECANICA',
    services: ['Suspensão — Amortecedores'],
    parts: ['Amortecedor Dianteiro'],
  },
  {
    complaint: 'Manutenção preventiva completa',
    area: 'MECANICA',
    services: ['Troca de Óleo e Filtro', 'Alinhamento e Balanceamento'],
    parts: ['Filtro de Óleo', 'Óleo Motor 5W30 (4L)', 'Fluido de Freio DOT4'],
  },
];

const STATUS_SEQUENCE = ['ENTREGUE', 'ENTREGUE', 'ENTREGUE', 'FATURADO', 'PRONTO_ENTREGA', 'EM_EXECUCAO', 'APROVADO', 'ABERTA'];

// ─── taxas de comissão padrão ───────────────────────────────────────────────

const COMMISSION_RATES = [
  { role: 'MECANICO',     rate: 10 },
  { role: 'ELETRICISTA',  rate: 10 },
  { role: 'FUNILEIRO',    rate:  8 },
  { role: 'PINTOR',       rate:  8 },
  { role: 'PREPARADOR',   rate:  8 },
  { role: 'LAVADOR',      rate:  6 },
  { role: 'EMBELEZADOR_AUTOMOTIVO', rate: 6 },
];

// ─── main ──────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Encontra o tenant com o usuário MASTER (primeiro tenant ativo)
  const tenant = await prisma.tenant.findFirst({ where: { status: 'ACTIVE' } });
  if (!tenant) throw new Error('Nenhum tenant ativo encontrado. Crie uma conta primeiro.');
  const tenantId = tenant.id;
  console.log(`[seed] tenant: ${tenant.name} (${tenantId})`);

  // 2. Upsert executores
  const userMap: Record<string, string> = {};
  const pw = await bcrypt.hash('Demo@2026', 10);

  for (const ex of EXECUTORES) {
    const existing = await prisma.user.findFirst({ where: { tenantId, email: ex.email } });
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { workshopArea: ex.workshopArea as any, jobFunction: ex.jobFunction as any },
      });
      userMap[ex.name] = existing.id;
      console.log(`[seed] executor existente atualizado: ${ex.name}`);
    } else {
      const u = await prisma.user.create({
        data: {
          tenantId,
          name: ex.name,
          email: ex.email,
          passwordHash: pw,
          role: ex.role,
          workshopArea: ex.workshopArea as any,
          jobFunction: ex.jobFunction as any,
          isActive: true,
          passwordUpdatedAt: new Date(),
        },
      });
      userMap[ex.name] = u.id;
      console.log(`[seed] executor criado: ${ex.name}`);
    }
  }

  // 3. Taxas de comissão
  for (const cr of COMMISSION_RATES) {
    const existing = await prisma.commissionRate.findFirst({ where: { tenantId, role: cr.role } });
    if (!existing) {
      await prisma.commissionRate.create({ data: { tenantId, role: cr.role, rate: cr.rate } });
    }
  }
  console.log('[seed] taxas de comissão configuradas');

  // 4. Clientes e Veículos
  const clienteIds: string[] = [];
  for (let i = 0; i < CLIENTES.length; i++) {
    const c = CLIENTES[i];
    let cliente = await prisma.customer.findFirst({ where: { tenantId, email: c.email } });
    if (!cliente) {
      cliente = await prisma.customer.create({
        data: { tenantId, name: c.name, phone: c.phone, email: c.email },
      });
    }
    const v = VEICULOS[i];
    const plate = `ABC${1000 + i}`;
    let vehicle = await prisma.vehicle.findFirst({ where: { tenantId, plate } });
    if (!vehicle) {
      vehicle = await prisma.vehicle.create({
        data: {
          tenantId, customerId: cliente.id,
          plate, brand: v.brand, model: v.model,
          year: v.year, color: v.color,
          km: rand(20000, 120000),
        },
      });
    }
    clienteIds.push(`${cliente.id}|${vehicle.id}`);
  }
  console.log('[seed] clientes e veículos criados');

  // 5. Catálogo de serviços e peças
  const svcMap: Record<string, string> = {};
  for (const s of SERVICOS_CATALOGO) {
    let svc = await prisma.service.findFirst({ where: { tenantId, name: s.name } });
    if (!svc) {
      svc = await prisma.service.create({
        data: { tenantId, name: s.name, category: s.category, price: s.price, isActive: true },
      });
    }
    svcMap[s.name] = svc.id;
  }

  const partMap: Record<string, string> = {};
  for (const p of PECAS_CATALOGO) {
    let part = await prisma.part.findFirst({ where: { tenantId, internalCode: p.code } });
    if (!part) {
      part = await prisma.part.create({
        data: {
          tenantId, name: p.name, internalCode: p.code,
          unitPrice: p.price, currentStock: rand(10, 50), isActive: true,
        },
      });
    }
    partMap[p.name] = part.id;
  }
  console.log('[seed] catálogo criado');

  // 6. Ordens de Serviço (48 no total)
  let osCount = 0;
  for (let i = 0; i < 48; i++) {
    const tpl = OS_TEMPLATES[i % OS_TEMPLATES.length];
    const [customerId, vehicleId] = (clienteIds[i % clienteIds.length]).split('|');
    const status = STATUS_SEQUENCE[i % STATUS_SEQUENCE.length];
    const createdAt = daysAgo(rand(1, 90));

    // executor da área principal
    const executoresArea = EXECUTORES.filter(e => e.workshopArea === tpl.area);
    const executor = pick(executoresArea.length > 0 ? executoresArea : EXECUTORES);
    const executorId = userMap[executor.name];

    // itens de serviço
    const itemsData: any[] = [];
    for (const svcName of tpl.services) {
      const svc = SERVICOS_CATALOGO.find(s => s.name === svcName)!;
      itemsData.push({
        serviceId: svcMap[svcName],
        description: svcName,
        quantity: 1,
        unitPrice: svc.price,
        discount: 0,
        totalPrice: svc.price,
        type: 'service',
        applied: false,
        assignedUserId: executorId,
      });
    }

    // itens de peça — executor secundário (mecânico da mesma área)
    const execPeca = pick(EXECUTORES.filter(e => e.workshopArea === 'MECANICA'));
    const execPecaId = userMap[execPeca.name];

    for (const partName of tpl.parts) {
      const p = PECAS_CATALOGO.find(x => x.name === partName)!;
      itemsData.push({
        partId: partMap[partName],
        description: partName,
        quantity: 1,
        unitPrice: p.price,
        discount: 0,
        totalPrice: p.price,
        type: 'part',
        applied: ['FATURADO', 'ENTREGUE', 'PRONTO_ENTREGA'].includes(status),
        assignedUserId: execPecaId,
      });
    }

    const totalServices = itemsData.filter(x => x.type === 'service').reduce((s, x) => s + x.totalPrice, 0);
    const totalParts = itemsData.filter(x => x.type === 'part').reduce((s, x) => s + x.totalPrice, 0);
    const totalCost = totalServices + totalParts;

    const os = await prisma.serviceOrder.create({
      data: {
        tenantId,
        customerId,
        vehicleId,
        orderType: 'ORDEM_SERVICO',
        status,
        complaint: tpl.complaint,
        totalServices,
        totalParts,
        totalLabor: 0,
        totalCost,
        kmEntrada: rand(20000, 120000),
        createdAt,
        updatedAt: createdAt,
        startedAt: ['EM_EXECUCAO', 'PRONTO_ENTREGA', 'FATURADO', 'ENTREGUE'].includes(status) ? createdAt : null,
        completedAt: ['PRONTO_ENTREGA', 'FATURADO', 'ENTREGUE'].includes(status) ? daysAgo(rand(0, 30)) : null,
        paidAt: ['FATURADO', 'ENTREGUE'].includes(status) ? daysAgo(rand(0, 20)) : null,
        deliveredAt: status === 'ENTREGUE' ? daysAgo(rand(0, 15)) : null,
        items: { create: itemsData },
      },
    });

    // 7. Gera comissões para OS faturadas/entregues
    if (['FATURADO', 'ENTREGUE'].includes(status)) {
      const items = await prisma.serviceOrderItem.findMany({
        where: { serviceOrderId: os.id, assignedUserId: { not: null } },
        include: { assignedUser: true, commission: true },
      });

      for (const item of items) {
        if (!item.assignedUserId || item.commission) continue;
        const jf = (item.assignedUser as any)?.jobFunction as string | null;
        const rateRow = jf
          ? await prisma.commissionRate.findFirst({ where: { tenantId, role: jf } })
          : null;
        const rate = rateRow?.rate ?? 10;
        const base = Number(item.totalPrice);
        await prisma.commission.create({
          data: {
            tenantId,
            serviceOrderId: os.id,
            serviceOrderItemId: item.id,
            userId: item.assignedUserId,
            baseValue: base,
            commissionPercent: rate,
            commissionValue: parseFloat(((base * rate) / 100).toFixed(2)),
            status: Math.random() > 0.4 ? 'PENDENTE' : 'PAGO',
            paidAt: Math.random() > 0.4 ? null : daysAgo(rand(0, 10)),
            createdAt: os.createdAt,
          },
        });
      }
    }

    osCount++;
    if (osCount % 10 === 0) console.log(`[seed] ${osCount} OSs criadas...`);
  }

  console.log(`[seed] CONCLUÍDO — ${osCount} ordens de serviço criadas com peças, serviços e comissões.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
