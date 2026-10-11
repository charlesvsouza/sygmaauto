import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsService } from '../../permissions/permissions.service';

export const ROLES_KEY = 'roles';
export const CAPABILITY_KEY = 'capability';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector, private permissions: PermissionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    const capability = this.reflector.getAllAndOverride<string>(CAPABILITY_KEY, targets);
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, targets);

    if (!capability && !requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userRole = String(user?.role || '').toUpperCase();
    if (!userRole) return false;

    if (userRole === 'MASTER') return true;

    // Capacidade ajustável pela oficina (padrão = regra histórica de common/roles.ts).
    if (capability) {
      return this.permissions.can(request.tenant?.tenantId ?? user?.tenantId, userRole, capability);
    }
    return requiredRoles!.map((role) => role.toUpperCase()).includes(userRole);
  }
}
