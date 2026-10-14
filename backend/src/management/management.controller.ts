import { Controller, Post, Get, Body, Headers, Param, ForbiddenException, ServiceUnavailableException, Logger } from '@nestjs/common';
import { ManagementService } from './management.service';
import { SeedService } from '../superadmin/seed.service';
import { SuperAdminGuard } from '../superadmin/guards/superadmin.guard';
import { UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Management')
@Controller('management')
@UseGuards(SuperAdminGuard)
export class ManagementController {
  private readonly logger = new Logger(ManagementController.name);

  constructor(
    private managementService: ManagementService,
    private seedService: SeedService,
  ) {}

  @Post('setup')
  @ApiOperation({ summary: 'Create a new tenant with an admin user' })
  async setup(@Body() dto: any) {
    return this.managementService.createTenantWithAdmin(dto);
  }

  @Get('tenants')
  @ApiOperation({ summary: 'List all tenants' })
  async listTenants() {
    return this.managementService.listAllTenants();
  }

  @Post('seed-demo')
  @ApiOperation({ summary: 'Popula dados demo (OS, executores, comissões). Requer header x-seed-key e SEED_SECRET configurado.' })
  async seedDemo(@Headers('x-seed-key') key: string) {
    this.assertSeedKey(key);
    const tenant = await this.managementService.getFirstActiveTenant();
    try {
      return await this.seedService.runDemo(tenant.id);
    } catch (err: any) {
      this.logger.error(`Falha no seed-demo: ${err?.message}`, err?.stack);
      return { error: true, message: err?.message };
    }
  }

  @Post('seed-demo/:tenantId')
  @ApiOperation({ summary: 'Popula dados demo em tenant específico. Requer header x-seed-key e SEED_SECRET configurado.' })
  async seedDemoForTenant(@Headers('x-seed-key') key: string, @Param('tenantId') tenantId: string) {
    this.assertSeedKey(key);
    try {
      return await this.seedService.runDemo(tenantId);
    } catch (err: any) {
      this.logger.error(`Falha no seed-demo (${tenantId}): ${err?.message}`, err?.stack);
      return { error: true, message: err?.message };
    }
  }

  private assertSeedKey(key: string) {
    const secret = process.env.SEED_SECRET;
    if (!secret) {
      throw new ServiceUnavailableException('SEED_SECRET não configurado no ambiente');
    }
    if (!key || key !== secret) throw new ForbiddenException('Chave inválida');
  }
}
