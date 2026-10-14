import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../interfaces/auth.interface';
import { assertSubscriptionAccess } from '../../common/subscription-access';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'oficina360-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenant: { include: { subscription: { include: { plan: true } } } } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Bloqueia acesso global quando a assinatura do tenant está vencida,
    // suspensa (PAST_DUE) ou em trial expirado. Sessões de impersonação do
    // superadmin passam, para permitir corrigir cobrança do próprio tenant.
    if (!payload.isImpersonation) {
      assertSubscriptionAccess(user.tenant.subscription);
    }

    return {
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
      subscription: user.tenant.subscription,
      plan: user.tenant.subscription?.plan,
      isImpersonation: !!payload.isImpersonation,
    };
  }
}