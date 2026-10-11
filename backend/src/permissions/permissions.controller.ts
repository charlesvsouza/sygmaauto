import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant, CurrentUser } from '../common/decorators/tenant.decorator';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@Controller('permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PermissionsController {
  constructor(private permissions: PermissionsService) {}

  @Get('me')
  @ApiOperation({ summary: 'O que o meu perfil pode fazer nesta oficina' })
  me(@Tenant() tenant: { tenantId: string }, @CurrentUser() user: { role?: string }) {
    return this.permissions.mine(tenant.tenantId, user?.role ?? '');
  }

  @Get('matrix')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Matriz de permissões por perfil (padrão + ajuste da oficina)' })
  matrix(@Tenant() tenant: { tenantId: string }) {
    return this.permissions.matrix(tenant.tenantId);
  }

  @Put('matrix')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Salvar o ajuste de permissões da oficina' })
  save(@Tenant() tenant: { tenantId: string }, @Body() body: Record<string, unknown>) {
    return this.permissions.save(tenant.tenantId, body ?? {});
  }
}
