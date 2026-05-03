import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { SeedService } from './seed.service';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { SuperAdminLoginDto, CreateSuperAdminDto, ProvisionTenantDto } from './dto/superadmin.dto';

@Controller('superadmin')
export class SuperAdminController {
  constructor(
    private readonly superAdminService: SuperAdminService,
    private readonly seedService: SeedService,
  ) {}

  @Post('auth/login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: SuperAdminLoginDto) {
    return this.superAdminService.login(dto);
  }

  @Post('auth/create')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSuperAdminDto) {
    return this.superAdminService.createSuperAdmin(dto);
  }

  @Get('stats')
  @UseGuards(SuperAdminGuard)
  getStats() {
    return this.superAdminService.getSystemStats();
  }

  @Get('plans')
  @UseGuards(SuperAdminGuard)
  getPlans() {
    return this.superAdminService.getPlans();
  }

  @Get('tenants')
  @UseGuards(SuperAdminGuard)
  listTenants() {
    return this.superAdminService.listTenants();
  }

  @Post('tenants/provision')
  @UseGuards(SuperAdminGuard)
  provisionTenant(@Body() dto: ProvisionTenantDto) {
    return this.superAdminService.provisionTenant(dto);
  }

  @Get('tenants/:id')
  @UseGuards(SuperAdminGuard)
  getTenantDetails(@Param('id') id: string) {
    return this.superAdminService.getTenantDetails(id);
  }

  @Delete('tenants/:id')
  @UseGuards(SuperAdminGuard)
  deleteTenant(@Param('id') id: string) {
    return this.superAdminService.deleteTenant(id);
  }

  /** Gera token de impersonação para acessar o painel de um tenant como MASTER */
  @Post('tenants/:id/impersonate')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  impersonateTenant(@Param('id') id: string, @Request() req: any) {
    return this.superAdminService.impersonateTenant(id, req.superAdmin);
  }

  /** Suspende ou reativa um tenant */
  @Patch('tenants/:id/status')
  @UseGuards(SuperAdminGuard)
  updateTenantStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' },
  ) {
    return this.superAdminService.updateTenantStatus(id, body.status);
  }

  /** Altera o plano de assinatura de um tenant */
  @Patch('tenants/:id/plan')
  @UseGuards(SuperAdminGuard)
  updateTenantPlan(
    @Param('id') id: string,
    @Body() body: { planName: string },
  ) {
    return this.superAdminService.updateTenantPlan(id, body.planName);
  }

  /** Estende o período de assinatura de um tenant */
  @Post('tenants/:id/extend-subscription')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  extendSubscription(
    @Param('id') id: string,
    @Body() body: { days: number },
  ) {
    return this.superAdminService.extendSubscription(id, body.days);
  }

  /** Popula dados demo (OS, executores, comissões) para análise de KPI */
  @Post('tenants/:id/seed-demo')
  @UseGuards(SuperAdminGuard)
  @HttpCode(HttpStatus.OK)
  seedDemo(@Param('id') id: string) {
    return this.seedService.runDemo(id);
  }
}
