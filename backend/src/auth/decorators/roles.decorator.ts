import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
// Capacidade configurável por oficina (common/permissions.ts). Substitui @Roles nas rotas ajustáveis.
export const CAPABILITY_KEY = 'capability';
export const Capability = (key: string) => SetMetadata(CAPABILITY_KEY, key);
