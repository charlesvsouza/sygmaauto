import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLgpdRequestDto } from './dto/create-lgpd-request.dto';
import { UpdateLgpdRequestStatusDto } from './dto/update-lgpd-request-status.dto';

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  private buildProtocol(): string {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `LGPD-${y}${m}${d}-${rnd}`;
  }

  private buildDueAt(): Date {
    const due = new Date();
    due.setDate(due.getDate() + 15);
    return due;
  }

  async createLgpdRequest(tenantId: string, actorUserId: string, dto: CreateLgpdRequestDto) {
    const protocol = this.buildProtocol();
    const dueAt = this.buildDueAt();

    const request = await this.prisma.lgpdRequest.create({
      data: {
        tenantId,
        protocol,
        requestType: dto.requestType,
        subjectType: dto.subjectType,
        subjectId: dto.subjectId,
        requesterName: dto.requesterName,
        requesterEmail: dto.requesterEmail.toLowerCase().trim(),
        notes: dto.notes,
        status: 'OPEN',
        dueAt,
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
          protocol: request.protocol,
          status: request.status,
          dueAt: request.dueAt,
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
          dueAt: updated.dueAt,
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

  async exportUserData(tenantId: string, actorUserId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        recoveryEmail: true,
        role: true,
        workshopArea: true,
        jobFunction: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        passwordUpdatedAt: true,
      },
    });

    if (!user) throw new NotFoundException('Usuario nao encontrado para exportacao LGPD');

    const payload = {
      exportedAt: new Date().toISOString(),
      tenantId,
      subject: {
        type: 'USER',
        ...user,
      },
    };

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'User',
        entityId: userId,
        action: 'LGPD_EXPORT',
        changes: JSON.stringify({
          role: user.role,
          isActive: user.isActive,
          exportedAt: payload.exportedAt,
        }),
      },
    });

    return payload;
  }

  async eraseCustomerData(tenantId: string, actorUserId: string, customerId: string, reason: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      include: {
        _count: {
          select: {
            vehicles: true,
            serviceOrders: true,
            npsResponses: true,
          },
        },
      },
    });

    if (!customer) throw new NotFoundException('Cliente nao encontrado para eliminacao LGPD');

    const hasDependencies =
      customer._count.vehicles > 0 ||
      customer._count.serviceOrders > 0 ||
      customer._count.npsResponses > 0;

    let mode = 'HARD_DELETE';

    if (hasDependencies) {
      mode = 'ANONYMIZE';
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: `Titular removido ${customer.id.slice(0, 8)}`,
          document: null,
          rg: null,
          nacionalidade: null,
          estado_civil: null,
          profissao: null,
          email: null,
          phone: null,
          cep: null,
          address: null,
          cidade: null,
          estado: null,
          notes: `Anonimizado por LGPD em ${new Date().toISOString()}`,
          lgpdErasedAt: new Date(),
        },
      });
    } else {
      await this.prisma.customer.delete({ where: { id: customer.id } });
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'Customer',
        entityId: customerId,
        action: 'LGPD_ERASE',
        changes: JSON.stringify({
          mode,
          reason,
          dependencyCounts: customer._count,
        }),
      },
    });

    return { success: true, mode, customerId };
  }

  async eraseUserData(tenantId: string, actorUserId: string, userId: string, reason: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      include: {
        _count: {
          select: {
            serviceOrders: true,
            timeline: true,
            assignedItems: true,
            commissions: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuario nao encontrado para eliminacao LGPD');

    const replacementHash = await bcrypt.hash(`lgpd-erased:${user.id}:${Date.now()}`, 10);
    const anonymizedEmail = `lgpd-erased+${user.id}@invalid.local`;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: anonymizedEmail,
        recoveryEmail: null,
        passwordHash: replacementHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        passwordUpdatedAt: new Date(),
        name: `Usuario removido ${user.id.slice(0, 8)}`,
        isActive: false,
        lgpdErasedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'User',
        entityId: userId,
        action: 'LGPD_ERASE',
        changes: JSON.stringify({
          mode: 'ANONYMIZE',
          reason,
          dependencyCounts: user._count,
        }),
      },
    });

    return { success: true, mode: 'ANONYMIZE', userId };
  }
}
