import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { FRONT_OFFICE_ROLES } from '../common/roles';

@ApiTags('Customers')
@Controller('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  async findAll(@Tenant() tenant: { tenantId: string }) {
    return this.customersService.findAll(tenant.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Tenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.customersService.findById(tenant.tenantId, id);
  }

  @Post()
  @Roles(...FRONT_OFFICE_ROLES)
  @ApiOperation({ summary: 'Create customer' })
  async create(@Tenant() tenant: { tenantId: string }, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(tenant.tenantId, dto);
  }

  @Patch(':id')
  @Roles(...FRONT_OFFICE_ROLES)
  @ApiOperation({ summary: 'Update customer' })
  async update(
    @Tenant() tenant: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(tenant.tenantId, id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete customer' })
  async delete(@Tenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.customersService.delete(tenant.tenantId, id);
  }
}