import {
  Controller, Get, Post, Delete, Body, Param, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChecklistService } from './checklist.service';
import { UpsertChecklistDto } from './dto/checklist.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@ApiTags('Checklist')
@Controller('checklist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChecklistController {
  constructor(private checklistService: ChecklistService) {}

  @Get(':serviceOrderId')
  @ApiOperation({ summary: 'Buscar checklists de uma OS' })
  async get(
    @Tenant() tenant: { tenantId: string },
    @Param('serviceOrderId') serviceOrderId: string,
  ) {
    return this.checklistService.getForServiceOrder(tenant.tenantId, serviceOrderId);
  }

  @Post(':serviceOrderId/:type')
  @ApiOperation({ summary: 'Criar ou atualizar checklist (ENTRADA ou SAIDA)' })
  async upsert(
    @Tenant() tenant: { tenantId: string },
    @Param('serviceOrderId') serviceOrderId: string,
    @Param('type') type: string,
    @Body() dto: UpsertChecklistDto,
  ) {
    return this.checklistService.upsert(tenant.tenantId, serviceOrderId, type, dto);
  }

  @Delete(':serviceOrderId/:type')
  @ApiOperation({ summary: 'Excluir checklist' })
  async remove(
    @Tenant() tenant: { tenantId: string },
    @Param('serviceOrderId') serviceOrderId: string,
    @Param('type') type: string,
  ) {
    return this.checklistService.delete(tenant.tenantId, serviceOrderId, type);
  }
}
