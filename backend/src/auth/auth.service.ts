import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../notifications/email.service';
import {
  RegisterDto,
  LoginDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/auth.dto';
import { AuthTokens, JwtPayload } from './interfaces/auth.interface';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokens & { user: any }> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const existingUser = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
    });

    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    const tenantId = uuidv4();
    const userId = uuidv4();

    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { name: 'START' },
    });

    if (!plan) {
      throw new Error('START plan not found. Run seed script.');
    }

    const subscriptionId = uuidv4();
    const trialDays = 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    await this.prisma.$transaction([
      this.prisma.tenant.create({
        data: {
          id: tenantId,
          name: dto.tenantName || dto.name + "'s Workshop",
          document: dto.document || dto.taxId || '',
          taxId: dto.taxId || dto.document || '',
          companyType: dto.companyType || 'CNPJ',
          legalNature: dto.legalNature || (dto.companyType === 'CPF' ? 'PF' : 'PJ'),
          legalName: dto.legalName || dto.tenantName || dto.name,
          tradeName: dto.tradeName || dto.tenantName || dto.name,
          stateRegistration: dto.stateRegistration,
          municipalRegistration: dto.municipalRegistration,
        },
      }),
      this.prisma.subscription.create({
        data: {
          id: subscriptionId,
          tenantId,
          planId: plan.id,
          status: 'TRIALING',
          trialEndsAt,
          currentPeriodEnd: trialEndsAt,
        },
      }),
      this.prisma.user.create({
        data: {
          id: userId,
          tenantId,
          email: normalizedEmail,
          recoveryEmail: dto.recoveryEmail?.toLowerCase().trim(),
          passwordHash: await bcrypt.hash(dto.password, 10),
          name: dto.name,
          role: 'MASTER',
        },
      }),
    ]);

    return {
      ...this.generateTokens({ sub: userId, email: normalizedEmail, tenantId, role: 'MASTER' }),
      user: { id: userId, email: normalizedEmail, name: dto.name, role: 'MASTER', tenantId },
    };
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: 'insensitive' } },
      include: { tenant: { include: { subscription: { include: { plan: true } } } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      ...this.generateTokens({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      }),
      user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
      tenant: { id: user.tenant.id, name: user.tenant.name, subscription: user.tenant.subscription },
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || 'oficina360-refresh-secret',
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens({
        sub: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async requestPasswordReset(dto: RequestPasswordResetDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: dto.email.toLowerCase().trim() },
    });

    if (!user || !user.isActive) {
      return {
        message:
          'Se os dados forem válidos, você receberá instruções para redefinir a senha.',
      };
    }

    if (!user.recoveryEmail) {
      throw new UnauthorizedException('Usuário sem e-mail de recuperação cadastrado');
    }

    const informedRecovery = dto.recoveryEmail.toLowerCase().trim();
    const savedRecovery = user.recoveryEmail.toLowerCase().trim();
    if (informedRecovery !== savedRecovery) {
      throw new UnauthorizedException('Falha na revalidação de segurança');
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: token,
        passwordResetExpiresAt: expiresAt,
      },
    });

    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || 'https://sigmaauto.com.br').replace(/\/+$/, '');
    const resetLink = `${frontendUrl}/forgot-password?token=${token}`;
    const emailSent = await this.emailService.sendPasswordResetEmail(savedRecovery, {
      resetLink,
      resetToken: token,
      expiresAt,
    });

    const response: Record<string, string> = {
      message: emailSent
        ? 'Revalidação concluída. Enviamos as instruções para o e-mail de recuperação cadastrado.'
        : 'Revalidação concluída. O ambiente ainda não está configurado para envio de e-mail; use o token para redefinir a senha.',
    };

    if ((this.configService.get('NODE_ENV') || '').trim() !== 'production' || !emailSent) {
      response.token = token;
      response.resetLink = resetLink;
    }

    return response;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: dto.token,
        passwordResetExpiresAt: { gt: new Date() },
        isActive: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Token de recuperação inválido ou expirado');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(dto.newPassword, 10),
        passwordUpdatedAt: new Date(),
        passwordResetToken: null,
        passwordResetExpiresAt: null,
      },
    });

    return { message: 'Senha redefinida com sucesso' };
  }

  private generateTokens(payload: JwtPayload): AuthTokens {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET') || 'oficina360-secret-key',
      expiresIn: '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET') || 'oficina360-refresh-secret',
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }
}