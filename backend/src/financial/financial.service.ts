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
        // Meio-dia em Brasília: uma data "AAAA-MM-DD" não deve virar 21h do dia
        // anterior quando interpretada no fuso UTC do servidor.
        date: dto.date ? new Date(`${dto.date}T12:00:00-03:00`) : new Date(),
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

  // Regra única de receita: a receita de cada O.S. é UM lançamento no livro-caixa, feito no
  // faturamento (service-orders: recordOrderRevenue). Tela Financeiro, DRE e indicadores
  // leem o mesmo livro-caixa; a O.S. não é somada de novo por fora. O custo das peças
  // (CMV) vem das O.S. faturadas no mesmo período da receita.
  private invoicedOrdersWhere(tenantId: string, start: Date, end: Date) {
    return {
      tenantId,
      OR: [
        { paidAt: { gte: start, lte: end } },
        // Legado: O.S. faturada sem data de pagamento gravada.
        { paidAt: null, status: { in: ['FATURADO', 'ENTREGUE'] }, updatedAt: { gte: start, lte: end } },
      ],
    };
  }

  private splitLedger(txs: Array<{ type: string; amount: any; referenceType: string | null; category: string | null }>) {
    const income = txs.filter((t) => t.type === 'INCOME');
    // Despesa ligada a O.S. é custo de peça, já contado no CMV.
    const expenses = txs.filter((t) => t.type === 'EXPENSE' && t.referenceType !== 'service_order');
    const sum = (list: typeof txs) => list.reduce((acc, t) => acc + Number(t.amount), 0);
    const receitaOS = sum(income.filter((t) => t.referenceType === 'service_order'));
    const receitaManual = sum(income.filter((t) => t.referenceType !== 'service_order'));
    return { receitaOS, receitaManual, receita: receitaOS + receitaManual, despesas: sum(expenses), expenses };
  }

  private cmvOf(orders: Array<{ items: Array<{ quantity: any; part: { costPrice: any } | null }> }>) {
    return orders.reduce((sum, order) => sum + order.items.reduce(
      (s, item) => s + Number(item.part?.costPrice ?? 0) * Number(item.quantity ?? 1), 0), 0);
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
      include: { items: { include: { part: true } } },
    });

    if (!order) {
      throw new NotFoundException('Service order not found');
    }

    // Receita = total faturado; custo = custo real das peças (costPrice × qtd).
    const revenue = Number(order.totalCost ?? 0);
    const costs = order.items.reduce(
      (sum, item) => sum + Number(item.part?.costPrice ?? 0) * Number(item.quantity ?? 1),
      0,
    );
    return {
      serviceOrderId,
      revenue,
      costs,
      profit: revenue - costs,
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
      if (filters.startDate) where.createdAt.gte = new Date(`${filters.startDate}T00:00:00-03:00`);
      if (filters.endDate) {
        where.createdAt.lte = new Date(`${filters.endDate}T23:59:59.999-03:00`);
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
  // Limites do mês no fuso de Brasília (independente do fuso do servidor).
  private brMonthRange(year: number, month: number): { start: Date; end: Date } {
    const mm = String(month).padStart(2, '0');
    const start = new Date(`${year}-${mm}-01T00:00:00-03:00`);
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const end = new Date(`${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00-03:00`);
    end.setTime(end.getTime() - 1);
    return { start, end };
  }

  async getDRE(tenantId: string, year: number, month: number) {
    const { start: startDate, end: endDate } = this.brMonthRange(year, month);

    // 1. Todas as transações do período
    const transactions = await this.prisma.financialTransaction.findMany({
      where: { tenantId, date: { gte: startDate, lte: endDate } },
    });

    // 2. O.S. faturadas no período (base do CMV)
    const invoicedOrders = await this.prisma.serviceOrder.findMany({
      where: this.invoicedOrdersWhere(tenantId, startDate, endDate),
      include: { items: { include: { part: true } } },
    });

    // Receita e despesas do livro-caixa (a receita das O.S. já está nele)
    const ledger = this.splitLedger(transactions);
    const receitaBrutaOS = ledger.receitaOS;
    const receitaManual = ledger.receitaManual;
    const cmv = this.cmvOf(invoicedOrders);
    const despesasOperacionais = ledger.despesas;

    // Deduções (impostos estimados ~8% sobre receita — configurável futuramente)
    const DEDUCAO_PERCENTUAL = 0.08;
    const receitaBruta = ledger.receita;
    const deducoes = receitaBruta * DEDUCAO_PERCENTUAL;
    const receitaLiquida = receitaBruta - deducoes;
    const margemBruta = receitaLiquida - cmv;
    const ebitda = margemBruta - despesasOperacionais;
    const resultadoLiquido = ebitda; // sem IR/CSLL (simplificado)

    // Breakdown por categoria de despesa
    const despesasPorCategoria = ledger.expenses
      .reduce<Record<string, number>>((acc, t) => {
        const cat = t.category || 'Outros';
        acc[cat] = (acc[cat] ?? 0) + Number(t.amount);
        return acc;
      }, {});

    // Histórico mensal dos últimos 6 meses
    const historico: Array<{ mes: string; receita: number; despesa: number; resultado: number }> = [];
    for (let i = 5; i >= 0; i--) {
      const baseMonth = month - i;
      const dYear = baseMonth < 1 ? year - 1 : year;
      const dMonth = baseMonth < 1 ? baseMonth + 12 : baseMonth;
      const { start: d, end: dEnd } = this.brMonthRange(dYear, dMonth);
      const txs = await this.prisma.financialTransaction.findMany({
        where: { tenantId, date: { gte: d, lte: dEnd } },
      });
      const monthLedger = this.splitLedger(txs);
      const rec = monthLedger.receita;
      const des = monthLedger.despesas;
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
        osEntregues: invoicedOrders.length,
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
      const { start, end } = this.brMonthRange(year, m);

      const [txs, orders] = await Promise.all([
        this.prisma.financialTransaction.findMany({ where: { tenantId, date: { gte: start, lte: end } } }),
        this.prisma.serviceOrder.findMany({
          where: this.invoicedOrdersWhere(tenantId, start, end),
          include: { items: { include: { part: true } } },
        }),
      ]);

      const monthLedger = this.splitLedger(txs);
      const receita = monthLedger.receita;
      const cmvMes = this.cmvOf(orders);
      const despesa = monthLedger.despesas;
      const ebitdaMes = (receita - receita * DEDUCAO_PERCENTUAL) - cmvMes - despesa;

      monthLedger.expenses.forEach((t) => {
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
    // Períodos no fuso de Brasília, calculados por índice de mês (0-based).
    const now = new Date();
    const DEDUCAO = 0.08;

    const curMonth = now.getMonth(); // 0-based
    const shift = (delta: number) => {
      const idx = curMonth + delta;
      const yearOff = Math.floor(idx / 12);
      return { year: now.getFullYear() + yearOff, monthIdx: idx - yearOff * 12 };
    };

    const { start: mesAtualStart, end: mesAtualEnd } = this.brMonthRange(now.getFullYear(), curMonth + 1);

    // Trimestre atual (últimos 3 meses)
    const { year: triYear, monthIdx: triMonth } = shift(-2);
    const trimestreStart = this.brMonthRange(triYear, triMonth + 1).start;
    const trimestreEnd = mesAtualEnd;

    // Semestre atual (últimos 6 meses)
    const { year: semYear, monthIdx: semMonth } = shift(-5);
    const semestreStart = this.brMonthRange(semYear, semMonth + 1).start;
    const semestreEnd = mesAtualEnd;

    // Semestre anterior (os 6 meses anteriores ao semestre atual)
    const { year: semAntStartYear, monthIdx: semAntStartMonth } = shift(-11);
    const semAntStart = this.brMonthRange(semAntStartYear, semAntStartMonth + 1).start;
    const { year: semAntEndYear, monthIdx: semAntEndMonth } = shift(-6);
    const semAntEnd = this.brMonthRange(semAntEndYear, semAntEndMonth + 1).end;

    // Ano atual
    const anoStart = new Date(`${now.getFullYear()}-01-01T00:00:00-03:00`);
    const anoEnd = new Date(`${now.getFullYear() + 1}-01-01T00:00:00-03:00`);
    anoEnd.setTime(anoEnd.getTime() - 1);

    const calcPeriodo = async (start: Date, end: Date) => {
      const [txs, orders] = await Promise.all([
        this.prisma.financialTransaction.findMany({ where: { tenantId, date: { gte: start, lte: end } } }),
        this.prisma.serviceOrder.findMany({
          where: this.invoicedOrdersWhere(tenantId, start, end),
          include: { items: { include: { part: true } } },
        }),
      ]);
      const periodLedger = this.splitLedger(txs);
      const receitaBruta = periodLedger.receita;
      const cmv = this.cmvOf(orders);
      const despesas = periodLedger.despesas;
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
        ticketMedio: orders.length > 0 ? periodLedger.receitaOS / orders.length : 0,
      };
    };

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