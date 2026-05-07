import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/financial.dto';

@Injectable()
export class FinancialService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.financialTransaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  async findById(tenantId: string, transactionId: string) {
    const transaction = await this.prisma.financialTransaction.findFirst({
      where: { id: transactionId, tenantId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async create(tenantId: string, actorUserId: string, dto: CreateTransactionDto) {
    const created = await this.prisma.financialTransaction.create({
      data: {
        tenantId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        category: dto.category,
        referenceId: dto.referenceId,
        referenceType: dto.referenceType,
        date: dto.date ? new Date(dto.date) : new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'FinancialTransaction',
        entityId: created.id,
        action: 'CREATE',
        changes: JSON.stringify(created),
      },
    });

    return created;
  }

  async delete(tenantId: string, actorUserId: string, transactionId: string) {
    const transaction = await this.findById(tenantId, transactionId);

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'FinancialTransaction',
        entityId: transactionId,
        action: 'DELETE',
        changes: JSON.stringify(transaction),
      },
    });

    return this.prisma.financialTransaction.delete({
      where: { id: transactionId },
    });
  }

  async getSummary(tenantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { tenantId };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const transactions = await this.prisma.financialTransaction.findMany({ where });

    const totalIncome = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const totalExpense = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      period: { start: startDate || new Date(0), end: endDate || new Date() },
    };
  }

  async getOSProfit(tenantId: string, serviceOrderId: string) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException('Service order not found');
    }

    return {
      serviceOrderId,
      revenue: Number(order.totalCost),
      costs: order.items.reduce((sum, item) => sum + Number(item.totalPrice), 0),
      profit: Number(order.totalCost),
    };
  }

  async getOSReport(tenantId: string, filters: {
    startDate?: string;
    endDate?: string;
    status?: string;
  }) {
    const where: any = { tenantId };
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }
    if (filters.status) where.status = filters.status;

    const orders = await this.prisma.serviceOrder.findMany({
      where,
      include: {
        customer: { select: { name: true } },
        vehicle: { select: { plate: true, model: true, brand: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const revenueOrders = orders.filter((o) =>
      ['ENTREGUE', 'FATURADO'].includes(o.status),
    );
    const totalRevenue = revenueOrders.reduce((s, o) => s + Number(o.totalCost ?? 0), 0);
    const ticketMedio = revenueOrders.length > 0 ? totalRevenue / revenueOrders.length : 0;

    const statusBreakdown: Record<string, number> = {};
    for (const o of orders) {
      statusBreakdown[o.status] = (statusBreakdown[o.status] ?? 0) + 1;
    }

    const customerRevMap: Record<string, { name: string; count: number; total: number }> = {};
    for (const o of revenueOrders) {
      const name = (o.customer as any)?.name ?? 'Desconhecido';
      if (!customerRevMap[name]) customerRevMap[name] = { name, count: 0, total: 0 };
      customerRevMap[name].count++;
      customerRevMap[name].total += Number(o.totalCost ?? 0);
    }
    const topCustomers = Object.values(customerRevMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return {
      orders,
      summary: {
        total: orders.length,
        delivered: revenueOrders.length,
        totalRevenue,
        ticketMedio,
      },
      statusBreakdown,
      topCustomers,
    };
  }

  /**
   * DRE — Demonstrativo de Resultado do Exercício
   * Estrutura: Receita Bruta → Deduções → Receita Líquida → CMV → Margem Bruta
   *           → Despesas Operacionais → EBITDA → Resultado Líquido
   */
  async getDRE(tenantId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 1. Todas as transações do período
    const transactions = await this.prisma.financialTransaction.findMany({
      where: { tenantId, date: { gte: startDate, lte: endDate } },
    });

    // 2. OS entregues no período (fonte de receita)
    const deliveredOrders = await this.prisma.serviceOrder.findMany({
      where: {
        tenantId,
        status: 'ENTREGUE',
        updatedAt: { gte: startDate, lte: endDate },
      },
      include: { items: { include: { part: true } } },
    });

    // Receita bruta de OS entregues
    const receitaBrutaOS = deliveredOrders.reduce(
      (sum, o) => sum + Number(o.totalCost ?? 0),
      0,
    );

    // CMV = custo das peças usadas nas OS entregues
    const cmv = deliveredOrders.reduce((sum, order) => {
      const costParts = order.items.reduce((s, item) => {
        const costPrice = Number(item.part?.costPrice ?? 0);
        return s + costPrice * Number(item.quantity ?? 1);
      }, 0);
      return sum + costParts;
    }, 0);

    // Receita de transações manuais tipo INCOME
    const receitaManual = transactions
      .filter((t) => t.type === 'INCOME')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Despesas operacionais (EXPENSE sem CMV)
    const despesasOperacionais = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Deduções (impostos estimados ~8% sobre receita — configurável futuramente)
    const DEDUCAO_PERCENTUAL = 0.08;
    const receitaBruta = receitaBrutaOS + receitaManual;
    const deducoes = receitaBruta * DEDUCAO_PERCENTUAL;
    const receitaLiquida = receitaBruta - deducoes;
    const margemBruta = receitaLiquida - cmv;
    const ebitda = margemBruta - despesasOperacionais;
    const resultadoLiquido = ebitda; // sem IR/CSLL (simplificado)

    // Breakdown por categoria de despesa
    const despesasPorCategoria = transactions
      .filter((t) => t.type === 'EXPENSE')
      .reduce<Record<string, number>>((acc, t) => {
        const cat = t.category || 'Outros';
        acc[cat] = (acc[cat] ?? 0) + Number(t.amount);
        return acc;
      }, {});

    // Histórico mensal dos últimos 6 meses
    const historico: Array<{ mes: string; receita: number; despesa: number; resultado: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - 1 - i, 1);
      const dEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const txs = await this.prisma.financialTransaction.findMany({
        where: { tenantId, date: { gte: d, lte: dEnd } },
      });
      const orders = await this.prisma.serviceOrder.findMany({
        where: { tenantId, status: 'ENTREGUE', updatedAt: { gte: d, lte: dEnd } },
      });
      const rec = orders.reduce((s, o) => s + Number(o.totalCost ?? 0), 0)
        + txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
      const des = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
      historico.push({
        mes: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        receita: rec,
        despesa: des,
        resultado: rec - des,
      });
    }

    return {
      periodo: {
        ano: year,
        mes: month,
        label: startDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
      },
      dre: {
        receitaBruta,
        deducoes,
        receitaLiquida,
        cmv,
        margemBruta,
        margemBrutaPerc: receitaLiquida > 0 ? (margemBruta / receitaLiquida) * 100 : 0,
        despesasOperacionais,
        ebitda,
        ebitdaPerc: receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0,
        resultadoLiquido,
      },
      detalhes: {
        osEntregues: deliveredOrders.length,
        receitaBrutaOS,
        receitaManual,
        despesasPorCategoria,
      },
      historico,
    };
  }

  /** Agrega DRE de todos os meses de um ano */
  async getDREAnual(tenantId: string, year: number) {
    const DEDUCAO_PERCENTUAL = 0.08;
    const meses: Array<{
      mes: string; mesNum: number;
      receita: number; despesa: number; resultado: number; cmv: number; ebitda: number;
    }> = [];

    let totalReceitaBruta = 0, totalCmv = 0, totalDespesas = 0;
    const despesasPorCat: Record<string, number> = {};
    let totalOs = 0;

    for (let m = 1; m <= 12; m++) {
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59);

      const [txs, orders] = await Promise.all([
        this.prisma.financialTransaction.findMany({ where: { tenantId, date: { gte: start, lte: end } } }),
        this.prisma.serviceOrder.findMany({
          where: { tenantId, status: 'ENTREGUE', updatedAt: { gte: start, lte: end } },
          include: { items: { include: { part: true } } },
        }),
      ]);

      const receitaOS = orders.reduce((s, o) => s + Number(o.totalCost ?? 0), 0);
      const receitaManual = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
      const receita = receitaOS + receitaManual;
      const cmvMes = orders.reduce((s, o) =>
        s + o.items.reduce((si, i) => si + Number(i.part?.costPrice ?? 0) * Number(i.quantity ?? 1), 0), 0);
      const despesa = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
      const ebitdaMes = (receita - receita * DEDUCAO_PERCENTUAL) - cmvMes - despesa;

      txs.filter((t) => t.type === 'EXPENSE').forEach((t) => {
        const cat = t.category || 'Outros';
        despesasPorCat[cat] = (despesasPorCat[cat] ?? 0) + Number(t.amount);
      });

      totalReceitaBruta += receita;
      totalCmv += cmvMes;
      totalDespesas += despesa;
      totalOs += orders.length;

      meses.push({
        mes: start.toLocaleDateString('pt-BR', { month: 'short' }),
        mesNum: m,
        receita, despesa,
        resultado: receita - despesa,
        cmv: cmvMes,
        ebitda: ebitdaMes,
      });
    }

    const deducoes = totalReceitaBruta * DEDUCAO_PERCENTUAL;
    const receitaLiquida = totalReceitaBruta - deducoes;
    const margemBruta = receitaLiquida - totalCmv;
    const ebitda = margemBruta - totalDespesas;

    return {
      periodo: { ano: year, label: `Ano ${year}` },
      dre: {
        receitaBruta: totalReceitaBruta,
        deducoes,
        receitaLiquida,
        cmv: totalCmv,
        margemBruta,
        margemBrutaPerc: receitaLiquida > 0 ? (margemBruta / receitaLiquida) * 100 : 0,
        despesasOperacionais: totalDespesas,
        ebitda,
        ebitdaPerc: receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0,
        resultadoLiquido: ebitda,
      },
      detalhes: { osEntregues: totalOs, despesasPorCategoria: despesasPorCat },
      meses,
    };
  }

  /** KPIs financeiros para múltiplos períodos (BI) */
  async getIndicadores(tenantId: string) {
    const now = new Date();
    const DEDUCAO = 0.08;

    const calcPeriodo = async (start: Date, end: Date) => {
      const [txs, orders] = await Promise.all([
        this.prisma.financialTransaction.findMany({ where: { tenantId, date: { gte: start, lte: end } } }),
        this.prisma.serviceOrder.findMany({
          where: { tenantId, status: 'ENTREGUE', updatedAt: { gte: start, lte: end } },
          include: { items: { include: { part: true } } },
        }),
      ]);
      const receitaBruta = orders.reduce((s, o) => s + Number(o.totalCost ?? 0), 0)
        + txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
      const cmv = orders.reduce((s, o) =>
        s + o.items.reduce((si, i) => si + Number(i.part?.costPrice ?? 0) * Number(i.quantity ?? 1), 0), 0);
      const despesas = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
      const receitaLiquida = receitaBruta - receitaBruta * DEDUCAO;
      const margemBruta = receitaLiquida - cmv;
      const ebitda = margemBruta - despesas;
      const osAbertas = await this.prisma.serviceOrder.count({
        where: { tenantId, status: { notIn: ['ENTREGUE', 'CANCELADO'] } },
      });
      return {
        receitaBruta,
        receitaLiquida,
        cmv,
        margemBruta,
        margemBrutaPerc: receitaLiquida > 0 ? (margemBruta / receitaLiquida) * 100 : 0,
        despesas,
        ebitda,
        ebitdaPerc: receitaLiquida > 0 ? (ebitda / receitaLiquida) * 100 : 0,
        resultado: ebitda,
        osEntregues: orders.length,
        osAbertas,
        ticketMedio: orders.length > 0 ? orders.reduce((s, o) => s + Number(o.totalCost ?? 0), 0) / orders.length : 0,
      };
    };

    // Mês atual
    const mesAtualStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const mesAtualEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Trimestre atual (últimos 3 meses)
    const trimestreStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const trimestreEnd   = mesAtualEnd;

    // Semestre atual (últimos 6 meses)
    const semestreStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const semestreEnd   = mesAtualEnd;

    // Semestre anterior (6 meses atrás)
    const semAntStart = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    const semAntEnd   = new Date(now.getFullYear(), now.getMonth() - 6, 0, 23, 59, 59);

    // Ano atual
    const anoStart = new Date(now.getFullYear(), 0, 1);
    const anoEnd   = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const [mesAtual, trimestre, semestre, semestreAnterior, anual] = await Promise.all([
      calcPeriodo(mesAtualStart, mesAtualEnd),
      calcPeriodo(trimestreStart, trimestreEnd),
      calcPeriodo(semestreStart, semestreEnd),
      calcPeriodo(semAntStart, semAntEnd),
      calcPeriodo(anoStart, anoEnd),
    ]);

    return {
      geradoEm: now.toISOString(),
      periodos: {
        mesAtual: { label: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }), ...mesAtual },
        trimestre: { label: `Últimos 3 meses`, ...trimestre },
        semestre: { label: `Últimos 6 meses`, ...semestre },
        semestreAnterior: {
          label: `${semAntStart.toLocaleDateString('pt-BR', { month: 'short' })}–${semAntEnd.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}`,
          ...semestreAnterior,
        },
        anual: { label: `Ano ${now.getFullYear()}`, ...anual },
      },
    };
  }
}