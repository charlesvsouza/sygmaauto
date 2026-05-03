import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_RATES: Record<string, number> = {
  MECANICO:   10,
  PRODUTIVO:  10,
  ELETRICISTA: 10,
  FUNILEIRO:   8,
  PINTOR:      8,
  PREPARADOR:  8,
  LAVADOR:     6,
  EMBELEZADOR_AUTOMOTIVO: 6,
  MARTELINHO_OURO: 10,
  CHEFE_OFICINA:   5,
  COLABORADOR_SERVICOS_GERAIS: 5,
};

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  async getRate(tenantId: string, userId: string, jobFunction?: string | null): Promise<number> {
    const userRate = await this.prisma.commissionRate.findFirst({
      where: { tenantId, userId },
    });
    if (userRate) return userRate.rate;

    if (jobFunction) {
      const roleRate = await this.prisma.commissionRate.findFirst({
        where: { tenantId, role: jobFunction },
      });
      if (roleRate) return roleRate.rate;
      return DEFAULT_RATES[jobFunction] ?? 10;
    }
    return 10;
  }

  async generateForOrder(tenantId: string, serviceOrderId: string) {
    const items = await this.prisma.serviceOrderItem.findMany({
      where: { serviceOrderId, assignedUserId: { not: null } },
      include: { assignedUser: true, commission: true },
    });

    for (const item of items) {
      if (!item.assignedUserId || item.commission) continue;

      const rate = await this.getRate(
        tenantId,
        item.assignedUserId,
        (item.assignedUser as any)?.jobFunction ?? null,
      );

      const base = Number(item.totalPrice);
      await this.prisma.commission.create({
        data: {
          tenantId,
          serviceOrderId,
          serviceOrderItemId: item.id,
          userId: item.assignedUserId,
          baseValue: base,
          commissionPercent: rate,
          commissionValue: parseFloat(((base * rate) / 100).toFixed(2)),
          status: 'PENDENTE',
        },
      });
    }
  }

  async findAll(tenantId: string, filters: {
    status?: string;
    userId?: string;
    workshopArea?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.userId) where.userId = filters.userId;
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    let data = await this.prisma.commission.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, workshopArea: true, jobFunction: true } },
        serviceOrderItem: { select: { description: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (filters.workshopArea) {
      data = data.filter((c: any) => c.user?.workshopArea === filters.workshopArea);
    }

    const total = data.reduce((s, c) => s + Number(c.commissionValue), 0);
    const pending = data.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.commissionValue), 0);
    const paid = data.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.commissionValue), 0);

    const leaderMap: Record<string, { userId: string; name: string; workshopArea: string | null; total: number; count: number }> = {};
    for (const c of data) {
      const uid = c.userId;
      if (!leaderMap[uid]) {
        leaderMap[uid] = {
          userId: uid,
          name: (c.user as any)?.name ?? uid,
          workshopArea: (c.user as any)?.workshopArea ?? null,
          total: 0,
          count: 0,
        };
      }
      leaderMap[uid].total += Number(c.commissionValue);
      leaderMap[uid].count += 1;
    }
    const leaderboard = Object.values(leaderMap).sort((a, b) => b.total - a.total);

    return {
      data,
      totals: { total, pending, paid },
      leadership: { leaderboard },
    };
  }

  async markAsPaid(tenantId: string, id: string) {
    const commission = await this.prisma.commission.findFirst({ where: { id, tenantId } });
    if (!commission) throw new NotFoundException('Comissão não encontrada');

    return this.prisma.commission.update({
      where: { id },
      data: { status: 'PAGO', paidAt: new Date() },
    });
  }

  async upsertRate(tenantId: string, userId: string | null, role: string | null, rate: number) {
    if (userId) {
      return this.prisma.commissionRate.upsert({
        where: { userId },
        create: { tenantId, userId, rate },
        update: { rate },
      });
    }
    const existing = await this.prisma.commissionRate.findFirst({ where: { tenantId, role } });
    if (existing) {
      return this.prisma.commissionRate.update({ where: { id: existing.id }, data: { rate } });
    }
    return this.prisma.commissionRate.create({ data: { tenantId, role, rate } });
  }

  async getRates(tenantId: string) {
    return this.prisma.commissionRate.findMany({ where: { tenantId } });
  }
}
