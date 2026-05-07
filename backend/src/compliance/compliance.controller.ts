import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, Tenant } from '../common/decorators/tenant.decorator';
import { ComplianceService } from './compliance.service';
import { CreateLgpdRequestDto } from './dto/create-lgpd-request.dto';
import { UpdateLgpdRequestStatusDto } from './dto/update-lgpd-request-status.dto';

@ApiTags('Compliance')
@Controller('compliance/lgpd')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('MASTER', 'ADMIN')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Post('requests')
  @ApiOperation({ summary: 'Registrar solicitacao LGPD' })
  createRequest(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateLgpdRequestDto,
  ) {
    return this.complianceService.createLgpdRequest(tenant.tenantId, user.userId, dto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Listar solicitacoes LGPD do tenant' })
  listRequests(@Tenant() tenant: { tenantId: string }) {
    return this.complianceService.listLgpdRequests(tenant.tenantId);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Detalhar solicitacao LGPD' })
  getRequest(@Tenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.complianceService.getLgpdRequestById(tenant.tenantId, id);
  }

  @Patch('requests/:id/status')
  @ApiOperation({ summary: 'Atualizar status de solicitacao LGPD' })
  updateRequestStatus(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateLgpdRequestStatusDto,
  ) {
    return this.complianceService.updateLgpdRequestStatus(tenant.tenantId, user.userId, id, dto);
  }

  @Get('export/customer/:customerId')
  @ApiOperation({ summary: 'Exportar dados do cliente para atendimento LGPD' })
  exportCustomer(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('customerId') customerId: string,
  ) {
    return this.complianceService.exportCustomerData(tenant.tenantId, user.userId, customerId);
  }

  @Get('export/user/:userId')
  @ApiOperation({ summary: 'Exportar dados do usuario para atendimento LGPD' })
  exportUser(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('userId') userId: string,
  ) {
    return this.complianceService.exportUserData(tenant.tenantId, user.userId, userId);
  }
}
