import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (d: number) => { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt; };

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private prisma: PrismaService) {}

  async runDemo(tenantId: string): Promise<{ message: string; stats: Record<string, number> }> {
    const EXECUTORES = [
      { name: 'Carlos Mecânico',    email: 'carlos.mec@demo.com',   role: 'MECANICO', jobFunction: 'MECANICO',                workshopArea: 'MECANICA' },
      { name: 'Roberto Mecânico',   email: 'roberto.mec@demo.com',  role: 'MECANICO', jobFunction: 'MECANICO',                workshopArea: 'MECANICA' },
      { name: 'André Elétrica',     email: 'andre.ele@demo.com',    role: 'MECANICO', jobFunction: 'ELETRICISTA',             workshopArea: 'ELETRICA' },
      { name: 'Paulo Elétrica',     email: 'paulo.ele@demo.com',    role: 'MECANICO', jobFunction: 'ELETRICISTA',             workshopArea: 'ELETRICA' },
      { name: 'Marcos Funileiro',   email: 'marcos.fun@demo.com',   role: 'MECANICO', jobFunction: 'FUNILEIRO',               workshopArea: 'FUNILARIA_PINTURA' },
      { name: 'Diego Pintor',       email: 'diego.pin@demo.com',    role: 'MECANICO', jobFunction: 'PINTOR',                  workshopArea: 'FUNILARIA_PINTURA' },
      { name: 'Felipe Preparador',  email: 'felipe.pre@demo.com',   role: 'MECANICO', jobFunction: 'PREPARADOR',              workshopArea: 'FUNILARIA_PINTURA' },
      { name: 'Lucas Lavador',      email: 'lucas.lav@demo.com',    role: 'MECANICO', jobFunction: 'LAVADOR',                 workshopArea: 'LAVACAO' },
      { name: 'Mateus Lavador',     email: 'mateus.lav@demo.com',   role: 'MECANICO', jobFunction: 'LAVADOR',                 workshopArea: 'LAVACAO' },
      { name: 'Rafael Embelezador', email: 'rafael.emb@demo.com',   role: 'MECANICO', jobFunction: 'EMBELEZADOR_AUTOMOTIVO',  workshopArea: 'HIGIENIZACAO_EMBELEZAMENTO' },
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
      { brand: 'Volkswagen', model: 'Gol',     year: 2018, color: 'Prata'   },
      { brand: 'Fiat',       model: 'Uno',      year: 2020, color: 'Branco'  },
      { brand: 'Chevrolet',  model: 'Onix',     year: 2021, color: 'Cinza'   },
      { brand: 'Toyota',     model: 'Corolla',  year: 2019, color: 'Preto'   },
      { brand: 'Honda',      model: 'Civic',    year: 2022, color: 'Azul'    },
      { brand: 'Ford',       model: 'Ka',       year: 2017, color: 'Vermelho'},
      { brand: 'Hyundai',    model: 'HB20',     year: 2020, color: 'Branco'  },
      { brand: 'Renault',    model: 'Kwid',     year: 2021, color: 'Laranja' },
      { brand: 'Jeep',       model: 'Compass',  year: 2022, color: 'Prata'   },
      { brand: 'Nissan',     model: 'Kicks',    year: 2019, color: 'Cinza'   },
      { brand: 'Volkswagen', model: 'Polo',     year: 2023, color: 'Branco'  },
      { brand: 'Fiat',       model: 'Strada',   year: 2021, color: 'Preto'   },
    ];

    const SERVICOS = [
      { name: 'Troca de Óleo e Filtro',        category: 'preventiva',  price: 120, area: 'MECANICA' },
      { name: 'Alinhamento e Balanceamento',   category: 'preventiva',  price: 160, area: 'MECANICA' },
      { name: 'Revisão de Freios',             category: 'seguranca',   price: 250, area: 'MECANICA' },
      { name: 'Diagnóstico Eletrônico',        category: 'diagnostico', price: 180, area: 'ELETRICA' },
      { name: 'Instalação de Som Automotivo',  category: 'acessorios',  price: 350, area: 'ELETRICA' },
      { name: 'Reparo Elétrico Geral',         category: 'corretiva',   price: 300, area: 'ELETRICA' },
      { name: 'Funilaria — Amassado Pequeno',  category: 'funilaria',   price: 400, area: 'FUNILARIA_PINTURA' },
      { name: 'Pintura Parcial (1 painel)',    category: 'pintura',     price: 600, area: 'FUNILARIA_PINTURA' },
      { name: 'Polimento Completo',            category: 'estetica',    price: 280, area: 'FUNILARIA_PINTURA' },
      { name: 'Lavagem Completa',              category: 'limpeza',     price: 80,  area: 'LAVACAO' },
      { name: 'Lavagem Detalhada',             category: 'limpeza',     price: 140, area: 'LAVACAO' },
      { name: 'Higienização Interna',          category: 'limpeza',     price: 220, area: 'HIGIENIZACAO_EMBELEZAMENTO' },
      { name: 'Cristalização de Pintura',      category: 'estetica',    price: 350, area: 'FUNILARIA_PINTURA' },
      { name: 'Troca de Correia Dentada',      category: 'preventiva',  price: 480, area: 'MECANICA' },
      { name: 'Suspensão — Amortecedores',     category: 'corretiva',   price: 560, area: 'MECANICA' },
    ];

    const PECAS = [
      { name: 'Filtro de Óleo',             code: 'FLT001', price: 35  },
      { name: 'Óleo Motor 5W30 (4L)',        code: 'OLO001', price: 120 },
      { name: 'Pastilha de Freio Dianteira', code: 'FRE001', price: 160 },
      { name: 'Correia Dentada',             code: 'COR001', price: 180 },
      { name: 'Amortecedor Dianteiro',       code: 'AMO001', price: 320 },
      { name: 'Filtro de Ar',                code: 'FLT002', price: 45  },
      { name: 'Vela de Ignição (jogo)',      code: 'VEL001', price: 95  },
      { name: 'Disco de Freio',              code: 'FRE003', price: 210 },
      { name: 'Fluido de Freio DOT4',        code: 'FLU001', price: 28  },
    ];

    const OS_TEMPLATES = [
      { complaint: 'Troca de óleo',             area: 'MECANICA',                  services: ['Troca de Óleo e Filtro'],                                parts: ['Filtro de Óleo', 'Óleo Motor 5W30 (4L)'] },
      { complaint: 'Carro puxando para o lado', area: 'MECANICA',                  services: ['Alinhamento e Balanceamento'],                            parts: [] },
      { complaint: 'Freios com chiado',          area: 'MECANICA',                  services: ['Revisão de Freios'],                                      parts: ['Pastilha de Freio Dianteira', 'Disco de Freio'] },
      { complaint: 'Check engine acesa',         area: 'ELETRICA',                  services: ['Diagnóstico Eletrônico'],                                 parts: ['Vela de Ignição (jogo)'] },
      { complaint: 'Rádio com defeito',          area: 'ELETRICA',                  services: ['Instalação de Som Automotivo', 'Reparo Elétrico Geral'],   parts: [] },
      { complaint: 'Amassado no para-lama',      area: 'FUNILARIA_PINTURA',         services: ['Funilaria — Amassado Pequeno', 'Pintura Parcial (1 painel)'], parts: [] },
      { complaint: 'Polimento e cristalização',  area: 'FUNILARIA_PINTURA',         services: ['Polimento Completo', 'Cristalização de Pintura'],          parts: [] },
      { complaint: 'Lavagem pós-viagem',         area: 'LAVACAO',                   services: ['Lavagem Completa'],                                        parts: [] },
      { complaint: 'Higienização após enchente', area: 'HIGIENIZACAO_EMBELEZAMENTO',services: ['Higienização Interna', 'Lavagem Detalhada'],               parts: [] },
      { complaint: 'Correia dentada no limite',  area: 'MECANICA',                  services: ['Troca de Correia Dentada'],                               parts: ['Correia Dentada', 'Filtro de Ar'] },
      { complaint: 'Suspensão com barulho',      area: 'MECANICA',                  services: ['Suspensão — Amortecedores'],                              parts: ['Amortecedor Dianteiro'] },
      { complaint: 'Revisão preventiva geral',   area: 'MECANICA',                  services: ['Troca de Óleo e Filtro', 'Alinhamento e Balanceamento'],  parts: ['Filtro de Óleo', 'Óleo Motor 5W30 (4L)', 'Fluido de Freio DOT4'] },
    ];

    const STATUS_SEQ = ['ENTREGUE','ENTREGUE','ENTREGUE','FATURADO','PRONTO_ENTREGA','EM_EXECUCAO','APROVADO','ABERTA'];
    const RATES_MAP: Record<string, number> = {
      MECANICO: 10, ELETRICISTA: 10, FUNILEIRO: 8, PINTOR: 8,
      PREPARADOR: 8, LAVADOR: 6, EMBELEZADOR_AUTOMOTIVO: 6,
    };

    const stats = { users: 0, customers: 0, vehicles: 0, services: 0, parts: 0, os: 0, commissions: 0 };
    const pw = await bcrypt.hash('Demo@2026', 10);

    // Executores
    const userMap: Record<string, string> = {};
    for (const ex of EXECUTORES) {
      const existing = await this.prisma.user.findFirst({ where: { tenantId, email: ex.email } });
      if (existing) {
        await this.prisma.user.update({ where: { id: existing.id }, data: { workshopArea: ex.workshopArea as any, jobFunction: ex.jobFunction as any } });
        userMap[ex.name] = existing.id;
      } else {
        const u = await this.prisma.user.create({
          data: { tenantId, name: ex.name, email: ex.email, passwordHash: pw, role: ex.role as any, workshopArea: ex.workshopArea as any, jobFunction: ex.jobFunction as any, isActive: true, passwordUpdatedAt: new Date() },
        });
        userMap[ex.name] = u.id;
        stats.users++;
      }
    }

    // Taxas de comissão
    for (const [role, rate] of Object.entries(RATES_MAP)) {
      const exists = await this.prisma.commissionRate.findFirst({ where: { tenantId, role } });
      if (!exists) await this.prisma.commissionRate.create({ data: { tenantId, role, rate } });
    }

    // Clientes + Veículos
    const pairs: string[] = [];
    for (let i = 0; i < CLIENTES.length; i++) {
      const c = CLIENTES[i];
      let cliente = await this.prisma.customer.findFirst({ where: { tenantId, email: c.email } });
      if (!cliente) { cliente = await this.prisma.customer.create({ data: { tenantId, name: c.name, phone: c.phone, email: c.email } }); stats.customers++; }
      const v = VEICULOS[i];
      const plate = `DM${String(i + 1).padStart(4, '0')}`;
      let vehicle = await this.prisma.vehicle.findFirst({ where: { tenantId, plate } });
      if (!vehicle) { vehicle = await this.prisma.vehicle.create({ data: { tenantId, customerId: cliente.id, plate, brand: v.brand, model: v.model, year: v.year, color: v.color, km: rand(20000, 120000) } }); stats.vehicles++; }
      pairs.push(`${cliente.id}|${vehicle.id}`);
    }

    // Catálogo serviços
    const svcMap: Record<string, string> = {};
    for (const s of SERVICOS) {
      let svc = await this.prisma.service.findFirst({ where: { tenantId, name: s.name } });
      if (!svc) { svc = await this.prisma.service.create({ data: { tenantId, name: s.name, category: s.category, price: s.price, isActive: true } }); stats.services++; }
      svcMap[s.name] = svc.id;
    }

    // Catálogo peças
    const partMap: Record<string, string> = {};
    for (const p of PECAS) {
      let part = await this.prisma.part.findFirst({ where: { tenantId, internalCode: p.code } });
      if (!part) { part = await this.prisma.part.create({ data: { tenantId, name: p.name, internalCode: p.code, unitPrice: p.price, currentStock: rand(10, 50), isActive: true } }); stats.parts++; }
      partMap[p.name] = part.id;
    }

    // 48 Ordens de Serviço
    for (let i = 0; i < 48; i++) {
      const tpl = OS_TEMPLATES[i % OS_TEMPLATES.length];
      const [customerId, vehicleId] = pairs[i % pairs.length].split('|');
      const status = STATUS_SEQ[i % STATUS_SEQ.length];
      const createdAt = daysAgo(rand(1, 90));

      const executoresArea = EXECUTORES.filter(e => e.workshopArea === tpl.area);
      const executor = pick(executoresArea.length ? executoresArea : EXECUTORES);
      const executorId = userMap[executor.name];

      const itemsData: any[] = [];
      for (const svcName of tpl.services) {
        const svc = SERVICOS.find(s => s.name === svcName)!;
        itemsData.push({ serviceId: svcMap[svcName], description: svcName, quantity: 1, unitPrice: svc.price, discount: 0, totalPrice: svc.price, type: 'service', applied: false, assignedUserId: executorId });
      }
      const execPeca = pick(EXECUTORES.filter(e => e.workshopArea === 'MECANICA'));
      const execPecaId = userMap[execPeca.name];
      for (const partName of tpl.parts) {
        const p = PECAS.find(x => x.name === partName)!;
        if (!p) continue;
        itemsData.push({ partId: partMap[partName], description: partName, quantity: 1, unitPrice: p.price, discount: 0, totalPrice: p.price, type: 'part', applied: ['FATURADO','ENTREGUE','PRONTO_ENTREGA'].includes(status), assignedUserId: execPecaId });
      }

      const totalServices = itemsData.filter(x => x.type === 'service').reduce((s, x) => s + x.totalPrice, 0);
      const totalParts    = itemsData.filter(x => x.type === 'part').reduce((s, x) => s + x.totalPrice, 0);

      const os = await this.prisma.serviceOrder.create({
        data: {
          tenantId, customerId, vehicleId, orderType: 'ORDEM_SERVICO', status,
          complaint: tpl.complaint,
          totalServices, totalParts, totalLabor: 0, totalCost: totalServices + totalParts,
          kmEntrada: rand(20000, 120000), createdAt, updatedAt: createdAt,
          startedAt:   ['EM_EXECUCAO','PRONTO_ENTREGA','FATURADO','ENTREGUE'].includes(status) ? createdAt : null,
          completedAt: ['PRONTO_ENTREGA','FATURADO','ENTREGUE'].includes(status) ? daysAgo(rand(0, 30)) : null,
          paidAt:      ['FATURADO','ENTREGUE'].includes(status) ? daysAgo(rand(0, 20)) : null,
          deliveredAt: status === 'ENTREGUE' ? daysAgo(rand(0, 15)) : null,
          items: { create: itemsData },
        },
      });
      stats.os++;

      if (['FATURADO','ENTREGUE'].includes(status)) {
        const items = await this.prisma.serviceOrderItem.findMany({
          where: { serviceOrderId: os.id, assignedUserId: { not: null } },
          include: { assignedUser: true, commission: true },
        });
        for (const item of items) {
          if (!item.assignedUserId || item.commission) continue;
          const jf = (item.assignedUser as any)?.jobFunction as string | null;
          const rate = jf ? (RATES_MAP[jf] ?? 10) : 10;
          const base = Number(item.totalPrice);
          const isPaid = Math.random() > 0.5;
          await this.prisma.commission.create({
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
          stats.commissions++;
        }
      }
    }

    this.logger.log(`Seed concluído: ${JSON.stringify(stats)}`);
    return { message: 'Seed demo concluído com sucesso', stats };
  }
}
