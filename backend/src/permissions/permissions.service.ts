import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CAPABILITIES, CONFIGURABLE_ROLES, PermissionOverrides, effectiveRoles, roleCan, roleCanMoveToStatus, sanitizeOverrides,
} from '../common/permissions';

const TTL_MS = 30_000;
const configurable = (r: string) => (CONFIGURABLE_ROLES as readonly string[]).includes(r);

@Injectable()
export class PermissionsService {
  private cache = new Map<string, { at: number; overrides: PermissionOverrides }>();

  constructor(private prisma: PrismaService) {}

  private async overrides(tenantId?: string | null): Promise<PermissionOverrides> {
    if (!tenantId) return null;
    const hit = this.cache.get(tenantId);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.overrides;
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { permissionOverrides: true } });
    const overrides = (t?.permissionOverrides as PermissionOverrides) ?? null;
    this.cache.set(tenantId, { at: Date.now(), overrides });
    return overrides;
  }

  async can(tenantId: string | undefined, role: string | undefined, key: string): Promise<boolean> {
    return roleCan(role, key, await this.overrides(tenantId));
  }

  async canMoveToStatus(tenantId: string | undefined, role: string | undefined, status: string): Promise<boolean> {
    return roleCanMoveToStatus(role, status, await this.overrides(tenantId));
  }

  /** Mapa capacidade -> pode, para o perfil do usuário logado. */
  async mine(tenantId: string, role: string) {
    const overrides = await this.overrides(tenantId);
    return Object.fromEntries(CAPABILITIES.map((c) => [c.key, roleCan(role, c.key, overrides)]));
  }

  /** Matriz completa para a tela de configuração. */
  async matrix(tenantId: string) {
    const overrides = await this.overrides(tenantId);
    return {
      roles: CONFIGURABLE_ROLES,
      capabilities: CAPABILITIES.map((c) => ({
        key: c.key,
        group: c.group,
        label: c.label,
        hint: c.hint,
        roles: effectiveRoles(c.key, overrides).filter(configurable),
        defaults: [...new Set(c.defaults.map((r) => (r === 'PRODUTIVO' ? 'MECANICO' : r)))].filter(configurable),
      })),
    };
  }

  async save(tenantId: string, input: Record<string, unknown>) {
    const clean = sanitizeOverrides(input);
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { permissionOverrides: Object.keys(clean).length ? clean : (null as any) },
    });
    this.cache.delete(tenantId);
    return this.matrix(tenantId);
  }
}
