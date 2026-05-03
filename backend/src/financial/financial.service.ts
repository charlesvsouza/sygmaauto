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

  async create(tenantId: string, dto: CreateTransactionDto) {
    return this.prisma.financialTransaction.create({
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
  }

  async delete(tenantId: string, transactionId: string) {
    await this.findById(tenantId, transactionId);
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
}