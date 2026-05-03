import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Tenant } from '../common/decorators/tenant.decorator';
import { MaintenanceSchedulerService } from './maintenance-scheduler.service';

@ApiTags('Maintenance')
@Controller('maintenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaintenanceController {
  constructor(private readonly scheduler: MaintenanceSchedulerService) {}

  @Get('due')
  @ApiOperation({ summary: 'Lista veículos com manutenção vencida no tenant' })
  async getDue(@Tenant() tenant: { tenantId: string }) {
    return this.scheduler.getDueVehicles(tenant.tenantId);
  }
}
