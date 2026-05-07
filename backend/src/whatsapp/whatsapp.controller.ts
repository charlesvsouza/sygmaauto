import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WhatsappAdminService } from '../notifications/whatsapp-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlanGuard, RequirePlan } from '../auth/guards/plan.guard';
import { Tenant } from '../common/decorators/tenant.decorator';

@ApiTags('WhatsApp')
@Controller('whatsapp')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@RequirePlan('PRO')
export class WhatsappController {
  constructor(private whatsappAdmin: WhatsappAdminService) {}

  @Get('status')
  @ApiOperation({ summary: 'Status da conexão WhatsApp' })
  async status(@Tenant() tenant: { tenantId: string }) {
    return this.whatsappAdmin.getStatus(tenant.tenantId);
  }
}
