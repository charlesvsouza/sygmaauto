import { ForbiddenException, Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateUserDto,
  UpdateUserDto,
  ChangePasswordDto,
  AdminResetPasswordDto,
} from './dto/user.dto';

// Papéis que exigem MASTER como ator: MASTER é o dono do tenant; um ADMIN
// não pode criar, promover, desativar, resetar senha ou excluir contas MASTER.
const MASTER_ONLY_ACTIONS_ON_MASTER = 'Somente o MASTER do tenant pode alterar contas MASTER.';

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

  private assertActorCanManageTarget(actorRole: string | undefined, target: { role: string; id: string }, actorUserId?: string) {
    const actor = String(actorRole ?? '').toUpperCase();
    if (!actor) throw new ForbiddenException('Ação não permitida');
    if (actor !== 'MASTER') {
      if (String(target.role).toUpperCase() === 'MASTER') {
        throw new ForbiddenException(MASTER_ONLY_ACTIONS_ON_MASTER);
      }
      if (actorUserId && target.id === actorUserId) {
        throw new ForbiddenException('Um ADMIN não pode alterar a própria conta por este caminho.');
      }
    }
  }

  async create(tenantId: string, actorRole: string | undefined, dto: CreateUserDto & { createdBy: string }) {
    const existing = await this.prisma.user.findFirst({
      where: { tenantId, email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already exists in this tenant');
    }

    const role = dto.role || UserRole.PRODUTIVO;
    if (String(role).toUpperCase() === 'MASTER' && String(actorRole ?? '').toUpperCase() !== 'MASTER') {
      throw new ForbiddenException(MASTER_ONLY_ACTIONS_ON_MASTER);
    }

    const created = await this.prisma.user.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email.toLowerCase().trim(),
        recoveryEmail: dto.recoveryEmail?.toLowerCase().trim(),
        passwordHash: await bcrypt.hash(dto.password, 10),
        role,
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

  async update(tenantId: string, actorUserId: string, actorRole: string | undefined, userId: string, dto: UpdateUserDto) {
    const before = await this.findById(tenantId, userId);
    this.assertActorCanManageTarget(actorRole, before, actorUserId);

    // ADMIN não pode mudar papéis em nenhuma direção — só o MASTER gerencia papéis.
    if (dto.role !== undefined && dto.role !== before.role && String(actorRole ?? '').toUpperCase() !== 'MASTER') {
      throw new ForbiddenException('Somente o MASTER pode alterar perfis de acesso.');
    }

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

  async changePassword(tenantId: string, actorUserId: string, actorRole: string | undefined, userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Troca de senha por senha atual: cada um troca a própria; trocar a senha de
    // outrem é atribuição do MASTER.
    if (String(actorRole ?? '').toUpperCase() !== 'MASTER' && userId !== actorUserId) {
      throw new ForbiddenException(MASTER_ONLY_ACTIONS_ON_MASTER);
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

  async adminResetPassword(tenantId: string, actorUserId: string, actorRole: string | undefined, userId: string, dto: AdminResetPasswordDto) {
    const target = await this.findById(tenantId, userId);
    this.assertActorCanManageTarget(actorRole, target, actorUserId);

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

  async delete(tenantId: string, actorUserId: string, actorRole: string | undefined, userId: string) {
    const target = await this.findById(tenantId, userId);

    if (userId === actorUserId) {
      throw new ForbiddenException('Não é possível excluir a própria conta.');
    }

    this.assertActorCanManageTarget(actorRole, target, actorUserId);

    // Garante que o tenant nunca fique sem nenhum MASTER ativo.
    if (String(target.role).toUpperCase() === 'MASTER') {
      const otherMasters = await this.prisma.user.count({
        where: { tenantId, role: 'MASTER', isActive: true, id: { not: userId } },
      });
      if (otherMasters === 0) {
        throw new ForbiddenException('O tenant precisa de pelo menos um MASTER ativo.');
      }
    }

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
