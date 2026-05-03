import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartDto, UpdatePartDto, CreateMovementDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  private readonly partsLimitByPlan: Record<string, number> = {
    START: 100,
    PRO: 1000,
    REDE: 1000000,
  };

  private async getTenantPlanName(tenantId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { tenantId },
      include: { plan: { select: { name: true } } },
    });
    return subscription?.plan?.name || 'START';
  }

  private getPartsLimit(planName: string) {
    return this.partsLimitByPlan[planName] ?? 100;
  }

  private normalizeOptionalString(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  }

  async findAllParts(tenantId: string) {
    const parts = await this.prisma.part.findMany({
      where: { tenantId, isActive: true },
      include: {
        supplier: { select: { id: true, name: true } },
      },
      orderBy: { name: 'asc' },
    });
    return parts.map((p) => ({ ...p, currentStock: p.currentStock ?? 0 }));
  }

  async findPartById(tenantId: string, partId: string) {
    const part = await this.prisma.part.findFirst({
      where: { id: partId, tenantId },
      include: {
        supplier: { select: { id: true, name: true } },
        inventoryMovements: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    });
    if (!part) throw new NotFoundException('Part not found');
    return part;
  }

  async createPart(tenantId: string, dto: CreatePartDto) {
    const planName = await this.getTenantPlanName(tenantId);
    const maxParts = this.getPartsLimit(planName);
    const activeParts = await this.prisma.part.count({ where: { tenantId, isActive: true } });
    if (activeParts >= maxParts) {
      throw new BadRequestException(`Limite de ${maxParts} pecas atingido para o plano ${planName}.`);
    }

    const normalizedDto: CreatePartDto = {
      ...dto,
      internalCode: this.normalizeOptionalString(dto.internalCode),
      sku: this.normalizeOptionalString(dto.sku),
      category: this.normalizeOptionalString(dto.category),
      description: this.normalizeOptionalString(dto.description),
      unit: this.normalizeOptionalString(dto.unit),
      location: this.normalizeOptionalString(dto.location),
      supplierId: this.normalizeOptionalString(dto.supplierId),
    };

    if (normalizedDto.sku) {
      const existing = await this.prisma.part.findFirst({ where: { tenantId, sku: normalizedDto.sku } });
      if (existing) throw new BadRequestException('SKU já cadastrado');
    }
    return this.prisma.part.create({ data: { tenantId, ...normalizedDto } });
  }

  async updatePart(tenantId: string, partId: string, dto: UpdatePartDto) {
    await this.findPartById(tenantId, partId);

    const normalizedDto: UpdatePartDto = {
      ...dto,
      internalCode: this.normalizeOptionalString(dto.internalCode),
      sku: this.normalizeOptionalString(dto.sku),
      category: this.normalizeOptionalString(dto.category),
      description: this.normalizeOptionalString(dto.description),
      unit: this.normalizeOptionalString(dto.unit),
      location: this.normalizeOptionalString(dto.location),
      supplierId: this.normalizeOptionalString(dto.supplierId),
    };

    if (normalizedDto.sku) {
      const existing = await this.prisma.part.findFirst({ where: { tenantId, sku: normalizedDto.sku, NOT: { id: partId } } });
      if (existing) throw new BadRequestException('SKU já cadastrado');
    }

    return this.prisma.part.update({ where: { id: partId }, data: normalizedDto });
  }

  async deletePart(tenantId: string, partId: string) {
    await this.findPartById(tenantId, partId);
    return this.prisma.part.update({ where: { id: partId }, data: { isActive: false } });
  }

  async createMovement(tenantId: string, dto: CreateMovementDto) {
    const part = await this.findPartById(tenantId, dto.partId);

    const delta = dto.type === 'ENTRY' ? dto.quantity : -dto.quantity;
    const newStock = (part.currentStock ?? 0) + delta;

    if (dto.type === 'EXIT' && newStock < 0) {
      throw new BadRequestException('Estoque insuficiente');
    }

    const [movement] = await this.prisma.$transaction([
      this.prisma.inventoryMovement.create({
        data: { tenantId, partId: dto.partId, type: dto.type, quantity: dto.quantity, note: dto.note },
      }),
      this.prisma.part.update({
        where: { id: dto.partId },
        data: { currentStock: newStock },
      }),
    ]);

    return movement;
  }

  async getStockReport(tenantId: string) {
    const parts = await this.prisma.part.findMany({
      where: { tenantId, isActive: true },
      include: { supplier: { select: { id: true, name: true } } },
    });
    return parts.map((p) => ({
      ...p,
      currentStock: p.currentStock ?? 0,
      needsRestock: (p.currentStock ?? 0) <= p.minStock,
    }));
  }

  async getPurchaseProjection(tenantId: string) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const parts = await this.prisma.part.findMany({
      where: { tenantId, isActive: true },
      include: {
        supplier: { select: { id: true, name: true, phone: true, email: true } },
        inventoryMovements: {
          where: { type: 'EXIT', createdAt: { gte: ninetyDaysAgo } },
          select: { quantity: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const projected = parts
      .map((p) => {
        const currentStock = p.currentStock ?? 0;
        const totalExits90d = p.inventoryMovements.reduce((s, m) => s + m.quantity, 0);
        const avgMonthlyExit = totalExits90d / 3;
        const monthsCoverage =
          avgMonthlyExit > 0 ? Math.round((currentStock / avgMonthlyExit) * 10) / 10 : null;
        const suggestedQty = Math.max(
          Math.ceil(p.minStock * 2 - currentStock),
          Math.ceil(avgMonthlyExit * 2),
          1,
        );
        const urgency: 'CRITICO' | 'URGENTE' | 'ATENCAO' | 'OK' =
          currentStock === 0
            ? 'CRITICO'
            : currentStock <= p.minStock
            ? 'URGENTE'
            : monthsCoverage !== null && monthsCoverage < 1.5
            ? 'ATENCAO'
            : 'OK';

        return {
          id: p.id,
          name: p.name,
          internalCode: p.internalCode,
          sku: p.sku,
          category: p.category,
          unit: p.unit,
          currentStock,
          minStock: p.minStock,
          avgMonthlyExit: Math.round(avgMonthlyExit * 10) / 10,
          monthsCoverage,
          suggestedQty,
          unitPrice: p.unitPrice,
          costPrice: p.costPrice,
          estimatedCost: Math.round(suggestedQty * (p.costPrice ?? p.unitPrice) * 100) / 100,
          supplier: p.supplier,
          urgency,
        };
      })
      .filter((p) => p.urgency !== 'OK')
      .sort((a, b) => {
        const order: Record<string, number> = { CRITICO: 0, URGENTE: 1, ATENCAO: 2 };
        if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
        return (a.monthsCoverage ?? 99) - (b.monthsCoverage ?? 99);
      });

    return {
      items: projected,
      summary: {
        total: projected.length,
        criticalCount: projected.filter((p) => p.urgency === 'CRITICO').length,
        urgentCount: projected.filter((p) => p.urgency === 'URGENTE').length,
        attentionCount: projected.filter((p) => p.urgency === 'ATENCAO').length,
        totalEstimatedCost: Math.round(projected.reduce((s, p) => s + p.estimatedCost, 0) * 100) / 100,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
