import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreatePartDto, UpdatePartDto, CreateMovementDto, ConfirmNFImportDto } from './dto/inventory.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PlanGuard, RequirePlan } from '../auth/guards/plan.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Tenant } from '../common/decorators/tenant.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportNfService } from './import-nf.service';

@ApiTags('Inventory')
@Controller('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PlanGuard)
@RequirePlan('PRO')
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private importNfService: ImportNfService,
  ) {}

  @Get('parts')
  @ApiOperation({ summary: 'List all parts' })
  async findAllParts(@Tenant() tenant: { tenantId: string }) {
    return this.inventoryService.findAllParts(tenant.tenantId);
  }

  @Get('parts/:id')
  @ApiOperation({ summary: 'Get part by ID' })
  async findPartById(@Tenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.inventoryService.findPartById(tenant.tenantId, id);
  }

  @Post('parts')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Create part' })
  async createPart(@Tenant() tenant: { tenantId: string }, @Body() dto: CreatePartDto) {
    return this.inventoryService.createPart(tenant.tenantId, dto);
  }

  @Patch('parts/:id')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Update part' })
  async updatePart(
    @Tenant() tenant: { tenantId: string },
    @Param('id') id: string,
    @Body() dto: UpdatePartDto,
  ) {
    return this.inventoryService.updatePart(tenant.tenantId, id, dto);
  }

  @Delete('parts/:id')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Delete part (soft delete)' })
  async deletePart(@Tenant() tenant: { tenantId: string }, @Param('id') id: string) {
    return this.inventoryService.deletePart(tenant.tenantId, id);
  }

  @Post('movements')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Create inventory movement' })
  async createMovement(@Tenant() tenant: { tenantId: string }, @Body() dto: CreateMovementDto) {
    return this.inventoryService.createMovement(tenant.tenantId, dto);
  }

  @Get('stock-report')
  @ApiOperation({ summary: 'Get stock report' })
  async getStockReport(@Tenant() tenant: { tenantId: string }) {
    return this.inventoryService.getStockReport(tenant.tenantId);
  }

  @Get('purchase-projection')
  @ApiOperation({ summary: 'Projeção de pedido de compra baseado em estoque mínimo e giro (90 dias)' })
  async getPurchaseProjection(@Tenant() tenant: { tenantId: string }) {
    return this.inventoryService.getPurchaseProjection(tenant.tenantId);
  }

  @Post('import-nf/preview')
  @Roles('MASTER', 'ADMIN')
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
  @ApiOperation({ summary: 'Ler NF por XML/PDF e retornar preview dos itens' })
  async previewImportNF(@UploadedFile() file: Express.Multer.File) {
    return this.importNfService.previewImport(file);
  }

  @Post('import-nf/confirm')
  @Roles('MASTER', 'ADMIN')
  @ApiOperation({ summary: 'Confirmar entrada de estoque a partir do preview de NF' })
  async confirmImportNF(
    @Tenant() tenant: { tenantId: string },
    @Body() dto: ConfirmNFImportDto,
  ) {
    return this.importNfService.confirmImport(tenant.tenantId, dto);
  }
}