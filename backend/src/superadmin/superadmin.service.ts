import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import { SuperAdminLoginDto, CreateSuperAdminDto, ProvisionTenantDto } from './dto/superadmin.dto';

@Injectable()
export class SuperAdminService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async login(dto: SuperAdminLoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email: normalizedEmail },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const valid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const token = this.jwtService.sign(
      { sub: admin.id, email: admin.email, isSuperAdmin: true },
      {
        secret: this.configService.get('JWT_SECRET') || 'oficina360-secret-key',
        expiresIn: '8h',
      },
    );

    return {
      accessToken: token,
      superAdmin: { id: admin.id, name: admin.name, email: admin.email },
    };
  }

  async createSuperAdmin(dto: CreateSuperAdminDto) {
    const bootstrapSecret = this.configService.get('SUPER_ADMIN_BOOTSTRAP_SECRET');
    if (!bootstrapSecret || dto.bootstrapSecret !== bootstrapSecret) {
      throw new ForbiddenException('Segredo de bootstrap inválido');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();

    const existing = await this.prisma.superAdmin.findUnique({
      where: { email: normalizedEmail },
    });
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const admin = await this.prisma.superAdmin.create({
      data: { email: normalizedEmail, name: dto.name, passwordHash },
    });

    return { id: admin.id, name: admin.name, email: admin.email };
  }

  async listTenants() {
    return this.prisma.tenant.findMany({
      include: {
        subscription: { include: { plan: true } },
        _count: {
          select: {
            users: true,
            customers: true,
            vehicles: true,
            serviceOrders: true,
            parts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPlans() {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  async provisionTenant(dto: ProvisionTenantDto) {
    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.inviteEmail.toLowerCase().trim() },
    });

    if (existingUser) {
      throw new ConflictException('Este email já está vinculado a um usuário');
    }

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: dto.planName || 'START' },
    });

    if (!plan) {
      throw new NotFoundException('Plano não encontrado');
    }

    const tenantId = uuidv4();
    const subscriptionId = uuidv4();
    const setupInviteToken = uuidv4();
    const setupInviteExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const tenant = await this.prisma.$transaction(async (tx) => {
      const createdTenant = await tx.tenant.create({
        data: {
          id: tenantId,
          name: dto.tenantName,
          status: 'PENDING_SETUP',
          document: dto.document || `PENDING-${tenantId.slice(0, 8)}`,
          setupInviteEmail: dto.inviteEmail.toLowerCase().trim(),
          setupInviteToken,
          setupInviteExpiresAt,
        },
      });

      await tx.subscription.create({
        data: {
          id: subscriptionId,
          tenantId,
          planId: plan.id,
          status: 'ACTIVE',
          currentPeriodEnd,
        },
      });

      return createdTenant;
    });

    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'https://sigmaauto.com.br').replace(/\/+$/, '');
    const activationLink = `${frontendUrl}/activate/${setupInviteToken}`;
    const emailSent = await this.emailService.sendTenantSetupEmail(dto.inviteEmail.toLowerCase().trim(), {
      companyName: dto.tenantName,
      activationLink,
      expiresAt: setupInviteExpiresAt,
    });

    return {
      tenant,
      activationLink,
      inviteEmail: dto.inviteEmail.toLowerCase().trim(),
      emailSent,
      expiresAt: setupInviteExpiresAt,
    };
  }

  async getTenantDetails(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        subscription: { include: { plan: true } },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            customers: true,
            vehicles: true,
            serviceOrders: true,
            parts: true,
            financialTransactions: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return tenant;
  }

  async deleteTenant(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Deletar na ordem correta para respeitar FK constraints
    await this.prisma.$transaction([
      this.prisma.serviceOrderTimeline.deleteMany({ where: { serviceOrder: { tenantId } } }),
      this.prisma.serviceOrderItem.deleteMany({ where: { serviceOrder: { tenantId } } }),
      this.prisma.serviceOrder.deleteMany({ where: { tenantId } }),
      this.prisma.inventoryMovement.deleteMany({ where: { tenantId } }),
      this.prisma.part.deleteMany({ where: { tenantId } }),
      this.prisma.supplier.deleteMany({ where: { tenantId } }),
      this.prisma.financialTransaction.deleteMany({ where: { tenantId } }),
      this.prisma.vehicle.deleteMany({ where: { tenantId } }),
      this.prisma.customer.deleteMany({ where: { tenantId } }),
      this.prisma.service.deleteMany({ where: { tenantId } }),
      this.prisma.user.deleteMany({ where: { tenantId } }),
      this.prisma.subscription.deleteMany({ where: { tenantId } }),
      this.prisma.tenant.delete({ where: { id: tenantId } }),
    ]);

    return { deleted: true, tenantId, tenantName: tenant.name };
  }

  /**
   * Gera um token JWT de curta duração (2h) que permite ao Super Admin
   * navegar no painel de um tenant como se fosse o usuário MASTER daquele tenant.
   * O token carrega `isImpersonation: true` para fins de auditoria.
   */
  async impersonateTenant(tenantId: string, superAdminPayload: any) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: { role: 'MASTER', isActive: true },
          take: 1,
        },
        subscription: { include: { plan: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    const masterUser = tenant.users[0];
    if (!masterUser) {
      throw new NotFoundException('Tenant não possui usuário MASTER ativo. Complete o setup primeiro.');
    }

    const token = this.jwtService.sign(
      {
        sub: masterUser.id,
        email: masterUser.email,
        role: masterUser.role,
        tenantId: tenant.id,
        isImpersonation: true,
        superAdminId: superAdminPayload.sub,
      },
      {
        secret: this.configService.get('JWT_SECRET') || 'oficina360-secret-key',
        expiresIn: '2h',
      },
    );

    return {
      accessToken: token,
      user: {
        userId: masterUser.id,
        email: masterUser.email,
        name: masterUser.name,
        role: masterUser.role,
        tenantId: tenant.id,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subscription: tenant.subscription,
      },
      isImpersonation: true,
    };
  }

  /** Suspende ou reativa um tenant */
  async updateTenantStatus(tenantId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Tenant não encontrado');
    return this.prisma.tenant.update({ where: { id: tenantId }, data: { status } });
  }

  /** Altera o plano de assinatura */
  async updateTenantPlan(tenantId: string, planName: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { name: planName } });
    if (!plan) throw new NotFoundException('Plano não encontrado');
    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) throw new NotFoundException('Subscription não encontrada para este tenant');
    return this.prisma.subscription.update({
      where: { tenantId },
      data: { planId: plan.id },
      include: { plan: true },
    });
  }

  /** Estende o período de assinatura em N dias */
  async extendSubscription(tenantId: string, days: number) {
    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId } });
    if (!subscription) throw new NotFoundException('Subscription não encontrada');
    const base = subscription.currentPeriodEnd > new Date() ? subscription.currentPeriodEnd : new Date();
    const newEnd = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
    return this.prisma.subscription.update({
      where: { tenantId },
      data: { currentPeriodEnd: newEnd, status: 'ACTIVE' },
      include: { plan: true },
    });
  }

  async getSystemStats() {
    const [totalTenants, totalUsers, totalServiceOrders, totalRevenue] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.serviceOrder.count(),
      this.prisma.financialTransaction.aggregate({ _sum: { amount: true }, where: { type: 'INCOME' } }),
    ]);

    return {
      totalTenants,
      totalUsers,
      totalServiceOrders,
      totalRevenue: totalRevenue._sum.amount ?? 0,
    };
  }
}
