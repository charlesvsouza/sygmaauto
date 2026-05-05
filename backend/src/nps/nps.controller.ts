import {
  Controller, Get, Post, Param, Body, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlanGuard, RequirePlan } from '../auth/guards/plan.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { NpsService } from './nps.service';

@ApiTags('NPS')
@Controller('nps')
export class NpsController {
  constructor(private readonly service: NpsService) {}

  /** Resposta pública — sem autenticação */
  @Get('form/:token')
  @ApiOperation({ summary: 'Busca dados para exibir o formulário NPS (público)' })
  getForm(@Param('token') token: string) {
    return this.service.getByToken(token);
  }

  @Post(':token/respond')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Registra resposta NPS (público)' })
  respond(
    @Param('token') token: string,
    @Body() body: { score: number; comment?: string },
  ) {
    return this.service.submitResponse(token, body.score, body.comment);
  }

  /** Rotas autenticadas */
  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
  @RequirePlan('PRO')
  @ApiOperation({ summary: 'Dashboard NPS do tenant' })
  getDashboard(@Tenant() tenant: { tenantId: string }) {
    return this.service.getDashboard(tenant.tenantId);
  }

  @Post('send/:serviceOrderId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
  @RequirePlan('PRO')
  @ApiOperation({ summary: 'Dispara pesquisa NPS manualmente para uma OS' })
  sendManual(
    @Tenant() tenant: { tenantId: string },
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.service.sendForOrder(tenant.tenantId, serviceOrderId);
  }
}
