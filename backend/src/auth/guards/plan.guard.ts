import { SetMetadata, Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const PLAN_KEY = 'requiredPlan';

@Injectable()
export class PlanGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPlan = this.reflector.getAllAndOverride<string>(PLAN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPlan) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    const userPlan = user?.plan?.name;

    if (!userPlan) {
      throw new ForbiddenException('No subscription plan found');
    }

    const planHierarchy: Record<string, number> = {
      START: 1,
      PRO: 2,
      REDE: 3,
      RETIFICA_PRO: 2,
      RETIFICA_REDE: 3,
    };

    const requiredLevel = planHierarchy[requiredPlan] || 0;
    const userLevel = planHierarchy[userPlan] || 0;

    if (userLevel < requiredLevel) {
      throw new ForbiddenException(`Este recurso requer o plano ${requiredPlan}. Faça upgrade para continuar.`);
    }

    return true;
  }
}

export const RequirePlan = (plan: 'START' | 'PRO' | 'REDE') => SetMetadata(PLAN_KEY, plan);