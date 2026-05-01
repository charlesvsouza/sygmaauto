import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SuperAdminService } from './superadmin.service';
import { SuperAdminGuard } from './guards/superadmin.guard';
import { SuperAdminLoginDto, CreateSuperAdminDto, ProvisionTenantDto } from './dto/superadmin.dto';

@Controller('superadmin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

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
}
