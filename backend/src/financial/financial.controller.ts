import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FinancialService } from './financial.service';
import { CreateTransactionDto } from './dto/financial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';

@ApiTags('Financial')
@Controller('financial')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FinancialController {
  constructor(private financialService: FinancialService) {}

  @Get()
  @ApiOperation({ summary: 'List all transactions' })
  async findAll(
    @Tenant() tenant: { tenantId: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialService.findAll(
      tenant.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get('dre')
  @ApiOperation({ summary: 'DRE — Demonstrativo de Resultado do Exercício' })
  async getDRE(
    @Tenant() tenant: { tenantId: string },
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    return this.financialService.getDRE(
      tenant.tenantId,
      year ? parseInt(year) : now.getFullYear(),
      month ? parseInt(month) : now.getMonth() + 1,
    );
  }

  @Get('os-report')
  @ApiOperation({ summary: 'Relatório de Ordens de Serviço por período' })
  async getOSReport(
    @Tenant() tenant: { tenantId: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
  ) {
    return this.financialService.getOSReport(tenant.tenantId, { startDate, endDate, status });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get financial summary' })
  async getSummary(
    @Tenant() tenant: { tenantId: string },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financialService.getSummary(
      tenant.tenantId,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get transaction by ID' })
  async findOne(
    @Tenant() tenant: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.financialService.findById(tenant.tenantId, id);
  }

  @Post()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Create transaction' })
  async create(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: CreateTransactionDto,
  ) {
    return this.financialService.create(tenant.tenantId, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete transaction' })
  async delete(
    @Tenant() tenant: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.financialService.delete(tenant.tenantId, id);
  }
}