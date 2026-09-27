import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto/vehicle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { FRONT_OFFICE_ROLES } from '../common/roles';

@ApiTags('Vehicles')
@Controller('vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get()
  @ApiOperation({ summary: 'List all vehicles' })
  async findAll(@Tenant() tenant: { tenantId: string }) {
    return this.vehiclesService.findAll(tenant.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  async findOne(@Tenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.vehiclesService.findById(tenant.tenantId, id);
  }

  @Get('search/plate/:plate')
  @ApiOperation({ summary: 'Find vehicle by plate' })
  async findByPlate(@Tenant() tenant: { tenantId: string }, @Param('plate') plate: string) {
    return this.vehiclesService.findByPlate(tenant.tenantId, plate);
  }

  @Post()
  @Roles(...FRONT_OFFICE_ROLES)
  @ApiOperation({ summary: 'Create vehicle' })
  async create(@Tenant() tenant: { tenantId: string }, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(tenant.tenantId, dto);
  }

  @Patch(':id')
  @Roles(...FRONT_OFFICE_ROLES)
  @ApiOperation({ summary: 'Update vehicle' })
  async update(
    @Tenant() tenant: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(tenant.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete vehicle' })
  async delete(@Tenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.vehiclesService.delete(tenant.tenantId, id);
  }
}