import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertChecklistDto } from './dto/checklist.dto';

@Injectable()
export class ChecklistService {
  constructor(private prisma: PrismaService) {}

  async getForServiceOrder(tenantId: string, serviceOrderId: string) {
    // Valida que a OS pertence ao tenant
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId },
    });
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');

    return this.prisma.vehicleChecklist.findMany({
      where: { tenantId, serviceOrderId },
      include: {
        items: {
          include: { photos: true },
        },
      },
      orderBy: { type: 'asc' },
    });
  }

  async upsert(
    tenantId: string,
    serviceOrderId: string,
    type: string,
    dto: UpsertChecklistDto,
  ) {
    const so = await this.prisma.serviceOrder.findFirst({
      where: { id: serviceOrderId, tenantId },
    });
    if (!so) throw new NotFoundException('Ordem de serviço não encontrada');

    const normalizedType = type.toUpperCase();

    const existing = await this.prisma.vehicleChecklist.findUnique({
      where: { serviceOrderId_type: { serviceOrderId, type: normalizedType } },
    });

    const itemsData = (dto.items ?? []).map((item) => ({
      area: item.area,
      condition: item.condition,
      notes: item.notes,
      photos: item.photos?.length
        ? {
            create: item.photos.map((p) => ({
              data: p.data,
              mimeType: p.mimeType ?? 'image/jpeg',
            })),
          }
        : undefined,
    }));

    if (existing) {
      // Remove itens antigos (cascade apaga fotos)
      await this.prisma.checklistItem.deleteMany({
        where: { checklistId: existing.id },
      });

      return this.prisma.vehicleChecklist.update({
        where: { id: existing.id },
        data: {
          fuelLevel: dto.fuelLevel ?? existing.fuelLevel,
          observations: dto.observations,
          completedBy: dto.completedBy,
          completedAt: new Date(),
          items: { create: itemsData },
        },
        include: { items: { include: { photos: true } } },
      });
    }

    return this.prisma.vehicleChecklist.create({
      data: {
        tenantId,
        serviceOrderId,
        type: normalizedType,
        fuelLevel: dto.fuelLevel ?? 0,
        observations: dto.observations,
        completedBy: dto.completedBy,
        completedAt: new Date(),
        items: { create: itemsData },
      },
      include: { items: { include: { photos: true } } },
    });
  }

  async delete(tenantId: string, serviceOrderId: string, type: string) {
    const normalizedType = type.toUpperCase();
    const checklist = await this.prisma.vehicleChecklist.findFirst({
      where: { tenantId, serviceOrderId, type: normalizedType },
    });
    if (!checklist) throw new NotFoundException('Checklist não encontrado');

    return this.prisma.vehicleChecklist.delete({ where: { id: checklist.id } });
  }
}
