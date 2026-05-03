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

    return this.prisma.user.create({
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
  }

  async update(tenantId: string, userId: string, dto: UpdateUserDto) {
    await this.findById(tenantId, userId);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name,
        recoveryEmail: dto.recoveryEmail?.toLowerCase().trim(),
        role: dto.role,
        isActive: dto.isActive,
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
  }

  async changePassword(tenantId: string, userId: string, dto: ChangePasswordDto) {
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

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
        passwordUpdatedAt: new Date(),
      },
    });
  }

  async adminResetPassword(tenantId: string, userId: string, dto: AdminResetPasswordDto) {
    await this.findById(tenantId, userId);

    return this.prisma.user.update({
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
  }

  async delete(tenantId: string, userId: string) {
    await this.findById(tenantId, userId);

    return this.prisma.user.delete({
      where: { id: userId },
    });
  }
}