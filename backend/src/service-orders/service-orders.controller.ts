import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ServiceOrdersService } from './service-orders.service';
import { ImportService } from './import.service';
import { CreateServiceOrderDto, CreateOrcamentoDto, UpdateOrcamentoDto, UpdateStatusDto, AprovarOrcamentoDto, FinalizeOrderDto, CreateOrUpdateItemDto, UpdateServiceOrderItemDto } from './dto/service-order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant, CurrentUser } from '../common/decorators/tenant.decorator';

@ApiTags('Service Orders')
@Controller('service-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServiceOrdersController {
  constructor(
    private serviceOrdersService: ServiceOrdersService,
    private importService: ImportService,
  ) {}

  @Post('import-pdf')
  @Roles('ADMIN', 'PRODUTIVO')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOperation({ summary: 'Importar dados de um PDF de orçamento' })
  async importPdf(@UploadedFile() file: Express.Multer.File) {
    return this.importService.parseEstimatePdf(file.buffer);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas ordens de serviço e orçamentos' })
  async findAll(
    @Tenant() tenant: { tenantId: string },
    @Query('status') status?: string,
    @Query('orderType') orderType?: string,
  ) {
    return this.serviceOrdersService.findAll(tenant.tenantId, status, orderType);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ordem por ID' })
  async findOne(
    @Tenant() tenant: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.findById(tenant.tenantId, id);
  }

  @Post('orcamento')
  @Roles('ADMIN', 'PRODUTIVO')
  @ApiOperation({ summary: 'Criar orçamento' })
  async createOrcamento(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateOrcamentoDto,
  ) {
    return this.serviceOrdersService.createOrcamento(tenant.tenantId, dto, user.userId);
  }

  @Post()
  @Roles('ADMIN', 'PRODUTIVO')
  @ApiOperation({ summary: 'Criar OS ou Orçamento' })
  async create(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateServiceOrderDto,
  ) {
    if (dto.orderType === 'ORDEM_SERVICO') {
      return this.serviceOrdersService.createServiceOrder(tenant.tenantId, dto, user.userId);
    }
    return this.serviceOrdersService.createOrcamento(tenant.tenantId, dto, user.userId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'PRODUTIVO')
  @ApiOperation({ summary: 'Atualizar ordem' })
  async update(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateOrcamentoDto,
  ) {
    return this.serviceOrdersService.updateOrcamento(tenant.tenantId, id, dto, user.userId);
  }

  @Patch(':id/status')
  @Roles('ADMIN', 'PRODUTIVO')
  @ApiOperation({ summary: 'Atualizar status' })
  async updateStatus(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    return this.serviceOrdersService.updateStatus(tenant.tenantId, id, dto, user.userId);
  }

  @Post('approve/:token')
  @ApiOperation({ summary: 'Aprovar/reprovar orçamento (público)' })
  async approve(
    @Param('token') token: string,
    @Body() dto: AprovarOrcamentoDto,
  ) {
    return this.serviceOrdersService.approveOrcamento(token, dto);
  }

  @Post(':id/request-approval')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Solicitar aprovação do cliente' })
  async requestApproval(
    @Tenant() tenant: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.requestApproval(tenant.tenantId, id);
  }

  @Post(':id/apply-stock')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Aplicar baixa de estoque e financeiro' })
  async applyStock(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.applyStockAndFinancial(tenant.tenantId, id, user.userId);
  }

  @Post(':id/receive-payment')
  @Roles('ADMIN', 'PRODUTIVO', 'FINANCEIRO')
  @ApiOperation({ summary: 'Receber pagamento' })
  async receivePayment(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: FinalizeOrderDto,
  ) {
    return this.serviceOrdersService.receivePayment(tenant.tenantId, id, dto, user.userId);
  }

  @Get('approval/:token')
  @ApiOperation({ summary: 'Página de aprovação (pública)' })
  async getApprovalPage(@Param('token') token: string) {
    return this.serviceOrdersService.getApprovalPage(token);
  }

  @Delete(':id')
  @Roles('MASTER')
  @ApiOperation({ summary: 'Excluir ordem (somente MASTER)' })
  async delete(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.serviceOrdersService.delete(tenant.tenantId, id, user.userId, reason);
  }

  @Post(':id/sync-prices')
  @Roles('ADMIN', 'PRODUTIVO')
  @ApiOperation({ summary: 'Sincronizar preços dos itens com o catálogo atual' })
  async syncPrices(
    @Tenant() tenant: { tenantId: string },
    @Param('id') id: string,
  ) {
    return this.serviceOrdersService.syncPrices(tenant.tenantId, id);
  }

  @Post(':id/items')
  @Roles('ADMIN', 'PRODUTIVO')
  @ApiOperation({ summary: 'Adicionar item à ordem' })
  async addItem(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: CreateOrUpdateItemDto,
  ) {
    return this.serviceOrdersService.addItem(tenant.tenantId, id, dto, user.userId);
  }

  @Delete(':id/items/:itemId')
  @Roles('ADMIN', 'PRODUTIVO')
  @ApiOperation({ summary: 'Remover item da ordem' })
  async removeItem(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.serviceOrdersService.removeItem(tenant.tenantId, id, itemId, user.userId);
  }

  @Patch(':id/items/:itemId')
  @Roles('ADMIN', 'PRODUTIVO')
  @ApiOperation({ summary: 'Atualizar item da ordem' })
  async updateItem(
    @Tenant() tenant: { tenantId: string },
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateServiceOrderItemDto,
  ) {
    return this.serviceOrdersService.updateItem(tenant.tenantId, id, itemId, dto, user.userId);
  }
}