import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantDto, UpdateDiscountSettingsDto, UpdateDocumentSettingsDto } from './dto/tenant.dto';
import { resolveDocumentSettings } from '../common/document-settings';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  async findById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  async update(tenantId: string, dto: UpdateTenantDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }

  async updateDiscountSettings(tenantId: string, dto: UpdateDiscountSettingsDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }

  async getDocumentSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        warrantyDaysServices: true, warrantyDaysParts: true, budgetValidityDays: true,
        authorizationText: true, warrantyText: true, belongingsText: true,
      },
    });
    return { effective: resolveDocumentSettings(tenant), stored: tenant };
  }

  // Texto vazio volta ao padrão (grava null).
  async updateDocumentSettings(tenantId: string, dto: UpdateDocumentSettingsDto) {
    const data: Record<string, unknown> = { ...dto };
    for (const key of ['authorizationText', 'warrantyText', 'belongingsText'] as const) {
      if (key in data) data[key] = (dto[key] ?? '').trim() || null;
    }
    await this.prisma.tenant.update({ where: { id: tenantId }, data });
    return this.getDocumentSettings(tenantId);
  }
}
