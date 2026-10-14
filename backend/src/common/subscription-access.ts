import { UnauthorizedException } from '@nestjs/common';

// Regra única de acesso por assinatura, usada pela JwtStrategy (global) e pelo
// PlanGuard. Tenants sem registro de assinatura (legado) continuam liberados.
export function assertSubscriptionAccess(subscription: {
  status?: string | null;
  currentPeriodEnd?: Date | string | null;
  trialEndsAt?: Date | string | null;
} | null | undefined): void {
  if (!subscription) return;

  const status = String(subscription.status ?? '').toUpperCase();
  const now = new Date();
  const periodEnd = subscription.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd)
    : null;
  const trialEndsAt = subscription.trialEndsAt
    ? new Date(subscription.trialEndsAt)
    : null;

  if (status === 'PAST_DUE' || status === 'CANCELED' || status === 'UNPAID') {
    throw new UnauthorizedException(
      'Assinatura inativa ou vencida. Renove sua assinatura para continuar usando o sistema.',
    );
  }

  if (periodEnd && periodEnd.getTime() < now.getTime()) {
    throw new UnauthorizedException(
      'Assinatura inativa ou vencida. Renove sua assinatura para continuar usando o sistema.',
    );
  }

  if (status === 'TRIALING' && trialEndsAt && trialEndsAt.getTime() < now.getTime()) {
    throw new UnauthorizedException(
      'Período de trial expirado. Assine um plano para continuar usando o sistema.',
    );
  }
}
