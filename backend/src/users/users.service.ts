import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  AdminResetPasswordDto,
} from './dto/user.dto';


@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        recoveryEmail: true,
        role: true,
        isActive: true,
        workshopArea: true,
        jobFunction: true,
        lastLoginAt: true,
        passwordUpdatedAt: true,
        createdAt: true,
      },
    });
  }

  async findById(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        recoveryEmail: true,
        role: true,
        isActive: true,
        workshopArea: true,
        jobFunction: true,
        lastLoginAt: true,
        passwordUpdatedAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(tenantId: string, dto: CreateUserDto & { createdBy: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists in this tenant');
    }

    const created = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email.toLowerCase().trim(),
        recoveryEmail: dto.recoveryEmail?.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        role: dto.role || UserRole.PRODUTIVO,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        passwordUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        recoveryEmail: true,
        role: true,
        isActive: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: dto.createdBy || null,
        entityType: 'User',
        entityId: created.id,
        action: 'CREATE',
        changes: JSON.stringify({
          email: created.email,
          role: created.role,
          isActive: created.isActive,
        }),
      },
    });

    return created;
  }

  async update(tenantId: string, actorUserId: string, userId: string, dto: UpdateUserDto) {
    const before = await this.findById(tenantId, userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        recoveryEmail: dto.recoveryEmail?.toLowerCase().trim(),
        role: dto.role,
        isActive: dto.isActive,
        workshopArea: dto.workshopArea,
        jobFunction: dto.jobFunction,
      },
      select: {
        id: true,
        name: true,
        email: true,
        recoveryEmail: true,
        role: true,
        isActive: true,
        workshopArea: true,
        jobFunction: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'User',
        entityId: userId,
        action: 'UPDATE',
        changes: JSON.stringify({
          before,
          after: updated,
        }),
      },
    });

    return updated;
  }

  async changePassword(tenantId: string, actorUserId: string, userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new ConflictException('Current password is incorrect');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
        passwordUpdatedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'User',
        entityId: userId,
        action: 'CHANGE_PASSWORD',
        changes: JSON.stringify({
          passwordUpdatedAt: updated.passwordUpdatedAt,
        }),
      },
    });

    return updated;
  }

  async adminResetPassword(tenantId: string, actorUserId: string, userId: string, dto: AdminResetPasswordDto) {
    await this.findById(tenantId, userId);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
        passwordUpdatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        passwordUpdatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'User',
        entityId: userId,
        action: 'ADMIN_RESET_PASSWORD',
        changes: JSON.stringify({
          passwordUpdatedAt: updated.passwordUpdatedAt,
        }),
      },
    });

    return updated;
  }

  async delete(tenantId: string, actorUserId: string, userId: string) {
    const target = await this.findById(tenantId, userId);

    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId: actorUserId,
        entityType: 'User',
        entityId: userId,
        action: 'DELETE',
        changes: JSON.stringify(target),
      },
    });

    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}