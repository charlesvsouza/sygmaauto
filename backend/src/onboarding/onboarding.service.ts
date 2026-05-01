import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { CompleteTenantSetupDto } from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async getInvite(token: string) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        setupInviteToken: token,
        setupInviteExpiresAt: { gt: new Date() },
        status: 'PENDING_SETUP',
      },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Convite de ativação inválido ou expirado');
    }

    return {
      tenant: {
        id: tenant.id,
        name: tenant.name,
        inviteEmail: tenant.setupInviteEmail,
        document: tenant.document,
        plan: tenant.subscription?.plan,
      },
      expiresAt: tenant.setupInviteExpiresAt,
    };
  }

  async completeSetup(token: string, dto: CompleteTenantSetupDto) {
    const tenant = await this.prisma.tenant.findFirst({
      where: {
        setupInviteToken: token,
        setupInviteExpiresAt: { gt: new Date() },
        status: 'PENDING_SETUP',
      },
      include: {
        subscription: { include: { plan: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Convite de ativação inválido ou expirado');
    }

    if (tenant.setupInviteEmail?.toLowerCase().trim() !== dto.masterEmail.toLowerCase().trim()) {
      throw new ForbiddenException('O email informado não corresponde ao convite enviado');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.masterEmail.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('Este email já está em uso');
    }

    const userId = uuidv4();

    await this.prisma.$transaction([
      this.prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          name: dto.tenantName,
          status: 'ACTIVE',
          document: dto.document || dto.taxId || tenant.document,
          taxId: dto.taxId || dto.document || tenant.taxId,
          companyType: dto.companyType || tenant.companyType,
          legalNature: dto.legalNature || (dto.companyType === 'CPF' ? 'PF' : tenant.legalNature),
          legalName: dto.legalName || dto.tenantName,
          tradeName: dto.tradeName || dto.tenantName,
          stateRegistration: dto.stateRegistration,
          municipalRegistration: dto.municipalRegistration,
          email: dto.masterEmail.toLowerCase().trim(),
          setupCompletedAt: new Date(),
          setupInviteToken: null,
          setupInviteExpiresAt: null,
        },
      }),
      this.prisma.user.create({
        data: {
          id: userId,
          tenantId: tenant.id,
          email: dto.masterEmail.toLowerCase().trim(),
          recoveryEmail: dto.recoveryEmail?.toLowerCase().trim(),
          passwordHash: await bcrypt.hash(dto.password, 10),
          passwordUpdatedAt: new Date(),
          name: dto.masterName,
          role: 'MASTER',
          invitedBy: 'SUPERADMIN_ONBOARDING',
        },
      }),
    ]);

    return {
      accessToken: this.jwtService.sign(
        { sub: userId, email: dto.masterEmail.toLowerCase().trim(), tenantId: tenant.id, role: 'MASTER' },
        { secret: this.configService.get('JWT_SECRET') || 'oficina360-secret-key', expiresIn: '15m' },
      ),
      refreshToken: this.jwtService.sign(
        { sub: userId, email: dto.masterEmail.toLowerCase().trim(), tenantId: tenant.id, role: 'MASTER' },
        { secret: this.configService.get('JWT_REFRESH_SECRET') || 'oficina360-refresh-secret', expiresIn: '7d' },
      ),
      user: {
        id: userId,
        email: dto.masterEmail.toLowerCase().trim(),
        name: dto.masterName,
        role: 'MASTER',
        tenantId: tenant.id,
      },
      tenant: {
        id: tenant.id,
        name: dto.tenantName,
        subscription: tenant.subscription,
      },
    };
  }
}
