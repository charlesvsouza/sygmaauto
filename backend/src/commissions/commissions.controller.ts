import { Controller, Get, Patch, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PlanGuard, RequirePlan } from '../auth/guards/plan.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { CommissionsService } from './commissions.service';

@ApiTags('Commissions')
@Controller('commissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@RequirePlan('PRO')
export class CommissionsController {
  constructor(private readonly service: CommissionsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista comissões com filtros' })
  findAll(
    @Req() req: Request,
    @Tenant() tenant: { tenantId: string },
    @Query('status') status?: string,
    @Query('userId') userId?: string,
    @Query('workshopArea') workshopArea?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    // Liderança/financeiro vê tudo; demais perfis só as próprias comissões.
    const role = String((req as any).user?.role || '').toUpperCase();
    const canSeeAll = ['MASTER', 'ADMIN', 'GERENTE', 'CHEFE_OFICINA', 'FINANCEIRO'].includes(role);
    const effectiveUserId = canSeeAll ? userId : (req as any).user?.userId;
    return this.service.findAll(tenant.tenantId, { status, userId: effectiveUserId, workshopArea, startDate, endDate });
  }

  @Patch(':id/pay')
  @Roles('MASTER', 'ADMIN', 'FINANCEIRO')
  @ApiOperation({ summary: 'Marca comissão como paga' })
  markAsPaid(@Tenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.service.markAsPaid(tenant.tenantId, id);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Lista taxas de comissão configuradas' })
  getRates(@Tenant() tenant: { tenantId: string }) {
    return this.service.getRates(tenant.tenantId);
  }

  @Post('rates')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Cria ou atualiza taxa de comissão' })
  upsertRate(
    @Tenant() tenant: { tenantId: string },
    @Body() body: { userId?: string; role?: string; rate: number },
  ) {
    return this.service.upsertRate(tenant.tenantId, body.userId ?? null, body.role ?? null, body.rate);
  }
}
