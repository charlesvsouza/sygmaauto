import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLgpdRequestDto } from './dto/create-lgpd-request.dto';
import { UpdateLgpdRequestStatusDto } from './dto/update-lgpd-request-status.dto';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  async createLgpdRequest(tenantId: string, actorUserId: string, dto: CreateLgpdRequestDto) {
    const request = await this.prisma.lgpdRequest.create({
      data: {
        tenantId,
        requestType: dto.requestType,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        requesterName: dto.requesterName,
        requesterEmail: dto.requesterEmail.toLowerCase().trim(),
        notes: dto.notes,
        status: 'OPEN',
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'LgpdRequest',
        entityId: request.id,
        action: 'CREATE',
        changes: JSON.stringify({
          requestType: request.requestType,
          subjectType: request.subjectType,
          subjectId: request.subjectId,
          status: request.status,
        }),
      },
    });

    return request;
  }

  async listLgpdRequests(tenantId: string) {
    return this.prisma.lgpdRequest.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getLgpdRequestById(tenantId: string, id: string) {
    const request = await this.prisma.lgpdRequest.findFirst({ where: { id, tenantId } });
    if (!request) throw new NotFoundException('Solicitacao LGPD nao encontrada');
    return request;
  }

  async updateLgpdRequestStatus(
    tenantId: string,
    actorUserId: string,
    id: string,
    dto: UpdateLgpdRequestStatusDto,
  ) {
    await this.getLgpdRequestById(tenantId, id);

    const updated = await this.prisma.lgpdRequest.update({
      where: { id },
      data: {
        status: dto.status,
        resolutionNotes: dto.resolutionNotes,
        completedAt: dto.status === 'COMPLETED' ? new Date() : null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'LgpdRequest',
        entityId: updated.id,
        action: 'UPDATE_STATUS',
        changes: JSON.stringify({
          status: updated.status,
          completedAt: updated.completedAt,
        }),
      },
    });

    return updated;
  }

  async exportCustomerData(tenantId: string, actorUserId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        vehicles: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            year: true,
            createdAt: true,
          },
        },
        serviceOrders: {
          select: {
            id: true,
            status: true,
            orderType: true,
            totalCost: true,
            createdAt: true,
            completedAt: true,
            deliveredAt: true,
            paidAt: true,
          },
        },
      },
    });

    if (!customer) throw new NotFoundException('Cliente nao encontrado para exportacao LGPD');

    const payload = {
      exportedAt: new Date().toISOString(),
      tenantId,
      subject: {
        type: 'CUSTOMER',
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        document: customer.document,
        address: customer.address,
        cidade: customer.cidade,
        estado: customer.estado,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },
      relatedData: {
        vehicles: customer.vehicles,
        serviceOrders: customer.serviceOrders,
      },
    };

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'Customer',
        entityId: customerId,
        action: 'LGPD_EXPORT',
        changes: JSON.stringify({
          vehicleCount: customer.vehicles.length,
          serviceOrderCount: customer.serviceOrders.length,
          exportedAt: payload.exportedAt,
        }),
      },
    });

    return payload;
  }
}
