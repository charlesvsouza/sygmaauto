import { EntityWithTenant } from '../../common/decorators/tenant.decorator';

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  isImpersonation?: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user?: { id: string; email: string; name: string; role: string; tenantId: string };
  tenant?: { id: string; name: string; subscription: any };
}

export interface RequestUser extends EntityWithTenant {
  userId: string;
  email: string;
  role: string;
}